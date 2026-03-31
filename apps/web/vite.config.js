import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { appConfig } from "@recipe-repo/shared";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": appConfig.apiTarget,
      "/health": appConfig.apiTarget
    }
  }
});
