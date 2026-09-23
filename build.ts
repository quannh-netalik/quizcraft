import { builtinModules } from "node:module";

const production = process.argv.includes("--production");

const result = await Bun.build({
  entrypoints: ["src/main.ts"],
  outdir: ".",
  naming: "main.js",
  target: "browser",
  // Obsidian loads plugins through require(), so the bundle must be CommonJS.
  format: "cjs",
  external: ["obsidian", "electron", "@codemirror/*", "@lezer/*", ...builtinModules],
  minify: production,
  sourcemap: production ? "none" : "inline",
});

if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}
console.log(`built main.js (${production ? "production" : "dev"})`);
