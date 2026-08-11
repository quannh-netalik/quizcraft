import esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["src/model.ts"],
  bundle: true,
  format: "cjs",
  platform: "node",
  target: "node18",
  outfile: ".test-dist/model.cjs",
});
