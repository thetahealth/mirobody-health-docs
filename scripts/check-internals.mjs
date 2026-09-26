/**
 * Internals gate for the hand-written Open Source pages.
 *
 *   npm run check:internals
 *
 * The rule: an identifier may appear when the reader will TYPE it — a command, a
 * config key, an env var, an HTTP route, a base class they subclass, a directory
 * convention, a table they query, a request or response field. Engine internals
 * (service classes and their methods, private helpers, scheduled task classes,
 * links into implementation files) are left to the generated pages, which carry
 * the mirobody repository's own documentation verbatim, and to the code itself.
 * Behaviour is still documented, in terms the reader observes.
 *
 * Scope: hand-written pages of the Open Source tab and the overview. The Cloud
 * tab documents a wire contract, where every identifier is caller-typed.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./lib/oss.mjs";
import { selfWrittenOssPages } from "./lib/pages.mjs";

/** Public extension points a reader subclasses, calls or configures. */
const CONTRACT = new Set(["BasePullProvider", "ProviderInfo"]);

const INTERNAL_CLASS =
  /`([A-Z][A-Za-z0-9]*(?:Service|Task|Manager|Factory|Handler|Extractor|Analyzer|Splitter|Reconciler|Validator|Uploader|Formatter|Adapter|Registry|Aggregator|Loader|Platform|Middleware))(?:\.[a-z_][A-Za-z0-9_]*)?\(?\)?`/g;

/** Documented override hooks and wire fields, despite the leading underscore. */
const HOOK_ALLOWLIST = new Set(["_enabled", "_meta"]);
const PRIVATE_FN = /`(_[a-z][A-Za-z0-9_]*)\(?/g;

/**
 * Source files a page may link, because the reader edits them. Everything else
 * that ends in `.py` is implementation.
 */
const EDITABLE_SOURCE = new Set([
  "mirobody/tests/test_engine_coverage.py", // a contributor adds a resolver case here
]);

const LINKS = [
  /\((https:\/\/github\.com\/[^)]*\/blob\/[^)]*\.py)\)/g,
  /<OssLink path="([^"]+\.py)"/g,
];
const DIR_LINKS = [/\((https:\/\/github\.com\/[^)]*\/tree\/[^)]*)\)/g, /<OssLink path="([^"]*\/)"/g];

let problems = 0;
const pages = selfWrittenOssPages();

for (const page of pages) {
  const src = readFileSync(join(ROOT, `${page}.mdx`), "utf8");
  const report = (msg) => {
    console.log(`  ✗ ${page}.mdx: ${msg}`);
    problems += 1;
  };

  const classes = new Set([...src.matchAll(INTERNAL_CLASS)].map((m) => m[1]).filter((n) => !CONTRACT.has(n)));
  if (classes.size) report(`internal class name(s): ${[...classes].join(", ")}`);

  const privates = new Set([...src.matchAll(PRIVATE_FN)].map((m) => m[1]).filter((n) => !HOOK_ALLOWLIST.has(n)));
  if (privates.size) report(`private helper(s): ${[...privates].join(", ")}`);

  const files = LINKS.flatMap((re) => [...src.matchAll(re)].map((m) => m[1]))
    .filter((link) => ![...EDITABLE_SOURCE].some((path) => link.endsWith(path)));
  if (files.length) report(`link(s) into an implementation file: ${files.join(", ")}`);

  const dirs = DIR_LINKS.flatMap((re) => [...src.matchAll(re)].map((m) => m[1]));
  if (dirs.length > 1) report(`${dirs.length} repository directory links — keep at most one, at the end`);
}

console.log(`internals gate: ${pages.length} hand-written Open Source pages`);
if (problems) {
  console.log(`${problems} problem(s)`);
  process.exitCode = 1;
} else {
  console.log("✓ clean");
}
