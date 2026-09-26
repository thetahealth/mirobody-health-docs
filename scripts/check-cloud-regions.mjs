/**
 * Keep copyable Cloud curl examples tied to the reader's selected region.
 * Static hosts in prose and region reference tables remain intentional.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./lib/oss.mjs";

const problems = [];
let pages = 0;

for (const locale of ["en", "zh"]) {
  const directory = join(ROOT, locale, "api-reference");
  for (const name of readdirSync(directory).filter((value) => value.endsWith(".mdx"))) {
    const file = `${locale}/api-reference/${name}`;
    const body = readFileSync(join(ROOT, file), "utf8");
    pages++;
    body.split("\n").forEach((line, index) => {
      if (/^\s*curl\b.*https:\/\/api\.mirobody\.ai\/v1/.test(line)) {
        problems.push(`${file}:${index + 1}: curl hardcodes the Global API host`);
      }
    });
    if (name !== "quickstart.mdx" && /curl\b[^\n]*\$MIROBODY_API_BASE/.test(body)
      && (!body.includes("import RegionShell from") || !body.includes("<RegionShell />"))) {
      problems.push(`${file}: curl uses MIROBODY_API_BASE without its regional setup`);
    }
  }
  const auth = readFileSync(join(ROOT, "snippets", ...(locale === "zh" ? ["zh"] : []), "auth-key.mdx"), "utf8");
  if (!auth.includes("platform.mirobody.ai/developer/keys") || !auth.includes("platform.mirobody.cn/developer/keys")) {
    problems.push(`${locale} auth-key snippet must link both regional consoles`);
  }
}

console.log(`Cloud region check: ${pages} top-level reference pages`);
if (problems.length) {
  for (const problem of problems) console.log(`  ✗ ${problem}`);
  process.exitCode = 1;
} else {
  console.log("✓ clean");
}
