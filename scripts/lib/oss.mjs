/**
 * Shared helpers for everything that reads the mirobody repository.
 *
 * The Open Source pages are generated from the mirobody repository at ONE commit,
 * the one `oss.lock` pins. `scripts/fetch-oss.mjs` checks that commit out into
 * `vendor/mirobody/` (gitignored); every other script reads from there and never
 * from a branch, so what the site says always matches a release someone can install.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, normalize, posix } from "node:path";

export const ROOT = fileURLToPath(new URL("../..", import.meta.url));
export const VENDOR = join(ROOT, "vendor/mirobody");
export const LOCALES = ["en", "zh"];

export function readLock() {
  const lock = JSON.parse(readFileSync(join(ROOT, "oss.lock"), "utf8"));
  if (!/^[0-9a-f]{40}$/.test(lock.commit)) {
    throw new Error(`oss.lock: "commit" must be a full 40-character hash, got ${lock.commit}`);
  }
  return lock;
}

export function readMap() {
  return JSON.parse(readFileSync(join(ROOT, "oss-map.json"), "utf8"));
}

/** Run git inside the vendor checkout. LFS smudging is off: no page needs the data files. */
export function git(args, { cwd = VENDOR, quiet = false } = {}) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", quiet ? "ignore" : "inherit"],
    env: { ...process.env, GIT_LFS_SKIP_SMUDGE: "1" },
  }).trim();
}

export function vendorHead() {
  if (!existsSync(join(VENDOR, ".git"))) return null;
  try {
    return git(["rev-parse", "HEAD"], { quiet: true });
  } catch {
    return null;
  }
}

/** Fail loudly when the checkout is missing or at a different commit than oss.lock. */
export function assertVendor() {
  const lock = readLock();
  const head = vendorHead();
  if (head !== lock.commit) {
    throw new Error(
      `vendor/mirobody is at ${head ?? "nothing"}, oss.lock pins ${lock.commit}. Run: npm run oss:fetch`,
    );
  }
  return lock;
}

/** Make sure a commit object is present locally (shallow fetches bring one commit only). */
export function ensureCommit(sha) {
  try {
    git(["cat-file", "-e", `${sha}^{commit}`], { quiet: true });
  } catch {
    git(["fetch", "--quiet", "--depth=1", "origin", sha]);
  }
}

/** Every path in the pinned tree (files and directories), for link-target checks. */
let treeCache = null;
export function vendorTree() {
  if (!treeCache) {
    const lock = readLock();
    const files = git(["ls-tree", "-r", "--name-only", lock.commit]).split("\n").filter(Boolean);
    const dirs = new Set();
    for (const file of files) {
      let dir = posix.dirname(file);
      while (dir !== ".") {
        dirs.add(dir);
        dir = posix.dirname(dir);
      }
    }
    treeCache = { files: new Set(files), dirs };
  }
  return treeCache;
}

export function readVendor(path) {
  return readFileSync(join(VENDOR, path), "utf8");
}

export function isVendorDir(path) {
  const full = join(VENDOR, path);
  return existsSync(full) && statSync(full).isDirectory();
}

/** GitHub URL for a repository path at the pinned commit. */
export function githubUrl(path, { lock = readLock(), anchor = "" } = {}) {
  const clean = path.replace(/^\/+|\/+$/g, "");
  if (!clean) return `${lock.repo}/tree/${lock.commit}`;
  const kind = vendorTree().dirs.has(clean) ? "tree" : "blob";
  return `${lock.repo}/${kind}/${lock.commit}/${clean}${anchor}`;
}

/** Resolve a relative link found in `fromPath` to a repository path. */
export function resolveRepoPath(fromPath, target) {
  const joined = normalize(join(dirname(fromPath), target)).split("\\").join("/");
  return joined.replace(/^\.\//, "");
}

/**
 * Which site page a repository file became, if any.
 * `docs/walkthrough.zh-CN.md` → { slug: "walkthrough", locale: "zh" }.
 */
export function pageIndex(map = readMap()) {
  const index = new Map();
  for (const page of map.pages) {
    index.set(page.source, { slug: page.slug, locale: null });
    if (page.zhSource) index.set(page.zhSource, { slug: page.slug, locale: "zh" });
  }
  return index;
}
