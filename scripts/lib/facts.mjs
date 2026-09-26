/**
 * Engine facts the hand-written pages quote — version, ports, demo accounts, model
 * keys, CLI subcommands, MCP tool names — read from the pinned checkout rather than
 * typed into prose.
 *
 * Config files (pyproject.toml, compose.yaml, config*.yaml) are parsed here. The CLI
 * subcommands and the tool names live in Python source; when the repository ships
 * `docs/facts.json` (exported by the repository and tested against its code there),
 * those two come from it. Until then they are read from the source with the narrow
 * patterns below, and `source.cli` / `source.tools` in the output says which it was.
 */
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parse as parseToml } from "smol-toml";
import { parse as parseYaml } from "yaml";
import { VENDOR, readLock, readVendor } from "./oss.mjs";

function fail(what) {
  throw new Error(`facts: could not read ${what} from the pinned checkout — the upstream layout changed; update scripts/lib/facts.mjs`);
}

/** "127.0.0.1:18062:5432" / "18060:18060" → the host-side port. */
function hostPort(mapping) {
  const parts = String(mapping).split(":");
  return Number(parts.length === 3 ? parts[1] : parts[0]);
}

function readme(file) {
  const text = readVendor(file);
  const tagline = /^# Mirobody\s*\n+\*\*(.+?)\*\*\s*$/m.exec(text)?.[1] ?? fail(`the tagline of ${file}`);
  const stages = [];
  for (const [, mark, name, what] of text.matchAll(/^\|\s*\*\*([①②③])\s*([^*|]+?)\*\*\s*\|\s*(.+?)\s*\|[^|\n]*\|\s*$/gm)) {
    stages.push({ mark, name: name.trim(), what: what.trim() });
  }
  if (stages.length !== 3) fail(`the three-stage table of ${file} (found ${stages.length} rows)`);
  return { tagline, stages };
}

function cliFromSource() {
  const src = readVendor("mirobody/cli.py");
  const names = [...src.matchAll(/\bsub\.add_parser\(\s*"([a-z][a-z-]*)"/g)].map((m) => m[1]);
  if (!names.length) fail("the CLI subcommands (mirobody/cli.py)");
  return names;
}

function toolsFromSource() {
  const dir = join(VENDOR, "mirobody/agent/tools");
  const tools = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith("_service.py")).sort()) {
    const src = readVendor(`mirobody/agent/tools/${file}`);
    for (const [, name] of src.matchAll(/^    async def ([a-z][a-z0-9_]*)\(\s*self\b/gm)) tools.push(name);
  }
  if (!tools.length) fail("the MCP tool names (mirobody/agent/tools/*_service.py)");
  const service = readVendor("mirobody/mcp/service.py");
  const block = /_DATA_GATED\s*=\s*\{([\s\S]*?)\n\s*\}/.exec(service)?.[1] ?? fail("the data-gated tools (mirobody/mcp/service.py)");
  const gated = [...block.matchAll(/^\s*"([a-z_]+)":/gm)].map((m) => m[1]);
  return { mcp: tools, gated };
}

export function readFacts() {
  const lock = readLock();

  const pyproject = parseToml(readVendor("pyproject.toml"));
  const python = /(\d+\.\d+)/.exec(pyproject.project["requires-python"])?.[1] ?? fail("requires-python");

  const compose = parseYaml(readVendor("compose.yaml"));
  const port = hostPort(compose.services?.mirobody?.ports?.[0] ?? fail("the server port (compose.yaml)"));
  const pgPort = hostPort(compose.services?.pg?.ports?.[0] ?? fail("the Postgres port (compose.yaml)"));
  const redisPort = compose.services?.redis?.ports?.[0] ? hostPort(compose.services.redis.ports[0]) : null;

  const config = parseYaml(readVendor("config.yaml"));
  const codes = config.EMAIL_PREDEFINE_CODES ?? fail("EMAIL_PREDEFINE_CODES (config.yaml)");
  const accounts = Object.keys(codes);
  const code = String(Object.values(codes)[0]);

  const llm = parseYaml(readVendor("config.llm.yaml"));
  const llmKeys = [...new Set(Object.values(llm.MODELS ?? fail("MODELS (config.llm.yaml)")).map((m) => m.api_key))];

  const exported = existsSync(join(VENDOR, "docs/facts.json")) ? JSON.parse(readVendor("docs/facts.json")) : null;
  const cli = exported?.cli ?? cliFromSource();
  const tools = exported?.tools ?? toolsFromSource();

  return {
    version: lock.version,
    commit: lock.commit,
    commitShort: lock.commit.slice(0, 7),
    repo: lock.repo,
    python,
    port,
    url: `http://localhost:${port}`,
    pgPort,
    redisPort,
    account: accounts[0],
    accounts,
    code,
    mcpUrlTtlDays: config.MCP_URL_TTL_DAYS ?? null,
    llmKeys,
    cli,
    tools,
    readme: { en: readme("README.md"), zh: readme("README.zh-CN.md") },
    source: { cli: exported?.cli ? "docs/facts.json" : "mirobody/cli.py", tools: exported?.tools ? "docs/facts.json" : "mirobody/agent/tools" },
  };
}
