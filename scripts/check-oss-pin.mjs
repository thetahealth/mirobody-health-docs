/**
 * Is oss.lock behind the latest mirobody release on PyPI?
 *
 *   npm run oss:pin                 report
 *   npm run oss:pin -- --strict     exit 1 when behind
 *   npm run oss:pin -- --update     move oss.lock to the latest release
 *
 * PyPI decides, not the tag: the site describes the version a reader can install.
 * The release's tag is resolved to a commit hash once, here, and the hash is what
 * gets pinned. The scheduled workflow runs --update and opens a pull request; it
 * is never merged automatically, because the hand-written pages often need to
 * follow a release and only a person can tell.
 */
import { execFileSync } from "node:child_process";
import { appendFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, readLock } from "./lib/oss.mjs";

const lock = readLock();
const response = await fetch("https://pypi.org/pypi/mirobody/json");
if (!response.ok) {
  console.error(`PyPI answered ${response.status}; nothing changed`);
  process.exit(2);
}
const latest = (await response.json()).info.version;

const parts = (v) => v.split(/[.+-]/).map((x) => (/^\d+$/.test(x) ? Number(x) : x));
function compare(a, b) {
  const [pa, pb] = [parts(a), parts(b)];
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    if (pa[i] === pb[i]) continue;
    if (pa[i] === undefined) return -1;
    if (pb[i] === undefined) return 1;
    return pa[i] < pb[i] ? -1 : 1;
  }
  return 0;
}

const output = (key, value) => {
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
};

const order = compare(lock.version, latest);
output("pinned", lock.version);
output("latest", latest);
if (order >= 0) {
  console.log(`oss.lock pins ${lock.version}; PyPI latest is ${latest} — up to date`);
  output("behind", "false");
  process.exit(0);
}
console.log(`oss.lock pins ${lock.version}; PyPI latest is ${latest} — behind`);
output("behind", "true");

if (process.argv.includes("--update")) {
  // Prefer the peeled commit of an annotated tag (`^{}`) over the tag object itself.
  const refs = execFileSync("git", ["ls-remote", lock.repo, `refs/tags/${latest}`, `refs/tags/${latest}^{}`], { encoding: "utf8" })
    .split("\n").filter(Boolean).map((l) => l.split("\t"));
  const peeled = refs.find(([, ref]) => ref.endsWith("^{}")) ?? refs[0];
  if (!peeled) {
    console.error(`PyPI has ${latest} but ${lock.repo} has no tag ${latest}; not moving the pin`);
    process.exit(1);
  }
  const next = { ...lock, version: latest, commit: peeled[0] };
  writeFileSync(join(ROOT, "oss.lock"), `${JSON.stringify(next, null, 2)}\n`);
  console.log(`oss.lock → ${latest} (${peeled[0].slice(0, 7)}); run npm run oss:fetch && npm run oss:sync`);
  output("commit", peeled[0]);
} else if (process.argv.includes("--strict")) {
  process.exitCode = 1;
}
