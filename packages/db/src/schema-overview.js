export const recipeSchemaOverview = {
  entities: [
    "Recipe",
    "Ingredient",
    "RecipeIngredient",
    "RecipeStep",
    "RecipeTag",
    "RecipeTagJoin",
    "RecipeSource"
  ],
  principles: [
    "Preserve raw ingredient text from recipe entry or imports.",
    "Store canonical ingredient fields separately from display text.",
    "Flag ambiguous unit conversions for review instead of guessing."
  ]
};
