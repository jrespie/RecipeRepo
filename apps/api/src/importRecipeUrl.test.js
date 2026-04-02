import test from "node:test";
import assert from "node:assert/strict";
import { extractRecipeFromHtml } from "./importRecipeUrl.js";

test("extracts recipe data from JSON-LD", () => {
  const html = `
    <html>
      <head>
        <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "Recipe",
            "name": "Tomato Soup",
            "recipeIngredient": ["1 onion", "400 g tomatoes"],
            "recipeInstructions": [
              {"@type":"HowToStep","text":"Cook onion."},
              {"@type":"HowToStep","text":"Add tomatoes."}
            ]
          }
        </script>
      </head>
    </html>
  `;

  const result = extractRecipeFromHtml(html, "https://example.com/tomato-soup");

  assert.equal(result.title, "Tomato Soup");
  assert.equal(result.sourceType, "url-import");
  assert.equal(result.sourceName, "example.com");
  assert.equal(result.sourceUrl, "https://example.com/tomato-soup");
  assert.deepEqual(result.ingredients, [
    { quantity: "", name: "1 onion" },
    { quantity: "", name: "400 g tomatoes" }
  ]);
  assert.equal(result.method, "Cook onion.\nAdd tomatoes.");
});

test("falls back to parsing stripped page text", () => {
  const html = `
    <html>
      <body>
        <h1>Quick Noodles</h1>
        <p>Ingredients</p>
        <p>Noodles - 200 g</p>
        <p>Soy sauce - 2 Tbsp</p>
        <p>Method</p>
        <p>Cook noodles.</p>
      </body>
    </html>
  `;

  const result = extractRecipeFromHtml(html, "https://example.com/noodles");

  assert.equal(result.title, "Quick Noodles");
  assert.deepEqual(result.ingredients, [
    { quantity: "200 g", name: "Noodles" },
    { quantity: "2 Tbsp", name: "Soy sauce" }
  ]);
  assert.equal(result.method, "Cook noodles.");
  assert.ok(result.originalText.includes("Ingredients"));
});
