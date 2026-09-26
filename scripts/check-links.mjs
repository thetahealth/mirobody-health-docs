/**
 * Links into the mirobody repository.
 *
 *   npm run check:links
 *
 * Internal links, anchors and redirect targets are Mintlify's to check
 * (`npm run check:mint`, i.e. `mint broken-links --check-anchors --check-redirects`).
 * This covers what that cannot know: a link into github.com/thetahealth/mirobody
 * must name the commit oss.lock pins (a branch name moves under the page), and the
 * file or directory it names must exist at that commit. <OssLink path="…"> is
 * checked the same way.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, assertVendor, vendorTree } from "./lib/oss.mjs";
import { pagesOnDisk, snippetFiles } from "./lib/pages.mjs";

const lock = assertVendor();
const tree = vendorTree();
const REPO_LINK = /https:\/\/github\.com\/thetahealth\/mirobody\/(blob|tree|raw)\/([^/\s)"'`]+)\/([^\s)"'`#?]*)/g;
const OSS_LINK = /<OssLink\s+path="([^"]*)"/g;

const files = [...pagesOnDisk().map((p) => `${p}.mdx`), ...snippetFiles().filter((f) => f.endsWith(".mdx"))];
const problems = [];
let links = 0;

for (const file of files) {
  const text = readFileSync(join(ROOT, file), "utf8");
  for (const [url, , ref, rawPath] of text.matchAll(REPO_LINK)) {
    links += 1;
    const path = decodeURIComponent(rawPath).replace(/\/+$/, "");
    if (ref !== lock.commit) problems.push(`${file}: ${url} — use the pinned commit ${lock.commit.slice(0, 7)}, not "${ref}" (or <OssLink path="${path}">)`);
    else if (path && !tree.files.has(path) && !tree.dirs.has(path)) problems.push(`${file}: ${path} does not exist at ${lock.version}`);
  }
  for (const [, rawPath] of text.matchAll(OSS_LINK)) {
    links += 1;
    const path = rawPath.replace(/\/+$/, "");
    if (path && !tree.files.has(path) && !tree.dirs.has(path)) problems.push(`${file}: <OssLink path="${rawPath}"> does not exist at ${lock.version}`);
  }
}

console.log(`repository links: ${links} in ${files.length} files, against ${lock.version} (${lock.commit.slice(0, 7)})`);
if (problems.length) {
  for (const p of problems) console.log(`  ✗ ${p}`);
  console.log(`${problems.length} problem(s)`);
  process.exitCode = 1;
} else {
  console.log("✓ clean");
}
