# Mirobody documentation

Source of [docs.mirobody.ai](https://docs.mirobody.ai): the documentation for
Mirobody Cloud and for the open-source engine,
[thetahealth/mirobody](https://github.com/thetahealth/mirobody). The site is built
with [Mintlify](https://mintlify.com) and published from `main`.

## Layout

| Path | What it is |
| --- | --- |
| `docs.json` | Site configuration and navigation: three tabs (Home, Cloud, Open Source) in English and Chinese |
| `en/`, `zh/` | The pages. The two trees mirror each other page for page. |
| `en/api-reference/`, `zh/api-reference/` | Mirobody Cloud: the hosted `/v1` API |
| `snippets/` | Shared page fragments, and `oss-facts.jsx` (generated) |
| `images/` | Images; `images/oss/` is copied from the engine repository (generated) |
| `oss.lock` | The mirobody release the Open Source pages describe: version and commit |
| `oss-map.json` | Which files of the engine repository become which Open Source pages |
| `scripts/` | The sync from the engine repository, and the checks |

## The Open Source pages

Facts about the engine are written once, in the engine repository, next to the
code. Most Open Source pages are **generated** from that repository at the commit
`oss.lock` pins, and must not be edited here: change the source upstream, then
sync. A generated page says so in its first lines.

```bash
npm install
npm run oss:fetch   # check out the pinned commit into vendor/ (gitignored)
npm run oss:sync    # render the mapped files into en/ and zh/, copy images, regenerate snippets/oss-facts.jsx
```

The remaining Open Source pages (the landing page, configuration, troubleshooting,
the agent, MCP integration, server deployment, backup verification and upgrade procedure) are written here. They quote engine
facts through `<Fact k="…"/>` from `snippets/oss-facts.jsx`, and `check:facts`
re-reads every port, account, version, command, tool name, path and config key
they state against the pinned commit.

Chinese: when the engine repository has a Chinese edition of a file, the zh page is
rendered from it. A page marked `"zh": "translation"` in `oss-map.json` is translated
here and records the commit it was translated from (`source:` in its frontmatter);
`check:freshness` fails when that file changes upstream. Any other generated page
shows the English text under a notice. Each English-only page has a short Chinese
orientation in `oss-map.json` (`zhIntro`) and is labelled `（英文）` in the Chinese sidebar.

Write task pages as procedures with prerequisites, actions and observable results.
Keep deep reference and code-derived facts in the engine repository. When a generated
source page is too long or has an error, fix it upstream; site-owned orientation can
point readers to its sections without forking the source.

## New engine releases

A scheduled workflow (`.github/workflows/oss-pin.yml`) compares `oss.lock` with the
latest release on PyPI every day and, when it is behind, opens a pull request that
moves the pin and re-syncs the generated pages. It can also be started by a
`repository_dispatch` of type `mirobody-release`. The pull request is never merged
automatically: the hand-written pages often need to follow a release.

## Local preview

```bash
npm run dev         # mint dev, http://localhost:3000
```

## Checks

```bash
npm run verify      # sync, parity, headings, internals, facts, freshness, repository links, README links, Cloud regions, public content
npm run check:mint  # mint broken-links (including anchors and redirects), then mint validate
```

Both run on every pull request (`.github/workflows/checks.yml`); `main` accepts
changes only through pull requests that pass them.

## Legal Notice

The source code in the [mirobody](https://github.com/thetahealth/mirobody) repository is open-sourced and made available under its respective open source license.

However, all documentation files in this repository—including but not limited to this README, all guides, and example use cases—are proprietary content of Theta Health, Inc. and are **not under the same license**

All rights reserved. By accessing or using these docs, you agree to these terms.
