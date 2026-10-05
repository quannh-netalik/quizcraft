// Set one version in package.json and manifest.json, and record it in
// versions.json against the manifest's minAppVersion.
// usage: bun run bump 0.3.0
import { argv, exit } from "node:process";

const version = argv[2] ?? "";
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error("usage: bun run bump <major.minor.patch>");
  exit(1);
}

async function update(path: string, edit: (json: Record<string, unknown>) => void): Promise<void> {
  const json = (await Bun.file(path).json()) as Record<string, unknown>;
  edit(json);
  await Bun.write(path, `${JSON.stringify(json, null, 2)}\n`);
}

let minAppVersion = "";
await update("package.json", (p) => {
  p.version = version;
});
await update("manifest.json", (m) => {
  m.version = version;
  minAppVersion = String(m.minAppVersion);
});
await update("versions.json", (v) => {
  v[version] = minAppVersion;
});
console.log(`version ${version} (minAppVersion ${minAppVersion})`);
