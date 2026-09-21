import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root,
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": root } },
  server: {
    host: "0.0.0.0", // Recommended for hosting platforms so it binds externally
    port: Number(process.env.PORT) || 3000,
    strictPort: true,
    allowedHosts: [
      "solar-enterprise-tool-2.onrender.com",
      ".onrender.com", // Allows all Render subdomains automatically
    ],
    watch: { ignored: ["**/data/**", "**/node_modules/**"] },
  },
});
