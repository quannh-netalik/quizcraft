import esbuild from "esbuild";

await esbuild.build({
  entryPoints: {
    config: "src/config.ts",
    model: "src/model.ts",
    "quiz-state": "src/quiz-state.ts",
    "quiz-instance": "src/quiz-instance.ts",
    "choice-renderer": "src/renderers/choice-renderer.ts",
    "matching-renderer": "src/renderers/matching-renderer.ts",
    "ordering-renderer": "src/renderers/ordering-renderer.ts",
  },
  bundle: true,
  format: "cjs",
  platform: "node",
  target: "node18",
  outdir: ".test-dist",
  outExtension: { ".js": ".cjs" },
});
