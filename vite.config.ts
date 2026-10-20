import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { execFileSync } from "node:child_process";
const commit = () =>
  (
    process.env.GITHUB_SHA ??
    execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" })
  ).trim();
export default defineConfig({
  plugins: [
    react(),
    {
      name: "build-commit",
      transformIndexHtml: () => [
        {
          tag: "meta",
          attrs: { name: "build-commit", content: commit() },
          injectTo: "head",
        },
      ],
    },
  ],
  base: "./",
});
