/**
 * Facts gate: every engine fact a hand-written page states must hold at the
 * commit oss.lock pins.
 *
 *   npm run check:facts
 *
 * Prose quotes the engine through <Fact k="…"/>, which cannot go stale. Code
 * blocks cannot hold a component, so there the literal value stays — and this
 * check re-reads every such literal against the pinned checkout, so bumping
 * oss.lock to a release that changed a port, an account or a config key fails
 * here, on the pull request, instead of shipping a page that no longer works.
 *
 * Checked in hand-written Open Source pages, the overview, and the snippets:
 *   ports        localhost:NNNN / 127.0.0.1:NNNN is one of the stack's ports
 *   accounts     a …@mirobody.ai address is a predefined account
 *   versions     a mirobody x.y.z is the pinned version
 *   CLI          `mirobody <subcommand>` names a real subcommand
 *   tools        a tool-shaped name (query_…, resolve_…) is a real MCP tool
 *   paths        a `mirobody/…` path exists at the pinned commit
 *   config keys  an UPPER_SNAKE key the reader is told to set exists upstream
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { readFacts } from "./lib/facts.mjs";
import { ROOT, VENDOR, assertVendor, vendorTree } from "./lib/oss.mjs";
import { selfWrittenOssPages, snippetFiles, translatedPages } from "./lib/pages.mjs";

assertVendor();
const facts = readFacts();
const tree = vendorTree();

/**
 * Keys the reader sets that the mirobody repository does not define itself, each
 * with the reason it is legitimate.
 */
const FOREIGN_KEYS = new Map([
  ["FORWARDED_ALLOW_IPS", "uvicorn's own setting for trusted proxies"],
  ["POSTGRES_PASSWORD", "the postgres image's setting, restated in compose.override.yaml"],
  ["HTTPS_PROXY", "the standard proxy variable"],
  ["PREFIX", "the placeholder in <PREFIX>_BASE_URL"],
  ["ENV", "compose/deploy variable"],
  ["TOKEN", "a shell variable in an example"],
  ["TARGET_REF", "the operator's selected release tag or commit in the upgrade guide"],
  ["MIROBODY_API_BASE", "the reader-selected Cloud region in API examples; not an engine config key"],
]);

/** Every UPPER_SNAKE token in the repository's config, compose, scripts and Python. */
function upstreamKeys() {
  const keys = new Set();
  const scan = (text) => {
    for (const [k] of text.matchAll(/\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/g)) keys.add(k);
  };
  for (const file of tree.files) {
    if (!/\.(py|ya?ml|sh|example|toml|md)$/.test(file) && !/^\.env/.test(file)) continue;
    if (file.startsWith("frontend/")) continue;
    try {
      scan(readFileSync(join(VENDOR, file), "utf8"));
    } catch { /* LFS pointer or binary */ }
  }
  return keys;
}
const KEYS = upstreamKeys();

const devPort = /p_dev\.add_argument\("--port", type=int, default=(\d+)/.exec(readFileSync(join(VENDOR, "mirobody/cli.py"), "utf8"))?.[1];
if (!devPort) throw new Error("facts: could not read the `mirobody dev` port from mirobody/cli.py");
const ports = new Set([facts.port, facts.pgPort, facts.redisPort, devPort, 5432, 6379].filter(Boolean).map(String));
const accounts = new Set(facts.accounts);
const cli = new Set(facts.cli);
const tools = new Set([...facts.tools.mcp, "ask_user", "eval"]);

const files = [
  ...selfWrittenOssPages().map((p) => `${p}.mdx`),
  ...[...translatedPages()].map((p) => `${p}.mdx`),
  ...snippetFiles().filter((f) => f.endsWith(".mdx")),
];

const problems = [];
for (const file of new Set(files)) {
  const text = readFileSync(join(ROOT, file), "utf8");
  const lines = text.split("\n");
  lines.forEach((line, i) => {
    const at = `${file}:${i + 1}`;
    for (const [, port] of line.matchAll(/(?:localhost|127\.0\.0\.1):(\d{2,5})\b/g)) {
      if (!ports.has(port)) problems.push(`${at}: port ${port} is not a port of the ${facts.version} stack or dev server (${[...ports].join(", ")})`);
    }
    for (const [email] of line.matchAll(/\b[\w.+-]+@mirobody\.ai\b/g)) {
      if (!accounts.has(email)) problems.push(`${at}: ${email} is not a predefined account at ${facts.version}`);
    }
    for (const [, version] of line.matchAll(/\bmirobody[ @=v]+(\d+\.\d+\.\d+)\b/gi)) {
      if (version !== facts.version) problems.push(`${at}: mirobody ${version} is not the pinned ${facts.version}`);
    }
    for (const [, sub] of line.matchAll(/(?:^\s*(?:\$\s+)?|&&\s*|;\s*|`|\buvx |-m )mirobody ([a-z][a-z-]+)\b/g)) {
      if (!cli.has(sub)) problems.push(`${at}: \`mirobody ${sub}\` is not a CLI subcommand at ${facts.version}`);
    }
    for (const [, name] of line.matchAll(/`((?:query|resolve|convert|normalize|get|search|fetch)_[a-z_]+)`/g)) {
      if (!tools.has(name)) problems.push(`${at}: \`${name}\` is not an MCP tool at ${facts.version}`);
    }
    for (const [, path] of line.matchAll(/(?:`|path=")(mirobody\/[\w./-]*?)\/?(?:`|")/g)) {
      if (!tree.files.has(path) && !tree.dirs.has(path)) problems.push(`${at}: ${path} does not exist at ${facts.version}`);
    }
    for (const [, key] of line.matchAll(/`([A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+)`/g)) {
      if (!KEYS.has(key) && !FOREIGN_KEYS.has(key)) problems.push(`${at}: \`${key}\` is defined nowhere in mirobody ${facts.version}`);
    }
  });
  // Config keys set in yaml/bash/env code blocks.
  let fence = null;
  lines.forEach((line, i) => {
    const open = /^\s*```(\w+)?/.exec(line);
    if (open) { fence = fence ? null : open[1] ?? "text"; return; }
    if (!fence || !["yaml", "bash", "env"].includes(fence)) return;
    const m = /^\s*(?:export\s+)?([A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+)\s*[:=]/.exec(line);
    if (m && !KEYS.has(m[1]) && !FOREIGN_KEYS.has(m[1])) problems.push(`${file}:${i + 1}: \`${m[1]}\` is defined nowhere in mirobody ${facts.version}`);
  });
}

console.log(`facts gate: ${new Set(files).size} files against mirobody ${facts.version} (${facts.commitShort}) · ${KEYS.size} upstream keys`);
if (problems.length) {
  for (const p of [...new Set(problems)]) console.log(`  ✗ ${p}`);
  console.log(`${new Set(problems).size} problem(s)`);
  process.exitCode = 1;
} else {
  console.log("✓ clean");
}
