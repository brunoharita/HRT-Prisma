import assert from "node:assert/strict";
import test from "node:test";
import { createLoadingActivityStore } from "../web/src/ui/loadingActivity.js";

test("independent operations remain visible until the last matching owner settles", () => {
  const store = createLoadingActivityStore();
  store.update("page", ["Carregando Pessoas…"]);
  store.update("block", ["Atualizando score…"]);
  store.update("page", []);
  assert.deepEqual(store.getSnapshot(), ["Atualizando score…"]);
  store.update("block", []);
  assert.deepEqual(store.getSnapshot(), []);
});

test("same-label owners do not release one another and repeated updates stay stable", () => {
  const store = createLoadingActivityStore(); let notifications = 0;
  const unsubscribe = store.subscribe(() => notifications++);
  store.update("a", ["Carregando…"]); const snapshot = store.getSnapshot();
  store.update("b", ["Carregando…"]); store.update("a", ["Carregando…"]);
  assert.equal(store.getSnapshot(), snapshot); assert.equal(notifications, 1);
  store.update("a", []); assert.deepEqual(store.getSnapshot(), ["Carregando…"]);
  store.update("b", []); assert.deepEqual(store.getSnapshot(), []);
  unsubscribe(); store.update("c", ["Carregando…"]); assert.equal(notifications, 2);
});

test("failure, cancellation and unmount can release only their owner without altering remaining labels", () => {
  const store = createLoadingActivityStore();
  store.update("page", ["Carregando…", "Calculando…"]);
  store.update("modal", ["Consultando fonte…"]);
  store.update("modal", []); store.update("modal", []);
  assert.deepEqual(store.getSnapshot(), ["Carregando…", "Calculando…"]);
  store.update("page", ["Calculando…"]); assert.deepEqual(store.getSnapshot(), ["Calculando…"]);
  store.update("page", []); assert.deepEqual(store.getSnapshot(), []);
});
