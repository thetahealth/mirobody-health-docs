/**
 * Translation freshness gate.
 *
 *   npm run check:freshness
 *
 * A hand-written translation of a generated page (oss-map.json: "zh": "translation")
 * records the upstream file and commit it was translated from:
 *
 *   source: "docs/quickstart.md@<commit>"
 *
 * When oss.lock moves to a commit where that file differs, the translation is out
 * of date: this fails until the Chinese page is updated and its `source` moved to
 * the new commit. Compared by blob, so a commit that did not touch the file passes.
 */
import { assertVendor, ensureCommit, git, readMap } from "./lib/oss.mjs";
import { frontmatter, read } from "./lib/pages.mjs";

const lock = assertVendor();
const problems = [];
let checked = 0;

for (const page of readMap().pages.filter((p) => p.zh === "translation")) {
  const file = `zh/${page.slug}`;
  const text = read(file);
  if (!text) {
    problems.push(`${file}.mdx: missing — oss-map.json says it is a hand-written translation`);
    continue;
  }
  const source = frontmatter(text).source ?? "";
  const m = /^(.+)@([0-9a-f]{40})$/.exec(source);
  if (!m) {
    problems.push(`${file}.mdx: frontmatter needs source: "${page.source}@<40-character commit>"`);
    continue;
  }
  const [, path, commit] = m;
  if (path !== page.source) {
    problems.push(`${file}.mdx: translates ${path}, but oss-map.json renders ${page.source}`);
    continue;
  }
  checked += 1;
  if (commit === lock.commit) continue;
  ensureCommit(commit);
  const blob = (sha) => {
    try {
      return git(["rev-parse", `${sha}:${path}`], { quiet: true });
    } catch {
      return null; // the file did not exist at that commit
    }
  };
  if (blob(commit) !== blob(lock.commit)) {
    problems.push(
      `${file}.mdx: ${path} changed between ${commit.slice(0, 7)} (translated) and ${lock.commit.slice(0, 7)} (pinned) — ` +
        `update the translation (git -C vendor/mirobody diff ${commit.slice(0, 7)} ${lock.commit.slice(0, 7)} -- ${path}), then set source to @${lock.commit}`,
    );
  }
}

console.log(`freshness: ${checked} translation(s) against mirobody ${lock.version} (${lock.commit.slice(0, 7)})`);
if (problems.length) {
  for (const p of problems) console.log(`  ✗ ${p}`);
  console.log(`${problems.length} problem(s)`);
  process.exitCode = 1;
} else {
  console.log("✓ clean");
}
