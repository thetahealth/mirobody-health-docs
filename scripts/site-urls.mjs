/**
 * Every URL path this site answers: each page, each redirect source, and the
 * locale roots. Used by check:readme-links, and printed for the mirobody
 * repository's own pre-release link check:
 *
 *   node scripts/site-urls.mjs > site-urls.txt
 *
 * A redirect source may end in a wildcard (`/en/old/:slug*`), which answers that
 * path and every path below it; the printed list keeps it as written.
 */
import { fileURLToPath } from "node:url";
import { DOCS_JSON, navEntries } from "./lib/pages.mjs";

const WILDCARD = /\/:[A-Za-z]\w*\*$/;

export function siteUrls() {
  const urls = new Set(["/", "/en", "/zh"]);
  for (const { page } of navEntries()) {
    urls.add(`/${page.replace(/\/index$/, "")}`);
  }
  for (const { source } of DOCS_JSON.redirects ?? []) urls.add(source.replace(/\/+$/, ""));
  return urls;
}

/** Whether `path` (no trailing slash, no anchor) is answered by a page or a redirect. */
export function siteAnswers(path, urls = siteUrls()) {
  if (urls.has(path)) return true;
  for (const url of urls) {
    if (!WILDCARD.test(url)) continue;
    const prefix = url.replace(WILDCARD, "");
    if (path === prefix || path.startsWith(`${prefix}/`)) return true;
  }
  return false;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log([...siteUrls()].sort().join("\n"));
}
