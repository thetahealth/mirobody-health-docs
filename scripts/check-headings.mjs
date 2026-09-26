/**
 * Heading register gate.
 *
 *   npm run check:headings
 *
 * A heading names its section's subject as a nominal phrase; questions, claims
 * and metaphors are out, with two exceptions: a definitional "What is X?" and
 * imperatives for procedures and numbered steps. A second pass scans body text,
 * including `snippets/`, for retired vocabulary.
 *
 * Scope: the pages written in this repository. Generated Open Source pages carry
 * the mirobody repository's own headings and are checked by check:sync instead.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./lib/oss.mjs";
import { generatedPages, pagesOnDisk, snippetFiles, stripId } from "./lib/pages.mjs";

const QUESTION_ALLOWLIST = new Set(["What is Mirobody?", "什么是 Mirobody？"]);

const BANNED = {
  zh: [
    [/怎么|如何/, "narrative question form — name the subject instead"],
    [/在哪|哪来|放哪|哪些|干什么|是什么(?!$)/, "narrative question form"],
    [/[吗么]$/, "question particle"],
    [/不是什么|做不到什么/, "defined by negation — say what it is"],
    [/东西|门面|那道门|车道|骨架里/, "colloquial or metaphorical vocabulary"],
    [/应答|动词/, "retired vocabulary (use 步骤)"],
    [/接下来看/, "use 「下一步」 as the closing section"],
    [/[跑装]起来|摘掉|塞进/, "colloquial verb"],
  ],
  en: [
    [/\bdoors?\b|front door/i, "retired metaphor (use 'intake path' / 'public API')"],
    [/\bverbs?\b|\blanes?\b/i, "retired vocabulary (use 'stage')"],
    [/^Where to go next$/, "use 'Next steps' as the closing section"],
  ],
};

/** Retired in body text too. The console's own labels (`③ Answers`, `③ 问答`) are product UI and stay. */
const RETIRED = {
  zh: [
    [/三道门|那道门|一扇门|门 [123] |门面/, "the intake-door metaphor (use 接入路径 / 公开 API)"],
    [/车道/, "retired metaphor"],
    [/③ ?(使用|应答|回答)/, "stage ③ is 智能体 (Agent)"],
    [/东西/, "name what it is — 东西 is colloquial"],
  ],
  en: [
    [/\bdoors?\b|front door/i, "the intake-door metaphor (use 'intake path' / 'public API')"],
    [/\blanes?\b/i, "retired metaphor"],
    [/③ ?(Use|Answer)\b(?!s)/, "stage ③ is Agent"],
    [/[Mm]intlify/, "readers never meet the site's tooling — keep it out of page prose"],
  ],
};

function proseLength(heading) {
  return heading
    .replace(/`[^`]*`/g, "")
    .replace(/[A-Za-z0-9_./:+-]+/g, "")
    .replace(/\s+/g, "").length;
}

const LIMITS = { zh: { prose: 18 }, en: { words: 9 } };

const generated = generatedPages();
const pages = pagesOnDisk().filter((p) => !generated.has(p));
const snippets = snippetFiles().filter((f) => f.endsWith(".mdx"));
const problems = [];

for (const file of [...pages.map((p) => `${p}.mdx`), ...snippets]) {
  const locale = /(^|\/)zh\//.test(file) ? "zh" : "en";
  readFileSync(join(ROOT, file), "utf8").split("\n").forEach((line, i) => {
    for (const [pattern, why] of RETIRED[locale]) {
      if (pattern.test(line)) problems.push({ at: `${file}:${i + 1}`, text: line.trim().slice(0, 90), why });
    }
  });
}

for (const page of pages) {
  const locale = page.startsWith("zh/") ? "zh" : "en";
  let inFence = false;
  readFileSync(join(ROOT, `${page}.mdx`), "utf8").split("\n").forEach((line, i) => {
    if (line.trimStart().startsWith("```")) { inFence = !inFence; return; }
    if (inFence) return;
    const match = /^(#{2,4}) (.+)$/.exec(line);
    if (!match) return;
    const heading = stripId(match[2].trim());
    const at = `${page}.mdx:${i + 1}`;
    if (/[?？]$/.test(heading) && !QUESTION_ALLOWLIST.has(heading)) problems.push({ at, text: heading, why: "heading is a question" });
    for (const [pattern, why] of BANNED[locale]) {
      if (pattern.test(heading)) problems.push({ at, text: heading, why });
    }
    if (locale === "zh" && proseLength(heading) > LIMITS.zh.prose) {
      problems.push({ at, text: heading, why: `${proseLength(heading)} prose chars > ${LIMITS.zh.prose}` });
    }
    if (locale === "en" && heading.split(/\s+/).length > LIMITS.en.words) {
      problems.push({ at, text: heading, why: `${heading.split(/\s+/).length} words > ${LIMITS.en.words}` });
    }
  });
}

console.log(`heading register: ${pages.length} hand-written pages + ${snippets.length} snippets`);
if (problems.length === 0) {
  console.log("✓ clean");
} else {
  for (const p of problems) console.log(`  ✗ ${p.at}\n      ${p.text}\n      ${p.why}`);
  console.log(`${problems.length} problem(s)`);
  process.exitCode = 1;
}
