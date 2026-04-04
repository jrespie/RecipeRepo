import test from "node:test";
import assert from "node:assert/strict";
import { recipeFromOcrText } from "./importRecipePhoto.js";

test("shapes OCR text into recipe import data", () => {
  const result = recipeFromOcrText(`Tomato Soup

Ingredients
1 onion
400 g tomatoes

Method
Cook onion.
Add tomatoes.`);

  assert.equal(result.title, "Tomato Soup");
  assert.equal(result.sourceType, "photo-import");
  assert.equal(result.sourceName, "Photo import");
  assert.equal(result.sourceUrl, null);
  assert.deepEqual(result.ingredients, [
    { quantity: "1", name: "onion" },
    { quantity: "400 g", name: "tomatoes" }
  ]);
  assert.equal(result.method, "Cook onion.\nAdd tomatoes.");
  assert.ok(result.originalText.includes("Ingredients"));
});
