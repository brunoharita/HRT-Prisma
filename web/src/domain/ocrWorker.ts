export async function createLocalOcrWorker() {
  const [{ createWorker }, { default: workerPath }, { default: corePath }] = await Promise.all([
    import("tesseract.js"),
    import("tesseract.js/dist/worker.min.js?url"),
    import("tesseract.js-core/tesseract-core.wasm.js?url"),
  ]);
  const langPath = new URL("tessdata/", document.baseURI).toString();
  return createWorker(["por", "eng"], 1, { workerPath, corePath, langPath, gzip: true });
}
