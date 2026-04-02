import test from "node:test";
import assert from "node:assert/strict";
import { parseRecipeText } from "./parse-recipe-text.js";

test("parses text with explicit ingredient and method headings", () => {
  const result = parseRecipeText(`Tomato Pasta

Ingredients
400 g pasta
1 onion

Method
Boil the pasta.
Saute the onion.`);

  assert.equal(result.title, "Tomato Pasta");
  assert.deepEqual(result.ingredients, [
    { quantity: "400", name: "g pasta" },
    { quantity: "1", name: "onion" }
  ]);
  assert.equal(result.method, "Boil the pasta.\nSaute the onion.");
});

test("falls back to ingredient lines when no headings exist", () => {
  const result = parseRecipeText(`Fruit Plate
2 apples
1 banana`);

  assert.equal(result.title, "Fruit Plate");
  assert.deepEqual(result.ingredients, [
    { quantity: "2", name: "apples" },
    { quantity: "1", name: "banana" }
  ]);
  assert.equal(result.method, "");
});
