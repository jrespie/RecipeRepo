import { convertToMetric } from "./metric.js";

export const recipeTags = [
  "quick dinners",
  "budget friendly",
  "seasonal vegetables",
  "batch cooking",
  "weeknight staples"
];

export const sampleRecipes = [
  {
    id: "lemongrass-chicken",
    name: "Lemongrass Chicken Bowls",
    servings: 4,
    protein: "chicken",
    vegetables: ["carrot", "cucumber", "cabbage"],
    summary: "Bright, fast dinner with rice, herbs, and crunchy vegetables."
  },
  {
    id: "roasted-pumpkin-pasta",
    name: "Roasted Pumpkin Pasta",
    servings: 4,
    protein: "vegetarian",
    vegetables: ["pumpkin", "spinach", "onion"],
    summary: "Creamy pumpkin pasta designed for cool-weather NZ evenings."
  },
  {
    id: "beef-broccoli-ginger",
    name: "Beef, Broccoli and Ginger Stir-fry",
    servings: 4,
    protein: "beef",
    vegetables: ["broccoli", "capsicum", "spring onion"],
    summary: "High-heat stir-fry built for low-prep weeknights."
  }
];

export function listRecipeSummaries() {
  return sampleRecipes;
}

export function normaliseIngredientInput({ quantity, unit, ingredient }) {
  return {
    ingredient,
    ...convertToMetric({ quantity, unit })
  };
}

export { convertToMetric };
