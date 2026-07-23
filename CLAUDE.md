# CLAUDE.md — mirobody-health-docs

Mintlify docs site for **docs.mirobody.ai**. Config = `docs.json` (NOT config.yaml).
Pushing `main` auto-deploys to https://docs.mirobody.ai/ — there is no staging tier;
do feature work on `dev` and merge to `main` only when ready to publish.

## Ground-truth sources (verify claims against code, not against other docs)

- **Open-source engine** (the "Open Source" tab documents this):
  `/Users/admin/Desktop/development/Mirobody/mirobody` — the real checkout of
  https://github.com/thetahealth/mirobody. (The old `a007-opensource` path is gone;
  anything referencing it is stale.)
- **Hosted API backend** (the "API Platform" tab documents this):
  `/Users/admin/Desktop/development/Mirobody/a007-mirovital/backend_py` —
  `api_platform/` implements `/v1/*`; found drifts go to `docs/bugs/` there.

## Editorial rules (from 2026-07-23 review with the owner)

- `en/` and `zh/` mirror each other 1:1 — every change lands in both.
- **Do not mention MiroThinker** anywhere in these docs.
- No ChatGPT Apps or Agent Skills pages — removed 2026-07-23 (no real product
  capability behind them); don't reintroduce.
- The Open Source tab stays focused on the OSS project — no Theta Wellness /
  platform.mirobody.ai positioning there.
- Don't document `/api/console/*` (session-JWT internal endpoints) as public API.
- Don't promise unimplemented behavior: `retention` hour/day tiers and file
  retention are NOT auto-expired (see a007-mirovital `docs/bugs/`); Subject
  erasure does NOT cover stored Agent API conversations.
- Local preview: `npx mintlify dev` (port 3000). `*/index.mdx` at a language root
  collides with the default-tab URL — that's why the OSS landing page is
  `welcome.mdx`, not `index.mdx`.
