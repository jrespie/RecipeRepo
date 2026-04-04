import Fastify from "fastify";
import { appConfig } from "@recipe-repo/shared";
import { importRecipeFromPhoto } from "./importRecipePhoto.js";
import { importRecipeFromUrl } from "./importRecipeUrl.js";
import {
  createRecipe,
  dbStatus,
  deleteRecipe,
  getRecipeById,
  listRecipes,
  updateRecipe
} from "@recipe-repo/db";

const server = Fastify({
  logger: true,
  bodyLimit: 10 * 1024 * 1024
});

const apiPort = Number(process.env.API_PORT || 4000);

server.setErrorHandler((error, _request, reply) => {
  const statusCode = error.statusCode && error.statusCode >= 400
    ? error.statusCode
    : 400;

  reply.code(statusCode).send({
    message: error.message
  });
});

server.get("/health", async () => {
  return {
    status: "ok",
    app: appConfig.name,
    database: dbStatus
  };
});

server.get("/api/recipes", async () => {
  return {
    items: await listRecipes()
  };
});

server.get("/api/recipes/:id", async (request, reply) => {
  const recipe = await getRecipeById(request.params.id);

  if (!recipe) {
    reply.code(404);
    return {
      message: "Recipe not found"
    };
  }

  return recipe;
});

server.post("/api/recipes", async (request, reply) => {
  const recipe = await createRecipe(request.body);

  reply.code(201);
  return recipe;
});

server.post("/api/recipes/import-url", async (request) => {
  return importRecipeFromUrl(request.body.url);
});

server.post("/api/recipes/import-photo", async (request) => {
  return importRecipeFromPhoto(request.body.imageBase64);
});

server.put("/api/recipes/:id", async (request, reply) => {
  const existingRecipe = await getRecipeById(request.params.id);

  if (!existingRecipe) {
    reply.code(404);
    return {
      message: "Recipe not found"
    };
  }

  return updateRecipe(request.params.id, request.body);
});

server.delete("/api/recipes/:id", async (request, reply) => {
  const existingRecipe = await getRecipeById(request.params.id);

  if (!existingRecipe) {
    reply.code(404);
    return {
      message: "Recipe not found"
    };
  }

  await deleteRecipe(request.params.id);

  return {
    success: true
  };
});

const start = async () => {
  try {
    await server.listen({
      port: apiPort,
      host: "0.0.0.0"
    });
  } catch (error) {
    server.log.error(error);
    process.exit(1);
  }
};

start();
