/**
 * Every URL path this site answers: each page, each redirect source, and the
 * locale roots. Used by check:readme-links, and printed for the mirobody
 * repository's own pre-release link check:
 *
 *   node scripts/site-urls.mjs > site-urls.txt
 */
import { fileURLToPath } from "node:url";
import { DOCS_JSON, navEntries } from "./lib/pages.mjs";

export function siteUrls() {
  const urls = new Set(["/", "/en", "/zh"]);
  for (const { page } of navEntries()) {
    urls.add(`/${page.replace(/\/index$/, "")}`);
  }
  for (const { source } of DOCS_JSON.redirects ?? []) urls.add(source.replace(/\/+$/, ""));
  return urls;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log([...siteUrls()].sort().join("\n"));
}
