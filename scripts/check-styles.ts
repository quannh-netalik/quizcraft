// CI guard: the committed styles.css must be what build.ts would write, so a
// change to styles/*.css cannot ship without the generated file.
import { readFileSync } from "node:fs";
import { exit } from "node:process";
import { buildStyles } from "./styles";

if (readFileSync("styles.css", "utf8") !== buildStyles()) {
  console.error("styles.css is out of date: run `bun run dev` and commit the result.");
  exit(1);
}
console.log("styles.css matches styles/*.css");
