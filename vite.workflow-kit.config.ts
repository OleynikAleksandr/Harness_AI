import { defineConfig } from "vite";

/**
 * Standalone Workflow Kit bundle: one ES module for Node 22+, with every
 * cluster module inlined and only Node built-ins left external.
 */
export default defineConfig({
  build: {
    emptyOutDir: true,
    minify: false,
    outDir: "dist/workflow-kit",
    rollupOptions: {
      output: {
        entryFileNames: "workflow.mjs",
        format: "es",
      },
    },
    ssr: "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-cli.ts",
    target: "node22",
  },
  ssr: {
    noExternal: true,
    target: "node",
  },
});
