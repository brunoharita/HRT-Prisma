"""Local-only diagnostic for the existing Paddle image; never an application worker.

Run in a network-disabled disposable container, with source/model mounts read-only.
The parent kills the inference process at the deadline, unlike an HTTP cancellation.
JSON events contain timings/counts/hashes only; extracted text is never persisted.
"""

import argparse
import hashlib
import json
import multiprocessing as mp
import os
from pathlib import Path
import re
import time
import traceback
import unicodedata


def normalized(text):
    return " ".join(unicodedata.normalize("NFKC", text).lower().split())


def summarize_content(native, texts, polygons):
    """Compare locally without returning any source or extracted strings."""
    text = normalized(" ".join(texts))
    native_tokens, ocr_tokens = set(normalized(native).split()), set(text.split())
    numeric_tokens = {token for token in native_tokens if re.search(r"\d", token)}
    return {
        "lines": len(texts), "characters": len(text),
        "textHash": hashlib.sha256(text.encode()).hexdigest(),
        "nativeTokenRecall": round(len(native_tokens & ocr_tokens) / max(len(native_tokens), 1), 4),
        "nativeTokenPrecision": round(len(native_tokens & ocr_tokens) / max(len(ocr_tokens), 1), 4),
        "nativeNumericTokenRecall": round(len(numeric_tokens & ocr_tokens) / max(len(numeric_tokens), 1), 4),
        "geometryHash": hashlib.sha256(json.dumps(polygons, default=lambda value: value.tolist()).encode()).hexdigest(),
    }


class TimedComponent:
    def __init__(self, target, name, send, totals):
        self.target, self.name, self.send, self.totals = target, name, send, totals

    def __getattr__(self, name):
        return getattr(self.target, name)

    def __call__(self, *args, **kwargs):
        self.send({"event": "stage_start", "stage": self.name})
        elapsed = 0.0
        started = time.perf_counter()
        iterator = iter(self.target(*args, **kwargs))
        elapsed += time.perf_counter() - started
        while True:
            started = time.perf_counter()
            try:
                item = next(iterator)
            except StopIteration:
                elapsed += time.perf_counter() - started
                break
            elapsed += time.perf_counter() - started
            if self.name in ("layout", "regions") and isinstance(item, dict):
                boxes = item.get("boxes", [])
                counts = {}
                for box in boxes:
                    label = str(box.get("label", "unknown"))
                    counts[label] = counts.get(label, 0) + 1
                self.send({"event": "layout_counts", "stage": self.name, "labels": counts})
            yield item
        self.totals[self.name] = self.totals.get(self.name, 0) + elapsed
        self.send({"event": "stage_end", "stage": self.name, "seconds": round(elapsed, 4)})

    def predict(self, *args, **kwargs):
        return self(*args, **kwargs)


def instrument(pipeline, send, totals):
    inner = vars(pipeline).get("_pipeline", pipeline)
    children = {
        "region_detection_model": "regions",
        "layout_det_model": "layout",
        "general_ocr_pipeline": "ocr_total_inclusive",
        "text_det_model": "text_detection",
        "text_rec_model": "text_recognition",
        "table_recognition_pipeline": "tables",
    }
    for attribute, label in children.items():
        target = vars(inner).get(attribute)
        if target is None:
            continue
        if "pipeline" in attribute:
            instrument(target, send, totals)
        setattr(inner, attribute, TimedComponent(target, label, send, totals))


def pin_local_models(value):
    if isinstance(value, dict):
        if "model_name" in value:
            model_dir = Path("/var/cache/paddlex/official_models") / value["model_name"]
            candidate_dir = Path("/candidate-models/official_models") / value["model_name"]
            if candidate_dir.is_dir():
                model_dir = candidate_dir
            if model_dir.is_dir():
                value["model_dir"] = str(model_dir)
        for nested in value.values():
            pin_local_models(nested)
    elif isinstance(value, list):
        for nested in value:
            pin_local_models(nested)


