import { defineConfig } from "vite";

// Requests to /api are forwarded to the Java backend on port 8080
export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:8080"
    }
  }
});
