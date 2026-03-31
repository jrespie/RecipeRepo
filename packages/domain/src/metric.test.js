import test from "node:test";
import assert from "node:assert/strict";
import { convertToMetric } from "./metric.js";

test("converts pounds to grams", () => {
  const result = convertToMetric({ quantity: 1, unit: "lb" });

  assert.equal(result.unit, "g");
  assert.equal(result.quantity, 453.59);
  assert.equal(result.status, "ok");
});

test("flags unknown units for review", () => {
  const result = convertToMetric({ quantity: 2, unit: "pinch" });

  assert.equal(result.unit, "pinch");
  assert.equal(result.quantity, 2);
  assert.equal(result.status, "review");
});
