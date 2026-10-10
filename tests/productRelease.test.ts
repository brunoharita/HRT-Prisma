import assert from "node:assert/strict";
import test from "node:test";
import { calculateProductRelease, PRISMA_RELEASE, PRISMA_RELEASE_HISTORY } from "../web/src/config/releaseRegistry.js";

test("accepted deliveries determine the displayed version and a new movement resets the count", () => {
  const current = { productGeneration: 1, movement: 5, deliveries: ["First", "Second"] };
  assert.equal(calculateProductRelease([current]).displayVersion, "v1.5.2");
  assert.equal(calculateProductRelease([{ ...current, deliveries: [...current.deliveries, "Next accepted delivery"] }]).displayVersion, "v1.5.3");
  assert.equal(calculateProductRelease([current, { productGeneration: 1, movement: 6, deliveries: ["First accepted delivery"] }]).displayVersion, "v1.6.1");
  assert.equal(current.deliveries.length, 2);
});

test("registro oficial expõe v2.3.2 autorizada e preserva histórico", () => {
  assert.equal(PRISMA_RELEASE.displayVersion, "v2.3.2");
  assert.equal(PRISMA_RELEASE.movement, 3);
  assert.equal(PRISMA_RELEASE.delivery, 2);
  const launch = PRISMA_RELEASE_HISTORY.at(-2)!;
  assert.equal(calculateProductRelease([{...launch,deliveries:launch.deliveries.slice(0,1)}]).version, "2.2.0");
  const current = PRISMA_RELEASE_HISTORY.at(-3)!;
  assert.equal(calculateProductRelease([{...current,skippedDeliveryNumbers:[],deliveries:current.deliveries.slice(0,1)}]).version, "2.1.0");
  assert.equal(calculateProductRelease([{...current,skippedDeliveryNumbers:[],deliveries:current.deliveries.slice(0,2)}]).version, "2.1.1");
  assert.equal(calculateProductRelease([{...current,skippedDeliveryNumbers:[],deliveries:current.deliveries.slice(0,3)}]).version, "2.1.2");
  assert.equal(calculateProductRelease([{...current,deliveries:[...current.deliveries,"Next"]}]).version, "2.1.8");
  assert.equal(calculateProductRelease(PRISMA_RELEASE_HISTORY.slice(0, -1)).version, "2.2.1");
  assert.equal(calculateProductRelease(PRISMA_RELEASE_HISTORY.slice(0, -2)).version, "2.1.7");
  assert.equal(calculateProductRelease(PRISMA_RELEASE_HISTORY.slice(0, -3)).version, "2.0.12");
  assert.equal(calculateProductRelease([{productGeneration:2,movement:1,firstDeliveryNumber:0,deliveries:["Launch","Next"]}]).version,"2.1.1");
  assert.throws(() => calculateProductRelease([{productGeneration:2,movement:1,firstDeliveryNumber:2 as 1,deliveries:["Invalid"]}]), /Invalid official/);
});

test("numeração explícita preserva histórico e rejeita contador insuficiente ou inválido", () => {
  const current = { productGeneration: 2, movement: 0, deliveries: ["A", "B"], skippedDeliveryNumbers: [2] };
  assert.equal(calculateProductRelease([current]).version, "2.0.3");
  assert.equal(current.deliveries.length, 2);
  assert.equal(calculateProductRelease([{ ...current, deliveries: [...current.deliveries, "Next"] }]).version, "2.0.4");
  for (const skippedDeliveryNumbers of [[0], [-1], [2.5], [NaN], [Infinity], [99], [2, 2]]) {
    assert.throws(() => calculateProductRelease([{ ...current, skippedDeliveryNumbers }]), /Invalid official/);
  }
  assert.equal(calculateProductRelease([current, { productGeneration: 2, movement: 1, deliveries: ["New"] }]).version, "2.1.1");
});

test("nova geração aceita movimento zero sem alterar contadores anteriores e rejeita movimento inválido", () => {
  const previous = { productGeneration: 1, movement: 8, deliveries: ["A", "B", "C", "D"] };
  assert.equal(calculateProductRelease([previous]).version, "1.8.4");
  assert.equal(calculateProductRelease([previous, { productGeneration: 2, movement: 0, deliveries: ["Online"] }]).version, "2.0.1");
  for (const movement of [-1, 0.5, NaN]) {
    assert.throws(() => calculateProductRelease([{ productGeneration: 2, movement, deliveries: ["Online"] }]), /Invalid official/);
  }
  assert.equal(previous.deliveries.length, 4);
});

test("an incomplete or duplicated release registry does not invent a product version", () => {
  assert.throws(() => calculateProductRelease([]), /Invalid official/);
  for (const deliveries of [[], [""], ["same", "same"]]) {
    assert.throws(() => calculateProductRelease([{ productGeneration: 1, movement: 5, deliveries }]), /Invalid official/);
  }
});
