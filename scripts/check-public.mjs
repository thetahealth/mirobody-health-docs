/**
 * Public-content gate: nothing that would be committed may carry a secret, a
 * local machine path, a working file, or a term from the private denylist.
 *
 *   npm run check:public              files git would commit (tracked + untracked, not ignored)
 *   npm run check:public -- --history also every line ever added on any branch
 *
 * The denylist is not in this repository, on purpose: a public list of words that
 * must not appear would publish the words. It is read from `internal/public-denylist.txt`
 * (gitignored) and from the `PUBLIC_DENYLIST` environment variable (a CI secret), one
 * term per line; a term is matched case-insensitively, `/…/` is a regular expression,
 * and `#` starts a comment. Without either, only the generic checks run, and the
 * report says so.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./lib/oss.mjs";

const HISTORY = process.argv.includes("--history");

/** Paths that are working files and must never be committed. */
const FORBIDDEN_PATHS = [
  [/(^|\/)CLAUDE(\.local)?\.md$/, "an agent working file"],
  [/(^|\/)AGENTS\.md$/, "an agent working file"],
  [/(^|\/)HANDOFF\.md$/, "a hand-off note"],
  [/^internal\//, "internal notes"],
  [/^vendor\//, "the checkout of the mirobody repository"],
  [/(^|\/)\.env(\.|$)/, "an environment file"],
  [/\.(pem|key|p12|pfx)$/, "key material"],
];

/** Formats of real credentials; placeholders such as `sk-...` or `mb_live_*` do not match. */
const SECRET_PATTERNS = [
  [/AKIA[0-9A-Z]{16}/, "an AWS access key id"],
  [/-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----\s*[A-Za-z0-9+/=]{40}/, "a private key"],
  [/\bgh[pousr]_[A-Za-z0-9]{36}\b|\bgithub_pat_[A-Za-z0-9_]{40,}/, "a GitHub token"],
  [/\bglpat-[A-Za-z0-9_-]{20}/, "a GitLab token"],
  [/\bsk-(?:ant-|proj-|or-v1-)?[A-Za-z0-9_-]{32,}/, "a model-provider API key"],
  [/\bAIza[0-9A-Za-z_-]{35}\b/, "a Google API key"],
  [/\bxox[abpr]-[A-Za-z0-9-]{10,}/, "a Slack token"],
  [/\bmb_live_[A-Za-z0-9]{24,}/, "a Mirobody Cloud key"],
  [/\bsntrys_[A-Za-z0-9+/=_-]{20,}/, "a Sentry token"],
];

/** Absolute paths from someone's machine. */
const LOCAL_PATHS = [[/(?:\/Users|\/home)\/[a-z][\w.-]*\/(?:Desktop|Documents|Downloads|development|src|code|work)\b/i, "a local machine path"]];

function denylist() {
  const lines = [];
  const file = join(ROOT, "internal/public-denylist.txt");
  if (existsSync(file)) lines.push(...readFileSync(file, "utf8").split("\n"));
  if (process.env.PUBLIC_DENYLIST) lines.push(...process.env.PUBLIC_DENYLIST.split(/\r?\n/));
  return lines
    .map((l) => l.replace(/\s+#.*$/, "").trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((term) => {
      const re = /^\/(.+)\/([gimsuy]*)$/.exec(term);
      return [re ? new RegExp(re[1], re[2].includes("i") ? re[2] : `${re[2]}i`) : new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), "a denylisted term"];
    });
}

const DENY = denylist();
const CONTENT_RULES = [...SECRET_PATTERNS, ...LOCAL_PATHS, ...DENY];

const git = (args) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 30 });
const problems = [];

/** Report a hit without echoing the matched text: the report itself may be published in CI logs. */
function scan(where, text) {
  text.split("\n").forEach((line, i) => {
    for (const [pattern, why] of CONTENT_RULES) {
      if (pattern.test(line)) problems.push(`${where}:${i + 1}: ${why}`);
    }
  });
}

const files = git(["ls-files", "--cached", "--others", "--exclude-standard"]).split("\n").filter(Boolean);
for (const file of files) {
  for (const [pattern, why] of FORBIDDEN_PATHS) {
    if (pattern.test(file)) problems.push(`${file}: ${why} — must not be committed (add it to .gitignore)`);
  }
  if (!existsSync(join(ROOT, file))) continue;
  const buf = readFileSync(join(ROOT, file));
  if (buf.includes(0)) continue; // binary
  scan(file, buf.toString("utf8"));
}

let commits = 0;
if (HISTORY) {
  const hasCommits = (() => {
    try {
      git(["rev-parse", "--verify", "HEAD"]);
      return true;
    } catch {
      return false;
    }
  })();
  if (hasCommits) {
    commits = Number(git(["rev-list", "--all", "--count"]).trim());
    for (const path of new Set(git(["log", "--all", "--format=", "--name-only"]).split("\n").filter(Boolean))) {
      for (const [pattern, why] of FORBIDDEN_PATHS) {
        if (pattern.test(path)) problems.push(`history: ${path}: ${why} was committed at some point`);
      }
    }
    let current = "";
    let lineNo = 0;
    for (const line of git(["log", "--all", "-p", "--no-color", "--format=commit %H", "-U0"]).split("\n")) {
      if (line.startsWith("commit ")) current = line.slice(7, 14);
      else if (line.startsWith("+++ ")) current = `${current.split(" ")[0]} ${line.slice(6)}`;
      else if (line.startsWith("@@")) lineNo = Number(/\+(\d+)/.exec(line)?.[1] ?? 0) - 1;
      else if (line.startsWith("+")) {
        lineNo += 1;
        for (const [pattern, why] of CONTENT_RULES) {
          if (pattern.test(line.slice(1))) problems.push(`history: ${current}:${lineNo}: ${why}`);
        }
      }
    }
  }
}

console.log(
  `public gate: ${files.length} files` + (HISTORY ? ` + ${commits} commits of history` : "") +
    ` · ${DENY.length ? `${DENY.length} denylisted terms` : "NO denylist loaded (internal/public-denylist.txt or PUBLIC_DENYLIST) — generic checks only"}`,
);
if (problems.length) {
  for (const p of [...new Set(problems)]) console.log(`  ✗ ${p}`);
  console.log(`${new Set(problems).size} problem(s)`);
  process.exitCode = 1;
} else {
  console.log("✓ clean");
}
