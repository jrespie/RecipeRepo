export const dbStatus = {
  provider: "postgresql",
  status: "prisma-configured"
};

export { recipeSchemaOverview } from "./schema-overview.js";
export { recipeIncludes } from "./recipe-includes.js";
export { prisma } from "./client.js";
export {
  createRecipe,
  deleteRecipe,
  getRecipeById,
  listRecipes,
  updateRecipe
} from "./recipes.js";
