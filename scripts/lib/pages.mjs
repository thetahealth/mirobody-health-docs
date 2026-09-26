/**
 * Which pages exist, which tab they are in, and which of them are generated.
 *
 * docs.json is the navigation source; oss-map.json says which Open Source pages
 * are rendered from the mirobody repository by scripts/sync-oss.mjs. A generated
 * page is checked by check:sync (it must equal what the pinned commit renders
 * to); the editorial gates (headings, internals, facts) apply to the pages
 * written here.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, readMap } from "./oss.mjs";

export const DOCS_JSON = JSON.parse(readFileSync(join(ROOT, "docs.json"), "utf8"));

/** [{ locale, tab, tabIndex, group, page }] for every page in the navigation. */
export function navEntries() {
  const out = [];
  for (const language of DOCS_JSON.navigation.languages) {
    language.tabs.forEach((tab, tabIndex) => {
      for (const group of tab.groups) {
        for (const page of group.pages) {
          out.push({ locale: language.language, tab: tab.tab, tabIndex, group: group.group, page });
        }
      }
    });
  }
  return out;
}

/** `en/api-reference/index` → the file on disk, or null. */
export function pageFile(page) {
  const file = join(ROOT, `${page}.mdx`);
  return existsSync(file) ? file : null;
}

export function read(page) {
  const file = pageFile(page);
  return file ? readFileSync(file, "utf8") : null;
}

/** Frontmatter as flat key → string (the site only uses flat string fields). */
export function frontmatter(text) {
  const block = /^---\n([\s\S]*?)\n---/.exec(text)?.[1] ?? "";
  const out = {};
  for (const line of block.split("\n")) {
    const m = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
    if (m) out[m[1]] = m[2].trim().replace(/^"(.*)"$/, "$1");
  }
  return out;
}

/** The generated files: en/<slug> always, zh/<slug> unless it is a hand-written translation. */
export function generatedPages() {
  const set = new Set();
  for (const page of readMap().pages) {
    set.add(`en/${page.slug}`);
    if (page.zh !== "translation") set.add(`zh/${page.slug}`);
  }
  return set;
}

/** Hand-written translations of generated pages: zh/<slug>. */
export function translatedPages() {
  return new Set(readMap().pages.filter((p) => p.zh === "translation").map((p) => `zh/${p.slug}`));
}

/** Every .mdx under en/ and zh/, as `en/foo/bar` (no extension). */
export function pagesOnDisk() {
  const out = [];
  for (const locale of ["en", "zh"]) {
    for (const file of readdirSync(join(ROOT, locale), { recursive: true })) {
      const rel = String(file).split("\\").join("/");
      if (rel.endsWith(".mdx")) out.push(`${locale}/${rel.slice(0, -4)}`);
    }
  }
  return out;
}

/** Hand-written pages in the Open Source tab and the overview: what the OSS editorial gates scan. */
export function selfWrittenOssPages() {
  const generated = generatedPages();
  return navEntries()
    .filter((e) => e.tabIndex !== 1) // tab 1 is Cloud: a wire contract, checked against the backend instead
    .map((e) => e.page)
    .filter((page) => !generated.has(page));
}

/** Snippet files (both languages). */
export function snippetFiles() {
  return readdirSync(join(ROOT, "snippets"), { recursive: true })
    .map((f) => `snippets/${String(f).split("\\").join("/")}`)
    .filter((f) => /\.(mdx|jsx)$/.test(f));
}

/** Strip Mintlify's explicit heading id: "Title {#id}" → "Title". */
export const stripId = (heading) => heading.replace(/\s*\{#[^}]+\}\s*$/, "");
