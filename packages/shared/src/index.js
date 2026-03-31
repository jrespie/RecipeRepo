export const appConfig = {
  name: "RecipeRepo",
  apiPort: Number(process.env.API_PORT || 4000),
  apiTarget: process.env.VITE_API_TARGET || "http://localhost:4000"
};
