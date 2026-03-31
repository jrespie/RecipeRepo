import Fastify from "fastify";
import { appConfig } from "@recipe-repo/shared";
import {
  createRecipe,
  dbStatus,
  getRecipeById,
  listRecipes,
  updateRecipe
} from "@recipe-repo/db";

const server = Fastify({
  logger: true
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
