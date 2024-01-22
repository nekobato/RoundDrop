import { defineConfig } from "vite";
import path from "node:path";
import electron from "vite-plugin-electron/simple";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [
    vue(),
    electron({
      main: {
        entry: "electron/main.ts"
      },
      preload: {
        input: path.join(__dirname, "electron/preload.ts")
      },
      renderer: {}
    })
  ],
  resolve: {
    alias: [{ find: "@/", replacement: `${__dirname}/src/` }]
  }
});
