import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "src/client",
  build: {
    outDir: "../../static",
  },
  plugins: [react()],
});
