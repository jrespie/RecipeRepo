import Fastify from "fastify";
import { appConfig } from "@recipe-repo/shared";
import { listRecipeSummaries } from "@recipe-repo/domain";

const server = Fastify({
  logger: true
});

server.get("/health", async () => {
  return {
    status: "ok",
    app: appConfig.name
  };
});

server.get("/api/recipes", async () => {
  return {
    items: listRecipeSummaries()
  };
});

const start = async () => {
  try {
    await server.listen({
      port: appConfig.apiPort,
      host: "0.0.0.0"
    });
  } catch (error) {
    server.log.error(error);
    process.exit(1);
  }
};

start();
