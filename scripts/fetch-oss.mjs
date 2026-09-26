/**
 * Check out the mirobody repository at the commit `oss.lock` pins, into
 * `vendor/mirobody/` (gitignored).
 *
 *   npm run oss:fetch
 *   OSS_REPO=../mirobody npm run oss:fetch     # clone from a local checkout instead
 *
 * A commit hash, not a tag: tags in that repository have been re-pointed before,
 * and a hash cannot move. The fetch is shallow and skips Git LFS content, since no
 * page needs the terminology data files.
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { VENDOR, git, readLock, vendorHead } from "./lib/oss.mjs";

const lock = readLock();
const source = process.env.OSS_REPO || lock.repo;

if (vendorHead() === lock.commit) {
  console.log(`vendor/mirobody already at ${lock.version} (${lock.commit.slice(0, 7)})`);
  process.exit(0);
}

mkdirSync(VENDOR, { recursive: true });
if (vendorHead() === null) {
  git(["init", "--quiet"]);
}
try {
  git(["remote", "add", "origin", source], { quiet: true });
} catch {
  git(["remote", "set-url", "origin", source]);
}

console.log(`fetching mirobody ${lock.version} (${lock.commit.slice(0, 7)}) from ${source}`);
git(["fetch", "--quiet", "--depth=1", "origin", lock.commit]);
git(["-c", "advice.detachedHead=false", "checkout", "--quiet", "--force", "--detach", lock.commit]);
git(["clean", "--quiet", "-fdx"]);

const head = vendorHead();
if (head !== lock.commit) {
  console.error(`checkout ended at ${head}, expected ${lock.commit}`);
  process.exit(1);
}
console.log(`vendor/mirobody at ${lock.version} (${head.slice(0, 7)}) → ${join("vendor", "mirobody")}`);
