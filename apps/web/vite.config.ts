import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@minha-loja/shared-types": path.resolve(__dirname, "../../packages/shared-types/src/index.ts"),
      "@minha-loja/game-engine": path.resolve(__dirname, "../../packages/game-engine/src/index.ts"),
    },
  },
  optimizeDeps: {
    include: ["@minha-loja/shared-types", "@minha-loja/game-engine"],
  },
  build: {
    commonjsOptions: {
      include: [/@minha-loja\/shared-types/, /@minha-loja\/game-engine/, /node_modules/],
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3001",
      "/socket.io": {
        target: "http://localhost:3001",
        ws: true,
      },
    },
  },
});
