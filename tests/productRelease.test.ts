import assert from "node:assert/strict";
import test from "node:test";
import { calculateProductRelease } from "../web/src/config/releaseRegistry.js";

test("accepted deliveries determine the displayed version and a new movement resets the count", () => {
  const current = { productGeneration: 1, movement: 5, deliveries: ["First", "Second"] };
  assert.equal(calculateProductRelease([current]).displayVersion, "v1.5.2");
  assert.equal(calculateProductRelease([{ ...current, deliveries: [...current.deliveries, "Next accepted delivery"] }]).displayVersion, "v1.5.3");
  assert.equal(calculateProductRelease([current, { productGeneration: 1, movement: 6, deliveries: ["First accepted delivery"] }]).displayVersion, "v1.6.1");
  assert.equal(current.deliveries.length, 2);
});

test("an incomplete or duplicated release registry does not invent a product version", () => {
  assert.throws(() => calculateProductRelease([]), /Invalid official/);
  for (const deliveries of [[], [""], ["same", "same"]]) {
    assert.throws(() => calculateProductRelease([{ productGeneration: 1, movement: 5, deliveries }]), /Invalid official/);
  }
});
