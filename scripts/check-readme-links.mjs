/**
 * Links from the mirobody repository into this site.
 *
 *   npm run check:readme-links
 *
 * The repository's READMEs and guides link to docs.mirobody.ai. Every one of those
 * links at the pinned commit must land on a page or a redirect here, so a reader
 * who follows a link from GitHub never meets a 404. A page removed here without a
 * redirect fails this check; so does a new link upstream to a page that does not
 * exist yet.
 *
 * The mirobody repository runs the same test before a release, against the list
 * of this site's URLs (scripts/site-urls.mjs prints it).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { VENDOR, assertVendor, vendorTree } from "./lib/oss.mjs";
import { siteUrls } from "./site-urls.mjs";

const lock = assertVendor();
const urls = siteUrls();
const DOCS_LINK = /https:\/\/docs\.mirobody\.ai(\/[^\s)"'`>\]]*)?/g;

const sources = [...vendorTree().files].filter((f) => /(^|\/)README(\.[\w-]+)?\.md$|^docs\/.*\.md$|^\.github\/.*\.(md|ya?ml)$/.test(f));
const problems = [];
let links = 0;

for (const file of sources) {
  const text = readFileSync(join(VENDOR, file), "utf8");
  for (const [, rawPath = "/"] of text.matchAll(DOCS_LINK)) {
    links += 1;
    const path = rawPath.split("#")[0].replace(/\/+$/, "") || "/";
    if (!urls.has(path)) problems.push(`${file}: https://docs.mirobody.ai${rawPath} — no page or redirect at ${path}`);
  }
}

console.log(`README links: ${links} links to docs.mirobody.ai in ${sources.length} files at ${lock.version}`);
if (problems.length) {
  for (const p of [...new Set(problems)]) console.log(`  ✗ ${p}`);
  console.log(`${new Set(problems).size} problem(s)`);
  process.exitCode = 1;
} else {
  console.log("✓ clean");
}
