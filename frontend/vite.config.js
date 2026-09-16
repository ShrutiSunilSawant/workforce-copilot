import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const rootEnvDir = path.resolve(__dirname, "..");

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootEnvDir, "");
  return {
    envDir: rootEnvDir,
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: env.VITE_API_TARGET,
          changeOrigin: true,
        },
      },
    },
  };
});
