export async function createLocalOcrWorker() {
  const [{ createWorker }, { default: workerPath }, { default: corePath }] = await Promise.all([
    import("tesseract.js"),
    import("tesseract.js/dist/worker.min.js?url"),
    import("tesseract.js-core/tesseract-core.wasm.js?url"),
  ]);
  return createWorker(["por", "eng"], 1, { workerPath, corePath });
}
