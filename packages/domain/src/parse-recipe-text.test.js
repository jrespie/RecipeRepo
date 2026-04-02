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
    { quantity: "400 g", name: "pasta" },
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

test("parses ingredient-first text with trailing quantities", () => {
  const result = parseRecipeText(`Ingredients
(150g) brown onion, finely chopped - 1
Cloves garlic, crushed - 2
Piece fresh ginger 3 cm (15g) , peeled, finely grated - 1
Canned corn kernels, rinsed, drained - 420 g
Vegetable oil - 1 Tbsp
Chicken stock - 4 cups (1L)

Method
Heat the oil.
Add the stock.`);

  assert.equal(result.title, "");
  assert.deepEqual(result.ingredients, [
    { quantity: "1", name: "(150g) brown onion, finely chopped" },
    { quantity: "2", name: "Cloves garlic, crushed" },
    { quantity: "1", name: "Piece fresh ginger 3 cm (15g) , peeled, finely grated" },
    { quantity: "420 g", name: "Canned corn kernels, rinsed, drained" },
    { quantity: "1 Tbsp", name: "Vegetable oil" },
    { quantity: "4 cups (1L)", name: "Chicken stock" }
  ]);
  assert.equal(result.method, "Heat the oil.\nAdd the stock.");
});
