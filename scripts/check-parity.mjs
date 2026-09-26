/**
 * en/zh parity + navigation gate.
 *
 *   npm run check:parity
 *
 * The two language trees mirror each other page for page, and the sidebar is
 * docs.json plus each page's frontmatter. Checks:
 *   A. both navigations list the same pages in the same order, every listed page
 *      exists, and every page on disk is listed
 *   B. per hand-written page pair (a translation of a generated page included):
 *      the same count of headings, code fences, labelled fences, internal links,
 *      imports and components — a faithful translation keeps the structure.
 *      Generated pages are exempt: their Chinese edition is the repository's own,
 *      or the English text under a notice.
 *   C. frontmatter has a title and a description in both languages
 *   D. no two pages in one tab share a sidebar label (sidebarTitle, else title)
 */
import { frontmatter, generatedPages, navEntries, pagesOnDisk, read } from "./lib/pages.mjs";

const COMPONENTS = ["Card", "CardGroup", "Columns", "Step", "Steps", "Accordion", "AccordionGroup", "Tab", "Tabs", "CodeGroup", "Frame", "ParamField", "ResponseField", "Note", "Info", "Tip", "Warning", "Check", "Fact", "OssLink", "OssSource", "OssVersion", "Stages"];

function profile(text) {
  const body = text.replace(/^---\n[\s\S]*?\n---/, "");
  const counts = { headings: (body.match(/^#{2,4} /gm) ?? []).length };
  counts.fences = (body.match(/^\s*```/gm) ?? []).length;
  counts.labelledFences = (body.match(/^\s*```[a-zA-Z]+ \S/gm) ?? []).length;
  counts.links = (body.match(/\]\(\//g) ?? []).length;
  counts.imports = (body.match(/^import /gm) ?? []).length;
  for (const name of COMPONENTS) {
    counts[name] = (body.match(new RegExp(`<${name}(?=[\\s/>\\n])`, "g")) ?? []).length;
  }
  return counts;
}

const problems = [];
const entries = navEntries();
const en = entries.filter((e) => e.locale === "en");
const zh = entries.filter((e) => e.locale === "zh");
const generated = generatedPages();

// A. the two navigations line up
if (en.length !== zh.length) problems.push(`navigation: en lists ${en.length} pages, zh lists ${zh.length}`);
en.forEach((e, i) => {
  const expected = e.page.replace(/^en\//, "zh/");
  if (zh[i]?.page !== expected) problems.push(`navigation position ${i}: en ${e.page} ↔ zh ${zh[i]?.page ?? "(none)"}`);
});
for (const e of entries) {
  if (!read(e.page)) problems.push(`${e.page}: listed in docs.json but missing on disk`);
}
const listed = new Set(entries.map((e) => e.page));
for (const page of pagesOnDisk()) {
  if (!listed.has(page)) problems.push(`${page}.mdx is not in docs.json navigation`);
}

// B + C
for (const e of en) {
  const zhPage = e.page.replace(/^en\//, "zh/");
  const a = read(e.page);
  const b = read(zhPage);
  if (!a || !b) continue;
  for (const [page, text] of [[e.page, a], [zhPage, b]]) {
    const fm = frontmatter(text);
    if (!fm.title) problems.push(`${page}: missing frontmatter title`);
    if (!fm.description) problems.push(`${page}: missing frontmatter description`);
  }
  if (generated.has(zhPage)) continue;
  const pa = profile(a);
  const pb = profile(b);
  for (const key of Object.keys(pa)) {
    if (pa[key] !== pb[key]) problems.push(`${e.page.slice(3)}: ${key} differ — en=${pa[key]} zh=${pb[key]}`);
  }
}

// D. sidebar labels unique per tab
const labels = new Map();
for (const e of entries) {
  const text = read(e.page);
  if (!text) continue;
  const fm = frontmatter(text);
  const label = fm.sidebarTitle || fm.title;
  const key = `${e.locale} · ${e.tab} · ${label}`;
  labels.set(key, [...(labels.get(key) ?? []), e.page]);
}
for (const [key, pages] of labels) {
  if (pages.length > 1) problems.push(`duplicate sidebar label [${key}]: ${pages.join(", ")}`);
}

console.log(`parity check: ${en.length} page pairs (${[...generated].filter((p) => p.startsWith("en/")).length} generated)`);
if (problems.length === 0) {
  console.log("✓ clean");
} else {
  for (const problem of problems) console.log(`  ✗ ${problem}`);
  console.log(`${problems.length} problem(s)`);
  process.exitCode = 1;
}
