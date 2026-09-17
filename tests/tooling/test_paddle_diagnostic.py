"""No Docker, Paddle, network, real document or external AI required."""

import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import time
from types import SimpleNamespace
import unittest

SCRIPT = Path(__file__).resolve().parents[2] / "scripts" / "paddle-isolated-benchmark.py"
SPEC = importlib.util.spec_from_file_location("paddle_diagnostic", SCRIPT)
diagnostic = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = diagnostic
SPEC.loader.exec_module(diagnostic)


def blocked_initialization(args, pipe):
    time.sleep(10)


def blocked_inference(args, pipe):
    pipe.send({"event": "inference_start"})
    time.sleep(10)


def successful_worker(args, pipe):
    pipe.send({"event": "inference_start"})
    pipe.send({"event": "success", "inferenceSeconds": 0.01})
    pipe.close()


class DiagnosticTests(unittest.TestCase):
    def run_case(self, worker):
        with tempfile.TemporaryDirectory() as directory:
            args = SimpleNamespace(case="synthetic", init_timeout=1, infer_timeout=1,
                threads=1, run_mode="default", page=1, no_tables=False,
                lean_init=False, output_dir=directory)
            started = time.monotonic()
            code = diagnostic.supervise(args, worker)
            report = json.loads(Path(directory, "synthetic.json").read_text())
            self.assertLess(time.monotonic() - started, 8)
            self.assertFalse(report["processAliveAfter"])
            return code, report

    def test_initialization_timeout_kills_worker(self):
        code, report = self.run_case(blocked_initialization)
        self.assertEqual(code, 1)
        self.assertEqual(report["status"], "killed_at_initialization_deadline")

    def test_inference_timeout_kills_worker(self):
        code, report = self.run_case(blocked_inference)
        self.assertEqual(code, 1)
        self.assertEqual(report["status"], "killed_at_inference_deadline")

    def test_success_is_not_reported_as_timeout(self):
        code, report = self.run_case(successful_worker)
        self.assertEqual(code, 0)
        self.assertEqual(report["status"], "success")

    def test_timing_wrapper_preserves_results_and_attributes(self):
        class Component:
            batch_size = 8

            def __call__(self, value):
                yield value
                yield value + 1

        events, totals = [], {}
        wrapped = diagnostic.TimedComponent(Component(), "synthetic", events.append, totals)
        self.assertEqual(list(wrapped(4)), [4, 5])
        self.assertEqual(wrapped.batch_size, 8)
        self.assertEqual([event["event"] for event in events], ["stage_start", "stage_end"])
        self.assertGreaterEqual(totals["synthetic"], 0)

    def test_summary_does_not_contain_source_or_extracted_text(self):
        text = "Synthetic Private Canary 2030"
        summary = diagnostic.summarize_content(text, [text], [[[0, 0], [1, 1]]])
        self.assertEqual(summary["nativeTokenRecall"], 1)
        self.assertEqual(summary["nativeNumericTokenRecall"], 1)
        self.assertNotIn("Canary", json.dumps(summary))
        self.assertNotIn("2030", json.dumps(summary))
        self.assertNotIn("polygons", summary)

    def test_empty_content_and_array_like_geometry_are_serializable(self):
        class ArrayLike:
            def tolist(self):
                return [[0, 0], [1, 1]]

        summary = diagnostic.summarize_content("", [], [ArrayLike()])
        self.assertEqual(summary["lines"], 0)
        self.assertEqual(summary["nativeTokenRecall"], 0)
        json.dumps(summary)


if __name__ == "__main__":
    unittest.main()