def child(args, pipe):
    def send(event):
        pipe.send(event)

    try:
        started = time.perf_counter()
        import pypdfium2 as pdfium
        from paddlex.inference.pipelines import create_pipeline, load_pipeline_config
        from paddlex.inference.models import PaddlePredictorOption
        from paddlex.inference.utils.pdf_rendering import render_pdf_page_to_numpy

        config = load_pipeline_config("PP-StructureV3")
        if args.model_variant != "original":
            ocr_config = config["SubPipelines"]["GeneralOCR"]["SubModules"]
            ocr_config["TextRecognition"]["model_name"] = "latin_PP-OCRv5_mobile_rec"
            if args.model_variant == "mobile":
                ocr_config["TextDetection"]["model_name"] = "PP-OCRv5_mobile_det"
                config["SubModules"]["LayoutDetection"]["model_name"] = "PP-DocLayout-S"
        if args.lean_init:
            # Same disabled request operations; avoid loading unused models only.
            config.update(use_doc_preprocessor=False, use_doc_orientation_classify=False,
                          use_doc_unwarping=False, use_formula_recognition=False)
            config["SubPipelines"]["GeneralOCR"]["use_textline_orientation"] = False
        pin_local_models(config)
        option = PaddlePredictorOption(cpu_threads=args.threads)
        if args.run_mode != "default":
            option.run_mode = args.run_mode
        pipeline = create_pipeline(config=config, device="cpu", pp_option=option)
        send({"event": "initialized", "seconds": round(time.perf_counter() - started, 4)})
        try:
            from threadpoolctl import threadpool_info
            pools = [{k: pool.get(k) for k in ("internal_api", "num_threads", "prefix")} for pool in threadpool_info()]
        except ImportError:
            pools = []
        send({"event": "resources", "threadPools": pools,
              "threadEnvironment": {key: os.environ.get(key) for key in (
                  "OMP_NUM_THREADS", "OPENBLAS_NUM_THREADS", "MKL_NUM_THREADS",
                  "PADDLE_PDX_CPU_NUM_THREADS", "NUMEXPR_NUM_THREADS", "KMP_BLOCKTIME", "OMP_WAIT_POLICY")}})
        totals = {}
        instrument(pipeline, send, totals)
        document = pdfium.PdfDocument(args.input)
        source_hash = hashlib.sha256(Path(args.input).read_bytes()).hexdigest()
        page_indices = range(len(document)) if args.page == 0 else [args.page - 1]
        send({"event": "inference_start"})
        inference_started = time.perf_counter()
        pages = []
        for page_index in page_indices:
            page = document[page_index]
            rendered_at = time.perf_counter()
            image = render_pdf_page_to_numpy(page, page_index=page_index)
            render_seconds = time.perf_counter() - rendered_at
            page_started = time.perf_counter()
            results = list(pipeline.predict(
                image, use_doc_orientation_classify=False, use_doc_unwarping=False,
                use_textline_orientation=False, use_table_recognition=not args.no_tables,
                use_formula_recognition=False, use_chart_recognition=False,
            ))
            page_seconds = time.perf_counter() - page_started
            native = normalized(page.get_textpage().get_text_range())
            for result in results:
                ocr = result["overall_ocr_res"]
                texts = list(ocr["rec_texts"])
                pages.append({
                    "page": page_index + 1, "renderSeconds": round(render_seconds, 4),
                    "inferenceSeconds": round(page_seconds, 4),
                    **summarize_content(native, texts, ocr["rec_polys"]),
                    "width": int(image.shape[1]), "height": int(image.shape[0]),
                })
            send({"event": "page_complete", **pages[-1]})
        elapsed = time.perf_counter() - inference_started
        send({"event": "success", "sourceHash": source_hash, "inferenceSeconds": round(elapsed, 4),
              "stages": {k: round(v, 4) for k, v in totals.items()}, "pages": pages})
    except Exception as error:
        # Never print exception messages: vendors may interpolate document content.
        frames = traceback.extract_tb(error.__traceback__)
        send({"event": "error", "errorType": type(error).__name__,
              "frames": [{"file": Path(f.filename).name, "line": f.lineno} for f in frames[-5:]]})
    finally:
        pipe.close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--case", required=True)
    parser.add_argument("--threads", type=int, choices=[1, 2, 4, 8, 10], required=True)
    parser.add_argument("--run-mode", choices=["default", "paddle", "mkldnn"], default="default")
    parser.add_argument("--page", type=int, default=1, choices=range(0, 6))
    parser.add_argument("--no-tables", action="store_true")
    parser.add_argument("--lean-init", action="store_true")
    parser.add_argument("--model-variant", choices=["original", "latin-rec", "mobile"], default="original")
    parser.add_argument("--init-timeout", type=int, default=180)
    parser.add_argument("--infer-timeout", type=int, default=60)
    parser.add_argument("--output-dir", default="/work")
    args = parser.parse_args()
    if not re.fullmatch(r"[a-z0-9-]{1,64}", args.case):
        parser.error("Invalid case identifier")
    if not 1 <= args.init_timeout <= 180 or not 1 <= args.infer_timeout <= 240:
        parser.error("Timeout outside bounded diagnostic range")
    return supervise(args)


def supervise(args, worker=child):
    """Separate supervisor remains responsive while native model code is busy."""
    parent, remote = mp.Pipe(duplex=False)
    process = mp.Process(target=worker, args=(args, remote))
    process.start()
    remote.close()
    deadline = time.monotonic() + args.init_timeout
    phase = "initialization"
    events, status = [], "incomplete"
    while process.is_alive() or parent.poll():
        if time.monotonic() > deadline:
            process.kill()
            process.join(timeout=5)
            status = "killed_at_" + phase + "_deadline"
            break
        if parent.poll(0.1):
            try:
                event = parent.recv()
            except EOFError:
                break
            events.append(event)
            print(json.dumps({"case": args.case, **event}), flush=True)
            if event["event"] == "inference_start":
                phase = "inference"
                deadline = time.monotonic() + args.infer_timeout
            elif event["event"] in ("success", "error"):
                status = event["event"]
                break
    process.join(timeout=3)
    if process.is_alive():
        process.kill()
        process.join(timeout=5)
    report = {"contractVersion": "paddle-isolated-benchmark-1.0.0", "method": "sequential-pages",
              "case": args.case, "threads": args.threads, "runMode": args.run_mode,
              "page": args.page, "tables": not args.no_tables, "leanInit": args.lean_init,
              "modelVariant": getattr(args, "model_variant", "original"), "status": status,
              "processAliveAfter": process.is_alive(), "events": events}
    Path(args.output_dir, args.case + ".json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps({"case": args.case, "status": status, "processAliveAfter": process.is_alive()}), flush=True)
    return 0 if status == "success" else 1


if __name__ == "__main__":
    mp.set_start_method("spawn")
    raise SystemExit(main())
