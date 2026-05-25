# Mirobody Platform 文档站升级 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按 spec `docs/superpowers/specs/2026-05-22-mirobody-platform-docs-design.md` 把现有 Mintlify 文档站升级为 Mirobody Platform 站，新增 Cloud + Trust & Compliance 两个 tab，内容主要从已通过实测的 `api_docs/cn_delivery_api.md` 拆分而来。

**Architecture:** 纯 Mintlify MDX 文档；通过 `docs.json` 配置导航；en/zh 双语对称；CN 集群为本期主线，海外集群占位 "Coming Soon"。后端 BYOK middleware 是单独 subsystem，**不在此 plan 范围内**（将另写 plan，路径 `a007-holywell/backend_py/`）。

**Tech Stack:** Mintlify (mint CLI), MDX, JSON config.

**前置约定（所有任务通用）：**

- 工作目录 = `/Users/admin/Desktop/development/mirobody-health-docs/`
- 本地预览：`mint dev`（或 `npx mint dev`），首次运行需 `npm i -g mint`。
- 每完成一个任务都要本地 `mint dev` 验证页面渲染（无 broken link / 无 MDX 编译错误）后 commit。
- 所有 MDX 页面顶端用 frontmatter：
  ```mdx
  ---
  title: "页面标题"
  description: "一句话副标题"
  ---
  ```
- 中英文术语对照：参考已有 `en/index.mdx` ↔ `zh/index.mdx` 的措辞风格。
- 文件路径风格：链接使用绝对路径，如 `/en/cloud/quickstart` / `/zh/cloud/quickstart`。
- **不要**在 MDX 里写中文标点的成对 `「」` 嵌套 — Mintlify Mint 解析器对 nested quoted 表达不够鲁棒，统一用 `"…"`。

---

## File Structure

新增文件（en/ + zh/ 对称，约 30 个页面，共 ~60 个文件）：

```
en/cloud/
├── quickstart.mdx                       # 5 分钟跑通
├── regions/
│   ├── overview.mdx                     # 全集群一览
│   ├── china.mdx                        # CN 集群正式内容
│   └── global.mdx                       # 海外 "Coming Soon"
├── byok/
│   ├── index.mdx                        # BYOK 协议总览
│   ├── dashscope.mdx
│   ├── volcengine.mdx
│   ├── openai.mdx
│   └── gemini.mdx
├── sdk-examples.mdx                     # curl / Python / Node
└── rate-limits.mdx                      # 链接到 api-reference/overview

en/trust/
├── data-residency.mdx
├── china-compliance.mdx
├── global-compliance.mdx                # Coming Soon
├── encryption.mdx
├── subprocessors.mdx
└── security-practices.mdx

zh/...同上结构（中文版）

# API Reference 重组（en/ + zh/）
en/api-reference/
├── overview.mdx                         # 替代现 introduction.mdx 的内容；含通用规范
├── authentication/
│   ├── email.mdx
│   ├── oauth.mdx
│   ├── refresh.mdx
│   └── beneficiary.mdx
├── chat/
│   ├── chat.mdx                         # 复用 send-message.mdx 路径
│   ├── session.mdx
│   ├── history.mdx                      # 保留路径
│   └── custom-prompt.mdx
├── files/
│   ├── upload.mdx
│   ├── list.mdx
│   └── delete.mdx
├── journal/
│   ├── list.mdx
│   ├── create.mdx
│   └── update-delete.mdx
├── health-indicators/
│   ├── categories.mdx
│   ├── latest.mdx
│   ├── query.mdx
│   └── distribution.mdx
├── food/
│   ├── analyze.mdx
│   └── save-history.mdx
├── asr/
│   ├── sync.mdx
│   └── task.mdx
└── websocket/
    ├── health-report.mdx
    ├── llm-analysis.mdx
    └── file-progress.mdx
```

修改文件：

- `docs.json` — name、tab 结构、新增 anchors
- `en/index.mdx` / `zh/index.mdx` — 品牌话术微调
- 现有 `en/api-reference/chat/send-message.mdx` 等 — 改造或重命名

保留不动：

- `Documentation` tab 整体（开源自部署受众用）
- `Development` tab 整体
- 现有 `Pulse API` 子 group（保留，文档中链向 API Reference / 现 chat/files 等）

---

## Task 1: 品牌修正 (Theta Health → Mirobody)

**Files:**
- Modify: `docs.json`
- Modify: `en/index.mdx` / `zh/index.mdx`（核对话术 — 已经写 "Welcome to Mirobody"，无需大改）

- [ ] **Step 1: 读 docs.json 当前内容**

```bash
grep -n "Theta Health\|Theta Wellness" docs.json
```

- [ ] **Step 2: 修改 docs.json name 字段**

Edit `docs.json`，把 `"name": "Theta Health"` 改为 `"name": "Mirobody"`。

- [ ] **Step 3: 保留外链（Theta 仍是品牌联盟、Mirobody 是 Theta 的开源项目）**

`docs.json` 中的：
- `global.anchors[0]` `"Theta Wellness App"` — 保留不动（指向 thetahealth.ai 的官网，作为下游消费产品的引导）
- `navbar.links[0].href` `https://github.com/thetahealth/mirobody/issues` — 保留不动（GitHub org name）
- `footer.socials.*` — 保留不动

**仅修改 `"name"` 一处。**

- [ ] **Step 4: 本地预览验证**

```bash
cd /Users/admin/Desktop/development/mirobody-health-docs && mint dev
```

打开 http://localhost:3000，左上角 logo 旁文字应显示 "Mirobody"。

- [ ] **Step 5: Commit**

```bash
git add docs.json
git commit -m "$(cat <<'EOF'
docs(brand): rename site name from "Theta Health" to "Mirobody"

Mirobody is the canonical product brand; Theta Health remains as the
downstream consumer product (kept in the Anchors). Logo / colors stay
the same — only the textual brand changes.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: 在 docs.json 里挂出 Cloud + Trust & Compliance 两个 tab（占位页）

**Files:**
- Modify: `docs.json`
- Create: 22 个 stub MDX 文件（en+zh），每个文件只有 frontmatter + 一句 "Content coming in Task N"

**目的：让 `mint dev` 渲染出新 tab 结构，验证 IA。** 实际内容在后续任务填。

- [ ] **Step 1: 在 docs.json 的 en 语言 tabs 数组末尾追加两个 tab**

打开 `docs.json`，定位到 en 语言的 `tabs` 数组（包含 Documentation / API Reference / Development 三个 tab）。

在 `Development` tab 之后追加：

```json
{
  "tab": "Cloud",
  "groups": [
    {
      "group": "Getting Started",
      "pages": [
        "en/cloud/quickstart"
      ]
    },
    {
      "group": "Regions",
      "pages": [
        "en/cloud/regions/overview",
        "en/cloud/regions/china",
        "en/cloud/regions/global"
      ]
    },
    {
      "group": "Bring Your Own LLM Key",
      "pages": [
        "en/cloud/byok/index",
        "en/cloud/byok/dashscope",
        "en/cloud/byok/volcengine",
        "en/cloud/byok/openai",
        "en/cloud/byok/gemini"
      ]
    },
    {
      "group": "Integration",
      "pages": [
        "en/cloud/sdk-examples",
        "en/cloud/rate-limits"
      ]
    }
  ]
},
{
  "tab": "Trust & Compliance",
  "groups": [
    {
      "group": "Overview",
      "pages": [
        "en/trust/data-residency"
      ]
    },
    {
      "group": "Compliance",
      "pages": [
        "en/trust/china-compliance",
        "en/trust/global-compliance"
      ]
    },
    {
      "group": "Security",
      "pages": [
        "en/trust/encryption",
        "en/trust/subprocessors",
        "en/trust/security-practices"
      ]
    }
  ]
}
```

- [ ] **Step 2: 在 zh 语言 tabs 数组里追加同结构（仅 tab/group 中文化）**

```json
{
  "tab": "Cloud",
  "groups": [
    {
      "group": "快速开始",
      "pages": [
        "zh/cloud/quickstart"
      ]
    },
    {
      "group": "数据区域",
      "pages": [
        "zh/cloud/regions/overview",
        "zh/cloud/regions/china",
        "zh/cloud/regions/global"
      ]
    },
    {
      "group": "BYOK（自带 LLM Key）",
      "pages": [
        "zh/cloud/byok/index",
        "zh/cloud/byok/dashscope",
        "zh/cloud/byok/volcengine",
        "zh/cloud/byok/openai",
        "zh/cloud/byok/gemini"
      ]
    },
    {
      "group": "接入",
      "pages": [
        "zh/cloud/sdk-examples",
        "zh/cloud/rate-limits"
      ]
    }
  ]
},
{
  "tab": "信任与合规",
  "groups": [
    {
      "group": "概览",
      "pages": [
        "zh/trust/data-residency"
      ]
    },
    {
      "group": "合规",
      "pages": [
        "zh/trust/china-compliance",
        "zh/trust/global-compliance"
      ]
    },
    {
      "group": "安全",
      "pages": [
        "zh/trust/encryption",
        "zh/trust/subprocessors",
        "zh/trust/security-practices"
      ]
    }
  ]
}
```

- [ ] **Step 3: 创建 stub 文件**

用一个 bash 循环生成 22 个 stub MDX 文件，每个文件内容统一：

```mdx
---
title: "<标题>"
description: "<副标题>"
---

> Coming soon. 详细内容将在后续任务中填充。
```

逐个创建（不要批量 sed，因为每个文件的 title/description 都不同；以下提供完整脚本）：

```bash
cd /Users/admin/Desktop/development/mirobody-health-docs

# 准备目录
mkdir -p en/cloud/regions en/cloud/byok en/trust
mkdir -p zh/cloud/regions zh/cloud/byok zh/trust

# 用一个 Python 脚本批量创建 stubs（避免 heredoc 错位）
python3 << 'PYEOF'
import os

PAGES = [
    # (relpath, en_title, en_desc, zh_title, zh_desc)
    ("cloud/quickstart",             "Quickstart",             "Hit the Mirobody API in 5 minutes",            "快速开始",       "5 分钟内跑通 Mirobody 第一次调用"),
    ("cloud/regions/overview",       "Regions Overview",       "Pick the cluster that matches your users",     "数据区域总览",   "按用户地域选择对应集群"),
    ("cloud/regions/china",          "China Cluster",          "test-mcp.thetahealth.cn — Live",               "中国集群",       "test-mcp.thetahealth.cn — 已上线"),
    ("cloud/regions/global",         "Global Cluster",         "*.thetahealth.ai — Coming Soon",               "海外集群",       "*.thetahealth.ai — 上线中"),
    ("cloud/byok/index",             "Bring Your Own LLM Key", "Header-based BYOK protocol",                   "BYOK 协议",      "通过 Header 自带 LLM Key"),
    ("cloud/byok/dashscope",         "Configure DashScope",    "Use 阿里 DashScope as the LLM provider",       "配置 DashScope", "用阿里 DashScope 作为 LLM 提供方"),
    ("cloud/byok/volcengine",        "Configure Volcengine",   "Use 火山引擎 as the LLM provider",             "配置火山引擎",   "用火山引擎作为 LLM 提供方"),
    ("cloud/byok/openai",            "Configure OpenAI",       "Use OpenAI as the LLM provider (global only)", "配置 OpenAI",    "用 OpenAI 作为 LLM 提供方（仅海外）"),
    ("cloud/byok/gemini",            "Configure Gemini",       "Use Google Gemini (global only)",              "配置 Gemini",    "用 Google Gemini（仅海外）"),
    ("cloud/sdk-examples",           "SDK Examples",           "curl / Python / Node.js",                      "SDK 示例",       "curl / Python / Node.js"),
    ("cloud/rate-limits",            "Rate Limits",            "How API quotas work",                          "限流",           "API 配额机制"),

    ("trust/data-residency",         "Data Residency",         "Where your users' data lives",                 "数据驻留",       "用户数据存储在哪里"),
    ("trust/china-compliance",       "China Compliance",       "PIPL / 数据安全法 / 网络安全法",                "中国合规",       "PIPL / 数据安全法 / 网络安全法"),
    ("trust/global-compliance",      "Global Compliance",      "HIPAA / GDPR — Coming Soon",                   "海外合规",       "HIPAA / GDPR — 上线中"),
    ("trust/encryption",             "Encryption",             "TLS, at-rest, and field-level encryption",     "加密",           "TLS、静态加密、字段级加密"),
    ("trust/subprocessors",          "Subprocessors",          "Third parties that process customer data",     "子处理方",       "处理用户数据的第三方"),
    ("trust/security-practices",     "Security Practices",     "Auth, key handling, log sanitization",         "安全实践",       "鉴权、密钥处理、日志脱敏"),
]

STUB_EN = '---\ntitle: "{title}"\ndescription: "{desc}"\n---\n\n> Coming soon. 详细内容将在后续任务中填充。\n'
STUB_ZH = '---\ntitle: "{title}"\ndescription: "{desc}"\n---\n\n> 内容即将上线，后续任务会填充。\n'

for relpath, en_t, en_d, zh_t, zh_d in PAGES:
    en_path = f"en/{relpath}.mdx"
    zh_path = f"zh/{relpath}.mdx"
    os.makedirs(os.path.dirname(en_path), exist_ok=True)
    os.makedirs(os.path.dirname(zh_path), exist_ok=True)
    with open(en_path, "w") as f:
        f.write(STUB_EN.format(title=en_t, desc=en_d))
    with open(zh_path, "w") as f:
        f.write(STUB_ZH.format(title=zh_t, desc=zh_d))
    print(f"created {en_path}, {zh_path}")

print("done")
PYEOF
```

- [ ] **Step 4: 本地预览验证**

```bash
mint dev
```

打开浏览器，应该能看到顶部多了 `Cloud` 和 `Trust & Compliance` 两个 tab，点进去左侧 sidebar 能看到所有 stub 页，每页显示 "Coming soon"。
切到 `zh` 语言，对应中文 tab `Cloud` / `信任与合规` 也存在。

- [ ] **Step 5: Commit**

```bash
git add docs.json en/cloud/ en/trust/ zh/cloud/ zh/trust/
git commit -m "$(cat <<'EOF'
docs(ia): add Cloud and Trust & Compliance tabs with stub pages

Adds 22 stub MDX pages (en+zh) and registers them in docs.json under
two new tabs. Content will be filled in subsequent tasks. This commit
makes the new IA visible in mint dev for early visual validation.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: 填充 Trust & Compliance 内容（6 页 × 2 语言）

**Files:**
- Overwrite: `en/trust/data-residency.mdx`, `en/trust/china-compliance.mdx`, `en/trust/global-compliance.mdx`, `en/trust/encryption.mdx`, `en/trust/subprocessors.mdx`, `en/trust/security-practices.mdx`
- Overwrite: `zh/trust/*` 对应 6 个文件

**内容来源**：spec §3.3 Trust & Compliance 一节，加上从 backend 代码实测到的事实（`AliyunStorage` / `FernetEncrypter` / 杭州区域 / qwen3-asr 等）。

- [ ] **Step 1: 写 `zh/trust/data-residency.mdx`**

```mdx
---
title: "数据驻留总览"
description: "您的用户数据存储在哪里取决于您使用的集群"
---

Mirobody Platform 提供**多区域部署**，每个集群的所有用户数据（账号、文件、健康指标、日记、对话历史）只存储于该集群所在的法域内，**绝不跨境复制**。

| 集群 | Base URL | 数据存储 | 区域 | 状态 |
| --- | --- | --- | --- | --- |
| 🇨🇳 中国 | `mcp.thetahealth.cn` | 阿里云 OSS + Postgres | 中国大陆（杭州） | ✅ 已上线 |
| 🌐 海外 | `mcp.thetahealth.ai` | AWS S3 + Postgres | 美国（us-east） | 🚧 上线中 |

接入合作伙伴在与 Mirobody 签约时即明确数据驻留集群，无法动态切换。

## 集群差异速查

- **中国集群**：LLM provider 限 DashScope（阿里）/ 火山引擎 / 自有出境 OpenAI（不保证性能）。ASR 走阿里 DashScope。文件存储于阿里云 OSS 杭州可用区。
- **海外集群**（即将上线）：LLM 默认 OpenAI / Gemini / Anthropic。文件存储 AWS S3。

详细合规说明请见 [China Compliance](/zh/trust/china-compliance) 与 [Global Compliance](/zh/trust/global-compliance)。
```

- [ ] **Step 2: 写 `en/trust/data-residency.mdx`**（英文版同结构）

```mdx
---
title: "Data Residency"
description: "Where your users' data lives — by cluster"
---

Mirobody Platform offers **multi-region deployments**. Within each cluster, all user data (accounts, files, health indicators, journals, chat history) stays within that cluster's legal jurisdiction. **No cross-border replication.**

| Cluster | Base URL | Storage | Region | Status |
| --- | --- | --- | --- | --- |
| 🇨🇳 China  | `mcp.thetahealth.cn` | Aliyun OSS + Postgres | Mainland China (Hangzhou) | ✅ Live |
| 🌐 Global | `mcp.thetahealth.ai` | AWS S3 + Postgres      | US (us-east)              | 🚧 Coming Soon |

Cluster selection is set at partner contract time and cannot be switched dynamically.

## Cluster differences at a glance

- **China cluster**: LLM provider limited to DashScope (Aliyun) / Volcengine / your own proxied OpenAI (no SLA). ASR uses Aliyun DashScope. Files stored on Aliyun OSS Hangzhou.
- **Global cluster** (coming soon): default LLM = OpenAI / Gemini / Anthropic. Files on AWS S3.

See [China Compliance](/en/trust/china-compliance) and [Global Compliance](/en/trust/global-compliance) for details.
```

- [ ] **Step 3: 写 `zh/trust/china-compliance.mdx`**

```mdx
---
title: "中国合规"
description: "数据 100% 存储于中国境内，严格遵守国内法规"
---

Mirobody 国内集群（`*.thetahealth.cn`）严格按照中华人民共和国相关法律法规设计，关键要点：

## 法律框架

- **《个人信息保护法》（PIPL）** — 处理个人信息有明确目的、最小必要原则、用户可撤回授权。
- **《数据安全法》** — 数据分级分类管理；健康数据归入重要数据保护范畴。
- **《网络安全法》** — 关键信息基础设施安全保护；日志留存。

## 数据存储

- **物理位置**：阿里云华东 1 / 华东 2（杭州）可用区。
- **不出境**：所有持久化数据（Postgres、OSS、Redis）均在境内。
- **传输**：所有 API 调用 / WebSocket 强制 HTTPS / WSS。

## 用户权利

- 用户可通过 `POST /user/del` 注销账号，触发数据软删除。
- 用户健康档案、日记、文件、对话历史均可通过相关查询 API 自行导出。

## 健康数据特殊处理

- 敏感字段（如健康指标 `comment`、文件 `original_name`）使用 [Fernet 加密](/zh/trust/encryption) 后入库。
- LLM 调用走 [BYOK 协议](/zh/cloud/byok/index)，合作伙伴的 LLM Key **不入库、不入日志**。

> 如需获取 Mirobody 中国集群的完整合规问卷或安全白皮书，请联系商务对接人。
```

- [ ] **Step 4: 写 `en/trust/china-compliance.mdx`**

```mdx
---
title: "China Compliance"
description: "Data stays in China; full alignment with local regulations"
---

The Mirobody China cluster (`*.thetahealth.cn`) is designed to align with the People's Republic of China's regulatory framework. Highlights:

## Legal framework

- **PIPL (Personal Information Protection Law)** — explicit purpose, minimum-necessary collection, revocable consent.
- **Data Security Law** — tiered data classification; health data is treated as "important data".
- **Cybersecurity Law** — critical infrastructure protection; mandatory audit logs.

## Data storage

- **Physical location**: Aliyun East China 1 / East China 2 (Hangzhou) zones.
- **No cross-border transfer**: all persistent data (Postgres, OSS, Redis) is kept within mainland China.
- **In transit**: HTTPS / WSS enforced on all API and WebSocket traffic.

## User rights

- Account deletion via `POST /user/del` triggers soft-delete.
- Health profile, journal, files, and chat history are all exportable through the corresponding query APIs.

## Health data handling

- Sensitive fields (e.g. health-indicator `comment`, file `original_name`) are stored encrypted via [Fernet field-level encryption](/en/trust/encryption).
- LLM calls follow the [BYOK protocol](/en/cloud/byok/index) — partner LLM keys are **never persisted, never logged**.

> For the full compliance questionnaire or security whitepaper, contact your Mirobody account manager.
```

- [ ] **Step 5: 写 `zh/trust/global-compliance.mdx`** 和 **`en/trust/global-compliance.mdx`**

```mdx
---
title: "海外合规"
description: "HIPAA / GDPR — 上线中"
---

import { Note } from '/snippets/...'

> 🚧 **海外集群正在筹备中**，本页内容为规划占位。

## 计划框架

- **HIPAA** — 面向美国市场，签订 BAA 协议。
- **GDPR** — 面向欧盟用户，数据主体权利、DPO 联系点等。
- **SOC 2 Type II** — 安全控制审计（计划中）。

## 数据存储

- **物理位置**：AWS us-east（弗吉尼亚）。
- **加密 / 审计 / 子处理方**等内容与 [China Compliance](/zh/trust/china-compliance) 同框架，区域不同。

具体上线时间请关注 Mirobody 官方公告或与商务对接人确认。
```

英文版结构相同，把表述改为英文，去掉 import 行：

```mdx
---
title: "Global Compliance"
description: "HIPAA / GDPR — Coming Soon"
---

> 🚧 **The global cluster is in preparation.** This page is a placeholder.

## Planned framework

- **HIPAA** — for the US market, BAA available.
- **GDPR** — for EU users, including data-subject rights and DPO contact.
- **SOC 2 Type II** — security controls audit (planned).

## Storage

- **Physical location**: AWS us-east (Virginia).
- **Encryption / Audit / Subprocessors** — same framework as the [China Compliance](/en/trust/china-compliance) page, different region.

For go-live timing, watch Mirobody announcements or contact your Mirobody account manager.
```

注意：**移除 stub 文件里那行 `import { Note } from '/snippets/...'`**——是上面提示文字中误带，真实写入时 MDX 文件**不要写 import**，Mintlify 自动提供组件。

- [ ] **Step 6: 写 `zh/trust/encryption.mdx`**

```mdx
---
title: "加密"
description: "传输、静态存储、字段级三层加密"
---

Mirobody 在数据生命周期三个阶段均启用加密：

## 1. 传输加密（in transit）

- 所有 HTTP API 强制 HTTPS（TLS 1.2+）。
- 所有 WebSocket 强制 WSS。
- 服务端不接受非加密连接，HTTP `80` 端口跳转 `443`。

## 2. 静态加密（at rest）

- **阿里云 OSS server-side encryption** — 默认 AES-256，对所有上传文件透明加密。
- **阿里云 RDS Postgres** — 实例级 TDE（透明数据加密）启用。
- **Redis** — 仅用于会话缓存与限流计数；不存储健康数据原文。

## 3. 字段级加密（field-level）

部分敏感字段在入库前用 **Fernet（AES-128-CBC + HMAC-SHA256）** 加密：

- 健康指标的 `comment`（可能含原始检测描述）
- 文件元数据中的 `original_name`（可能暴露用户身份）
- 日记导出 / 备份格式中的隐私字段

加密密钥由部署方持有，**Mirobody 服务端进程不持久化密钥明文**。

## BYOK LLM Key 的处理

合作伙伴通过 `X-LLM-Api-Key` header 传入的 LLM 凭证：

- **不入库**
- **不入日志**（中间件入口处即在 header 副本中清除）
- 仅在内存中传递到上游 LLM 客户端，请求结束即丢弃
```

- [ ] **Step 7: 写 `en/trust/encryption.mdx`**（结构相同，英文）

```mdx
---
title: "Encryption"
description: "TLS in transit, server-side at rest, and field-level for sensitive columns"
---

Mirobody encrypts data across three lifecycle stages:

## 1. In transit

- All HTTP APIs enforce HTTPS (TLS 1.2+).
- All WebSockets enforce WSS.
- Port 80 redirects to 443; plaintext connections are refused.

## 2. At rest

- **Aliyun OSS server-side encryption** — AES-256 by default, transparent across all uploaded files.
- **Aliyun RDS Postgres** — instance-level TDE (Transparent Data Encryption) enabled.
- **Redis** — used only for session cache and rate-limit counters; no PHI is stored.

## 3. Field-level

A subset of sensitive columns is encrypted with **Fernet (AES-128-CBC + HMAC-SHA256)** before write:

- Health-indicator `comment` (may contain raw lab descriptions)
- File metadata `original_name` (may reveal user identity)
- Privacy fields in journal export / backup formats

Keys are held by the deployment operator; the Mirobody runtime **never persists plaintext keys**.

## How BYOK LLM keys are handled

When a partner sends `X-LLM-Api-Key`:

- **Never persisted** (no DB row).
- **Never logged** (middleware scrubs it from request log copies at ingress).
- Passes only in-memory to the upstream LLM client; discarded at request end.
```

- [ ] **Step 8: 写 `zh/trust/subprocessors.mdx`**

```mdx
---
title: "子处理方"
description: "处理客户数据的第三方"
---

中国集群（`*.thetahealth.cn`）当前涉及以下子处理方：

| 子处理方 | 用途 | 数据类型 | 地理位置 |
| --- | --- | --- | --- |
| 阿里云 OSS | 文件存储 | 用户上传的报告、图片、音频 | 中国杭州 |
| 阿里云 RDS | 数据库 | 账号、健康指标、日记、对话历史 | 中国杭州 |
| 阿里云 Redis | 缓存 / 限流 | 会话临时缓存（不含 PHI） | 中国杭州 |
| 阿里云 DashScope | ASR / 默认 LLM provider | 客户上传的语音文件 / 对话内容 | 中国境内 |

## BYOK 模式下的额外提示

如合作伙伴通过 [BYOK](/zh/cloud/byok/index) 接入第三方 LLM（如 OpenAI / 火山引擎 / 自有模型），该 LLM 提供方即为合作伙伴的子处理方，合作伙伴需自行与该 LLM 提供方签订数据处理协议。Mirobody **不代为承担**对外部 LLM 提供方的合规责任。

> 子处理方清单更新会提前 30 天通过商务对接人通知合作伙伴。
```

- [ ] **Step 9: 写 `en/trust/subprocessors.mdx`**（英文同结构）

```mdx
---
title: "Subprocessors"
description: "Third parties that may process customer data"
---

The China cluster (`*.thetahealth.cn`) currently uses:

| Subprocessor | Purpose | Data | Location |
| --- | --- | --- | --- |
| Aliyun OSS       | File storage           | User-uploaded reports, images, audio | Hangzhou, China |
| Aliyun RDS       | Database               | Accounts, health indicators, journals, chat history | Hangzhou, China |
| Aliyun Redis     | Cache / rate limiting  | Session cache (no PHI) | Hangzhou, China |
| Aliyun DashScope | ASR / default LLM      | User-uploaded audio / chat content | Mainland China |

## BYOK note

If a partner brings their own LLM provider (e.g. OpenAI / Volcengine) via [BYOK](/en/cloud/byok/index), that provider becomes the **partner's** subprocessor. The partner is responsible for the data-processing agreement with that provider. Mirobody does **not** assume compliance responsibility for partner-chosen LLM providers.

> Subprocessor list changes are communicated to partners 30 days in advance via their account manager.
```

- [ ] **Step 10: 写 `zh/trust/security-practices.mdx`**

```mdx
---
title: "安全实践"
description: "鉴权、密钥处理、日志脱敏"
---

## 鉴权

- 所有受保护接口走 JWT Bearer Token；token 默认 30 天有效，支持 refresh_token 续期 60 天。
- WebSocket 因 Header 限制走 query token，仅 WSS 暴露。
- 邮箱码登录 60 秒限流，避免暴力。

## 密钥处理

- 合作伙伴通过 [BYOK header](/zh/cloud/byok/index) 传入的 LLM Key **不入库、不入日志**。
- Mirobody 自有的 LLM Key（如有，作为兜底 fallback）通过环境变量注入，仅运行时进程可见。

## 日志脱敏

- Access log 中间件入口处剔除 `X-LLM-*` header。
- 错误日志中如出现 401 from upstream LLM，日志中**只记录 "LLM auth failed"，不携带 key 片段**。
- 错误堆栈对 PHI 字段做 mask（`****` 表示）。

## 漏洞响应

发现安全漏洞请通过 `security@thetahealth.ai`（PGP 公钥可索取）报告。

## 第三方审计

- HIPAA 第三方审计（Vanta 已对接，状态：进行中）
- SOC 2 Type II（规划中，上线后更新此节）
```

- [ ] **Step 11: 写 `en/trust/security-practices.mdx`**

```mdx
---
title: "Security Practices"
description: "Auth, secret handling, log sanitization"
---

## Authentication

- All protected endpoints use JWT Bearer tokens; default access token TTL 30 days, with refresh_token (60 days) renewal.
- WebSockets use a query-string token (since browsers cannot set headers on WebSocket connections); only WSS is exposed.
- `/email/login` is rate-limited (60s between sends per email) to prevent abuse.

## Secret handling

- Partner-supplied LLM keys (via [BYOK](/en/cloud/byok/index)) are **never persisted and never logged**.
- Mirobody's own fallback LLM keys (when configured) are injected via environment variables; visible only to the runtime process.

## Log sanitization

- Access-log middleware strips `X-LLM-*` headers at ingress.
- When an upstream LLM returns 401, the log records "LLM auth failed" — the key itself is **never** included.
- PHI fields are masked (`****`) in stack traces.

## Vulnerability reporting

Report security issues to `security@thetahealth.ai` (PGP key on request).

## Third-party audits

- HIPAA — Vanta-managed audit (in progress).
- SOC 2 Type II — planned (updated here on go-live).
```

- [ ] **Step 12: mint dev 验证 6 个 trust 页都能渲染（en+zh 共 12 个 URL）**

```bash
mint dev
```

逐个点开：
- /en/trust/data-residency, /en/trust/china-compliance, /en/trust/global-compliance, /en/trust/encryption, /en/trust/subprocessors, /en/trust/security-practices
- /zh/... 对称

确认无 broken link 红字、无 MDX 编译报错。

- [ ] **Step 13: Commit**

```bash
git add en/trust/ zh/trust/
git commit -m "$(cat <<'EOF'
docs(trust): fill Trust & Compliance content for CN cluster

Adds Data Residency, China/Global Compliance, Encryption, Subprocessors,
and Security Practices pages (en+zh). China cluster is fully documented;
Global cluster pages are explicit "Coming Soon" placeholders.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: 填充 Cloud / Quickstart + Regions（4 页 × 2）

**Files:**
- Overwrite: `en/cloud/quickstart.mdx`, `en/cloud/regions/overview.mdx`, `en/cloud/regions/china.mdx`, `en/cloud/regions/global.mdx`
- Overwrite: `zh/cloud/*` 对称

- [ ] **Step 1: 写 `zh/cloud/quickstart.mdx`**

```mdx
---
title: "5 分钟跑通 Mirobody"
description: "登录拿 token，发起第一次对话"
---

本页带你 5 分钟内完成 Mirobody Platform 的首次调用。需要你已经有一个由商务侧分配的邮箱账号，或使用[测试演示账号](#测试账号)。

## 1. 拿 token

```bash
curl -X POST https://test-mcp.thetahealth.cn/email/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com"}'
```

```bash
curl -X POST https://test-mcp.thetahealth.cn/email/verify \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","code":"000000"}'
```

返回 `data.access_token` 即为 30 天有效的 JWT。

## 2. 准备 LLM Key（BYOK）

国内集群推荐 [阿里 DashScope](/zh/cloud/byok/dashscope) 或 [火山引擎](/zh/cloud/byok/volcengine)。注册并拿到 API Key。

## 3. 发起第一次对话

```bash
TOKEN="<上一步拿到的 access_token>"
LLM_KEY="<您 DashScope 的 API Key>"

curl -N -X POST https://test-mcp.thetahealth.cn/api/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-LLM-Provider: dashscope" \
  -H "X-LLM-Api-Key: $LLM_KEY" \
  -H "Content-Type: application/json" \
  -d '{"question":"你好","agent":"App","provider":"DeepSeekFlash"}'
```

返回 SSE 流，逐行 `data: {...}` —— 包含 `id` / `reply` / `costStatistics` / `end` 等事件，详见 [Chat API](/zh/api-reference/chat/chat)。

## 测试账号

国内 test 环境内置 1000 个演示账号 `user0@demo` … `user999@demo`，验证码恒为 `000000`，**无需等真实邮件**。生产环境必须用真实邮箱。

## 下一步

- 完整接口列表：[API Reference](/zh/api-reference/overview)
- 自带 LLM Key 详解：[BYOK 协议](/zh/cloud/byok/index)
- 数据合规：[Trust & Compliance](/zh/trust/data-residency)
```

- [ ] **Step 2: 写 `en/cloud/quickstart.mdx`**（英文同结构，把演示账号一句调整为说明只在 test 启用）

```mdx
---
title: "Quickstart"
description: "Hit Mirobody's first API in 5 minutes"
---

This page walks you through your first Mirobody Platform API call in 5 minutes. You need either a partner-assigned email or use the [demo accounts](#demo-accounts) on the test environment.

## 1. Get a token

```bash
curl -X POST https://test-mcp.thetahealth.cn/email/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com"}'
```

```bash
curl -X POST https://test-mcp.thetahealth.cn/email/verify \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","code":"000000"}'
```

The response's `data.access_token` is a JWT valid for 30 days.

## 2. Prepare an LLM key (BYOK)

For the China cluster we recommend [Aliyun DashScope](/en/cloud/byok/dashscope) or [Volcengine](/en/cloud/byok/volcengine). Sign up and grab an API key.

## 3. Make your first call

```bash
TOKEN="<the access_token from step 1>"
LLM_KEY="<your DashScope API key>"

curl -N -X POST https://test-mcp.thetahealth.cn/api/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-LLM-Provider: dashscope" \
  -H "X-LLM-Api-Key: $LLM_KEY" \
  -H "Content-Type: application/json" \
  -d '{"question":"Hello","agent":"App","provider":"DeepSeekFlash"}'
```

You'll get an SSE stream of `data: {...}` lines — `id` / `reply` / `costStatistics` / `end`. See [Chat API](/en/api-reference/chat/chat) for full event reference.

## Demo accounts

The China test environment ships with 1000 demo accounts `user0@demo` … `user999@demo`, code always `000000` — no real email delivery needed. Production requires real email addresses.

## Next steps

- Full endpoint list: [API Reference](/en/api-reference/overview)
- BYOK protocol details: [Bring Your Own LLM Key](/en/cloud/byok/index)
- Data compliance: [Trust & Compliance](/en/trust/data-residency)
```

- [ ] **Step 3: 写 `zh/cloud/regions/overview.mdx`**

```mdx
---
title: "数据区域总览"
description: "按用户地域选对集群"
---

Mirobody 提供两个集群，**数据不跨境**：

| 集群 | Base URL（test） | Base URL（prod） | 存储 | 状态 |
| --- | --- | --- | --- | --- |
| [🇨🇳 中国](/zh/cloud/regions/china) | `test-mcp.thetahealth.cn` | `mcp.thetahealth.cn` | 阿里云（杭州） | ✅ 已上线 |
| [🌐 海外](/zh/cloud/regions/global) | `test-mcp.thetahealth.ai` | `mcp.thetahealth.ai` | AWS（us-east） | 🚧 上线中 |

集群在签约时即确定，**无法**在运行时切换。详细合规说明见 [Trust & Compliance](/zh/trust/data-residency)。
```

- [ ] **Step 4: 写 `en/cloud/regions/overview.mdx`**

```mdx
---
title: "Regions Overview"
description: "Pick the cluster that matches your users"
---

Mirobody offers two clusters with **no cross-border data flow**:

| Cluster | Base URL (test) | Base URL (prod) | Storage | Status |
| --- | --- | --- | --- | --- |
| [🇨🇳 China](/en/cloud/regions/china)  | `test-mcp.thetahealth.cn` | `mcp.thetahealth.cn` | Aliyun (Hangzhou) | ✅ Live |
| [🌐 Global](/en/cloud/regions/global) | `test-mcp.thetahealth.ai` | `mcp.thetahealth.ai` | AWS (us-east)     | 🚧 Coming Soon |

Cluster is fixed at contract time; **runtime switching is not supported**. See [Trust & Compliance](/en/trust/data-residency) for details.
```

- [ ] **Step 5: 写 `zh/cloud/regions/china.mdx`**

```mdx
---
title: "中国集群"
description: "test-mcp.thetahealth.cn ｜ 已上线"
---

国内集群是 Mirobody Platform 当前的主要部署，全部数据存储于中国大陆。

## Base URL

| 环境 | URL |
| --- | --- |
| 测试 | `https://test-mcp.thetahealth.cn` |
| 生产 | `https://mcp.thetahealth.cn` |

## 关键能力

- 全部 [API Reference](/zh/api-reference/overview) 列出的 REST 接口与 WebSocket。
- LLM provider：`DeepSeekFlash` / `DeepSeekPro` / `kimi` / `minimax` / `豆包`（通过 [BYOK](/zh/cloud/byok/index) 自带 key）。
- ASR：阿里 DashScope `qwen3-asr-flash-filetrans`。
- 存储：阿里云 OSS（杭州），CDN 域 `prod-holywell-file.thetahealth.cn`。

## 合规

- 数据 100% 存储于中国大陆。
- 符合 PIPL / 数据安全法 / 网络安全法，详见 [China Compliance](/zh/trust/china-compliance)。

## 已知限制

- 未启用 `tool-*` / `user-get_events` / `user-get_food_records` / `user-list_medications` / `user-get_medication_details` 工具（Agent 不会调用）。
- `/api/history` 当前不分页，单次返回全部 summary —— 客户端自行截断。
```

- [ ] **Step 6: 写 `en/cloud/regions/china.mdx`**

```mdx
---
title: "China Cluster"
description: "test-mcp.thetahealth.cn — Live"
---

The China cluster is Mirobody Platform's primary live deployment. All data stays within mainland China.

## Base URL

| Environment | URL |
| --- | --- |
| Test       | `https://test-mcp.thetahealth.cn` |
| Production | `https://mcp.thetahealth.cn` |

## Capabilities

- Full set of [API Reference](/en/api-reference/overview) REST endpoints and WebSockets.
- LLM providers: `DeepSeekFlash` / `DeepSeekPro` / `kimi` / `minimax` / `豆包` — bring your own key via [BYOK](/en/cloud/byok/index).
- ASR: Aliyun DashScope `qwen3-asr-flash-filetrans`.
- Storage: Aliyun OSS (Hangzhou), CDN domain `prod-holywell-file.thetahealth.cn`.

## Compliance

- 100% of data stored inside mainland China.
- Aligned with PIPL / Data Security Law / Cybersecurity Law — see [China Compliance](/en/trust/china-compliance).

## Known limitations

- The following tools are disabled and **will not** be called by the Agent: `tool-*`, `user-get_events`, `user-get_food_records`, `user-list_medications`, `user-get_medication_details`.
- `/api/history` does not paginate yet — clients should truncate locally.
```

- [ ] **Step 7: 写 `zh/cloud/regions/global.mdx`**

```mdx
---
title: "海外集群"
description: "*.thetahealth.ai — 上线中"
---

> 🚧 **海外集群正在筹备中**，本页内容为规划占位。

## 计划

- **Base URL（test）**：`test-mcp.thetahealth.ai`
- **Base URL（prod）**：`mcp.thetahealth.ai`
- **存储**：AWS S3 + RDS（us-east）
- **LLM provider**：OpenAI / Gemini / Anthropic
- **ASR**：待定

## 与国内集群的差异

- 数据存储于美国境内，不跨境。
- 合规框架：HIPAA + GDPR（计划，详见 [Global Compliance](/zh/trust/global-compliance)）。
- 默认启用 OpenAI / Gemini tools；不需要 BYOK header 调用 OpenAI / Gemini 时也支持。

具体上线时间请关注 Mirobody 官方公告或与商务对接人确认。
```

- [ ] **Step 8: 写 `en/cloud/regions/global.mdx`**

```mdx
---
title: "Global Cluster"
description: "*.thetahealth.ai — Coming Soon"
---

> 🚧 **The global cluster is in preparation.** This page is a placeholder.

## Plan

- **Base URL (test)**: `test-mcp.thetahealth.ai`
- **Base URL (prod)**: `mcp.thetahealth.ai`
- **Storage**: AWS S3 + RDS (us-east)
- **LLM providers**: OpenAI / Gemini / Anthropic
- **ASR**: TBD

## Differences from the China cluster

- Data stored in the US, no cross-border replication.
- Compliance framework: HIPAA + GDPR (planned — see [Global Compliance](/en/trust/global-compliance)).
- OpenAI / Gemini tools enabled by default.

For go-live timing, watch the Mirobody announcements or contact your Mirobody account manager.
```

- [ ] **Step 9: mint dev 验证 4 页都能渲染（en+zh 共 8 个 URL）**

```bash
mint dev
```

逐个点击：
- /zh/cloud/quickstart, /zh/cloud/regions/{overview,china,global}
- /en/cloud/quickstart, /en/cloud/regions/{overview,china,global}

- [ ] **Step 10: Commit**

```bash
git add en/cloud/quickstart.mdx en/cloud/regions/ zh/cloud/quickstart.mdx zh/cloud/regions/
git commit -m "$(cat <<'EOF'
docs(cloud): fill Quickstart and Regions content (CN live, Global placeholder)

5-minute quickstart walks through email login → BYOK → first chat.
Regions overview + China cluster page documents the live deployment;
Global cluster page is an explicit placeholder.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: 填充 Cloud / BYOK 全套（5 页 × 2）

**Files:**
- Overwrite: `en/cloud/byok/{index,dashscope,volcengine,openai,gemini}.mdx`
- Overwrite: `zh/cloud/byok/*` 对称

**核心：BYOK 协议总览页（index）+ 4 个 provider 配置详解。**

- [ ] **Step 1: 写 `zh/cloud/byok/index.mdx`**

```mdx
---
title: "Bring Your Own LLM Key"
description: "通过 Header 自带 LLM 凭证，零持久化"
---

Mirobody Platform 不卖 LLM token，**LLM 算力由您自带**。本页定义 BYOK 协议。

## 协议

### REST 接口

只有 [需要 LLM 的接口](#哪些接口需要-byok-header) 才要求 BYOK header；其他接口仍只需 `Authorization`。

```text
Authorization:   Bearer <mirobody_access_token>     # 必填：用户身份
X-LLM-Provider:  openai | gemini | dashscope | volcengine
X-LLM-Api-Key:   <您在 LLM 厂商的官方 key>
X-LLM-Base-Url:  <可选；自有相对网关>
```

### WebSocket

浏览器无法在 WebSocket 上设置 Header，统一改用 query：

```text
wss://test-mcp.thetahealth.cn/ws/upload-health-report?token=<at>&llm_provider=dashscope&llm_api_key=<...>
```

### 安全承诺

- **永不持久化**：LLM key 不会写入数据库。
- **永不入日志**：网关中间件入口处即在 header 副本中清除 `X-LLM-*`。
- **请求级隔离**：key 仅在本次请求内存中传递到上游 LLM，请求结束即丢弃。

## 哪些接口需要 BYOK header

| 接口 | LLM 用途 |
| --- | --- |
| `POST /api/chat` | 对话主流程 |
| `POST /api/v1/food/analyze` | 食物图像识别 |
| `POST /api/v1/holywell/journal/create` | 日记 AI 处理 |
| `POST /api/v1/holywell/journal/reprocess` | 重跑日记 AI |
| `POST /api/v1/holywell/journal/update` | 当请求携带新 `text_input` 或 `files` 时 |
| `WS  /ws/upload-health-report` | 报告解析 + 摘要 |
| `WS  /ws/upload-with-llm-analysis` | 一站式 LLM 分析 |
| `POST /api/v1/holywell/file-upload/asr` | ASR（仅 DashScope） |
| `POST /api/v1/holywell/file-upload/asr-task` | 异步 ASR |

其余 REST 接口（鉴权、会话、文件管理、健康指标查询、家庭共享等）**只需 `Authorization`**。

## Provider 选择速查

| Provider | 适用集群 | 推荐场景 |
| --- | --- | --- |
| [DashScope](/zh/cloud/byok/dashscope) | 中国 ✅ | 国内首选，覆盖 DeepSeek / Kimi / 通义 / ASR |
| [火山引擎](/zh/cloud/byok/volcengine) | 中国 ✅ | 国内备选，覆盖豆包 |
| [OpenAI](/zh/cloud/byok/openai) | 海外（上线中） | 国际首选，CN 集群不保证 |
| [Gemini](/zh/cloud/byok/gemini) | 海外（上线中） | 国际备选 |

## 错误码

| 场景 | HTTP | 业务 code | msg |
| --- | --- | --- | --- |
| 缺 `X-LLM-Api-Key` 调 AI 接口 | 400 | -10 | `X-LLM-Api-Key header is required for this endpoint.` |
| 上游 LLM 返回 401 | 200 (SSE) | - | `data: {"type":"error","content":"LLM auth failed: ..."}` |
| 上游 LLM 网络错误 | 200 (SSE) | - | `data: {"type":"error","content":"LLM upstream error: ..."}` |
```

- [ ] **Step 2: 写 `en/cloud/byok/index.mdx`**（英文结构相同）

```mdx
---
title: "Bring Your Own LLM Key"
description: "Pass your LLM credentials via header; zero persistence"
---

Mirobody Platform does not sell LLM tokens — **you bring your own**. This page defines the BYOK protocol.

## Protocol

### REST endpoints

Only the [LLM-dependent endpoints](#which-endpoints-need-byok) require BYOK headers; everything else needs only `Authorization`.

```text
Authorization:   Bearer <mirobody_access_token>     # required: user identity
X-LLM-Provider:  openai | gemini | dashscope | volcengine
X-LLM-Api-Key:   <your official key at the LLM provider>
X-LLM-Base-Url:  <optional; your own relay endpoint>
```

### WebSocket

Browsers cannot set headers on WebSocket connections, so we use query params:

```text
wss://test-mcp.thetahealth.cn/ws/upload-health-report?token=<at>&llm_provider=dashscope&llm_api_key=<...>
```

### Security guarantees

- **Never persisted**: LLM keys are not written to any database.
- **Never logged**: middleware strips `X-LLM-*` headers from log copies at ingress.
- **Per-request isolation**: keys are held only in-memory for the current request and discarded at completion.

## Which endpoints need BYOK

| Endpoint | LLM use |
| --- | --- |
| `POST /api/chat` | Main chat |
| `POST /api/v1/food/analyze` | Food image recognition |
| `POST /api/v1/holywell/journal/create` | Journal AI processing |
| `POST /api/v1/holywell/journal/reprocess` | Re-run journal AI |
| `POST /api/v1/holywell/journal/update` | Only when the body carries new `text_input` or `files` |
| `WS  /ws/upload-health-report` | Report parsing + summary |
| `WS  /ws/upload-with-llm-analysis` | End-to-end LLM analysis |
| `POST /api/v1/holywell/file-upload/asr` | ASR (DashScope only) |
| `POST /api/v1/holywell/file-upload/asr-task` | Async ASR |

All other REST endpoints (auth, sessions, file management, health indicators, family sharing, etc.) need **only `Authorization`**.

## Picking a provider

| Provider | Cluster | When to use |
| --- | --- | --- |
| [DashScope](/en/cloud/byok/dashscope) | China ✅ | China first choice — covers DeepSeek / Kimi / Qwen / ASR |
| [Volcengine](/en/cloud/byok/volcengine) | China ✅ | China alternative — covers Doubao |
| [OpenAI](/en/cloud/byok/openai)         | Global (coming) | International first choice; not guaranteed on the China cluster |
| [Gemini](/en/cloud/byok/gemini)         | Global (coming) | International alternative |

## Errors

| Scenario | HTTP | code | msg |
| --- | --- | --- | --- |
| Missing `X-LLM-Api-Key` on an AI endpoint | 400 | -10 | `X-LLM-Api-Key header is required for this endpoint.` |
| Upstream LLM returns 401 | 200 (SSE) | - | `data: {"type":"error","content":"LLM auth failed: ..."}` |
| Upstream LLM network error | 200 (SSE) | - | `data: {"type":"error","content":"LLM upstream error: ..."}` |
```

- [ ] **Step 3: 写 `zh/cloud/byok/dashscope.mdx`**

```mdx
---
title: "配置 DashScope（阿里）"
description: "国内集群首选 LLM Provider，覆盖 DeepSeek / Kimi / 通义 / ASR"
---

[阿里云 DashScope](https://dashscope.console.aliyun.com/) 是 Mirobody **中国集群** 推荐的 LLM provider，覆盖国内最常用的模型与 ASR。

## 1. 注册并拿 Key

1. 登录 [阿里云控制台](https://dashscope.console.aliyun.com/)。
2. 在 **API-KEY 管理** 创建一个 key，复制保存（仅显示一次）。
3. 在 **计费管理** 确保账号已开通付费（部分模型需要预付费）。

## 2. 在 Mirobody 请求中传入

```bash
curl -N -X POST https://test-mcp.thetahealth.cn/api/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-LLM-Provider: dashscope" \
  -H "X-LLM-Api-Key: sk-xxx-from-dashscope" \
  -H "Content-Type: application/json" \
  -d '{"question":"hi","agent":"App","provider":"DeepSeekFlash"}'
```

## 3. 通过 DashScope 走的模型

通过 DashScope 一把 key 即可调以下 `provider`：

| `provider` | 底层 model |
| --- | --- |
| `DeepSeekFlash` | `deepseek-v4-flash` |
| `DeepSeekPro` | `deepseek-v4-pro` |
| `kimi` | `kimi-k2.6` |
| `minimax` | `MiniMax-M2.7` |

`豆包` 不走 DashScope，请见 [Volcengine](/zh/cloud/byok/volcengine)。

## 4. ASR

所有 ASR 接口（`/api/v1/holywell/file-upload/asr` 及 `asr-task`）固定走 DashScope，请求时必须 `X-LLM-Provider: dashscope`。

## 故障排查

- 上游返回 `InvalidApiKey` → 检查 DashScope 控制台 key 是否启用、是否开通了对应模型。
- 上游返回 `Throttling.User` → DashScope 侧限流，参考阿里云 quota 配置。
- 国内出境网络问题 → DashScope 国内直连，无需 VPN。
```

- [ ] **Step 4: 写 `en/cloud/byok/dashscope.mdx`**（英文同结构）

```mdx
---
title: "Configure DashScope (Aliyun)"
description: "China cluster's recommended LLM provider — covers DeepSeek / Kimi / Qwen / ASR"
---

[Aliyun DashScope](https://dashscope.console.aliyun.com/) is the recommended provider for Mirobody's **China cluster**, covering the most-used domestic models plus ASR.

## 1. Register and get a key

1. Sign in to [Aliyun Console](https://dashscope.console.aliyun.com/).
2. Under **API Keys**, create a new key (shown only once — save it).
3. Under **Billing**, make sure paid usage is enabled (some models require it).

## 2. Use it in Mirobody requests

```bash
curl -N -X POST https://test-mcp.thetahealth.cn/api/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-LLM-Provider: dashscope" \
  -H "X-LLM-Api-Key: sk-xxx-from-dashscope" \
  -H "Content-Type: application/json" \
  -d '{"question":"hi","agent":"App","provider":"DeepSeekFlash"}'
```

## 3. Models available through DashScope

One DashScope key routes to:

| `provider` | Underlying model |
| --- | --- |
| `DeepSeekFlash` | `deepseek-v4-flash` |
| `DeepSeekPro` | `deepseek-v4-pro` |
| `kimi` | `kimi-k2.6` |
| `minimax` | `MiniMax-M2.7` |

`豆包` (Doubao) is **not** on DashScope — see [Volcengine](/en/cloud/byok/volcengine).

## 4. ASR

All ASR endpoints (`/api/v1/holywell/file-upload/asr` and `asr-task`) are fixed on DashScope; requests must include `X-LLM-Provider: dashscope`.

## Troubleshooting

- Upstream `InvalidApiKey` → check the DashScope console: is the key active, is the model enabled.
- Upstream `Throttling.User` → DashScope-side rate limit; tune the quota in Aliyun.
- China cluster connects directly to DashScope; no VPN needed.
```

- [ ] **Step 5: 写 `zh/cloud/byok/volcengine.mdx`**

```mdx
---
title: "配置火山引擎（字节）"
description: "国内集群备选 LLM Provider，覆盖豆包"
---

[火山引擎](https://www.volcengine.com/) 是 Mirobody **中国集群** 的备选 LLM provider，主要用于豆包（Doubao）系列模型。

## 1. 注册并拿 Key

1. 登录 [火山引擎控制台](https://console.volcengine.com/ark)。
2. 在 **方舟 / API Key 管理** 创建 key。
3. 开通"豆包"模型订阅。

## 2. 在 Mirobody 请求中传入

```bash
curl -N -X POST https://test-mcp.thetahealth.cn/api/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-LLM-Provider: volcengine" \
  -H "X-LLM-Api-Key: <你的火山引擎 API Key>" \
  -H "Content-Type: application/json" \
  -d '{"question":"hi","agent":"App","provider":"豆包"}'
```

## 3. 通过火山引擎走的模型

| `provider` | 底层 model |
| --- | --- |
| `豆包` | `doubao-seed-2-0-lite-260428` |

## 故障排查

- `AuthenticationError` → 火山引擎 key 未启用 / 未订阅对应模型。
- 模型超时 → 火山引擎部分模型存在区域限制；详见火山引擎文档。
```

- [ ] **Step 6: 写 `en/cloud/byok/volcengine.mdx`**

```mdx
---
title: "Configure Volcengine (ByteDance)"
description: "China cluster alternative — covers Doubao"
---

[Volcengine](https://www.volcengine.com/) is Mirobody's **China cluster** alternative LLM provider, used mainly for ByteDance's Doubao models.

## 1. Register and get a key

1. Sign in to [Volcengine Console](https://console.volcengine.com/ark).
2. Under **Ark / API Key Management**, create a key.
3. Subscribe to the Doubao model.

## 2. Use it in Mirobody requests

```bash
curl -N -X POST https://test-mcp.thetahealth.cn/api/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-LLM-Provider: volcengine" \
  -H "X-LLM-Api-Key: <your Volcengine API key>" \
  -H "Content-Type: application/json" \
  -d '{"question":"hi","agent":"App","provider":"豆包"}'
```

## 3. Models via Volcengine

| `provider` | Underlying model |
| --- | --- |
| `豆包` | `doubao-seed-2-0-lite-260428` |

## Troubleshooting

- `AuthenticationError` → Volcengine key not active or model not subscribed.
- Timeout → some Volcengine models have regional restrictions; see Volcengine docs.
```

- [ ] **Step 7: 写 `zh/cloud/byok/openai.mdx`**

```mdx
---
title: "配置 OpenAI"
description: "海外集群首选 LLM Provider（中国集群不保证）"
---

OpenAI 是 Mirobody **海外集群** 的默认 LLM provider。

> ⚠️ **中国集群提示**：OpenAI 在中国大陆无直连，需要您自有的合规出境通道；Mirobody 不代为提供网络代理，性能不保证。强烈建议中国集群使用 [DashScope](/zh/cloud/byok/dashscope)。

## 1. 注册并拿 Key

1. 登录 [OpenAI Platform](https://platform.openai.com/api-keys)。
2. 创建一个 secret key（仅显示一次）。

## 2. 在 Mirobody 请求中传入

```bash
curl -N -X POST https://test-mcp.thetahealth.ai/api/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-LLM-Provider: openai" \
  -H "X-LLM-Api-Key: sk-..." \
  -H "Content-Type: application/json" \
  -d '{"question":"hi","agent":"App","provider":"general"}'
```

## 3. 自有 Base URL

如使用 Azure OpenAI 或其他兼容代理：

```text
X-LLM-Base-Url: https://your-azure-endpoint.openai.azure.com/openai/deployments/<deployment>
```
```

- [ ] **Step 8: 写 `en/cloud/byok/openai.mdx`**

```mdx
---
title: "Configure OpenAI"
description: "Global cluster's default LLM provider (not guaranteed on China)"
---

OpenAI is the default provider on Mirobody's **global cluster**.

> ⚠️ **China cluster note**: OpenAI is not directly reachable from mainland China; you would need your own compliant egress. Mirobody does not provide a proxy and offers no SLA. We strongly recommend [DashScope](/en/cloud/byok/dashscope) on the China cluster.

## 1. Register and get a key

1. Sign in to [OpenAI Platform](https://platform.openai.com/api-keys).
2. Create a secret key (shown only once).

## 2. Use it in Mirobody requests

```bash
curl -N -X POST https://test-mcp.thetahealth.ai/api/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-LLM-Provider: openai" \
  -H "X-LLM-Api-Key: sk-..." \
  -H "Content-Type: application/json" \
  -d '{"question":"hi","agent":"App","provider":"general"}'
```

## 3. Custom Base URL

For Azure OpenAI or other compatible relays:

```text
X-LLM-Base-Url: https://your-azure-endpoint.openai.azure.com/openai/deployments/<deployment>
```
```

- [ ] **Step 9: 写 `zh/cloud/byok/gemini.mdx`**

```mdx
---
title: "配置 Gemini"
description: "海外集群备选 LLM Provider"
---

Gemini 是 Mirobody **海外集群** 的备选 LLM provider，主要由 Google 提供。

> ⚠️ **中国集群提示**：Gemini 不在中国大陆提供服务；中国集群请使用 [DashScope](/zh/cloud/byok/dashscope) 或 [火山引擎](/zh/cloud/byok/volcengine)。

## 1. 注册并拿 Key

1. 登录 [Google AI Studio](https://aistudio.google.com/app/apikey)。
2. 创建一个 API Key。

## 2. 在 Mirobody 请求中传入

```bash
curl -N -X POST https://test-mcp.thetahealth.ai/api/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-LLM-Provider: gemini" \
  -H "X-LLM-Api-Key: <your Gemini API key>" \
  -H "Content-Type: application/json" \
  -d '{"question":"hi","agent":"Baseline","provider":"gemini-2.5-flash"}'
```
```

- [ ] **Step 10: 写 `en/cloud/byok/gemini.mdx`**

```mdx
---
title: "Configure Gemini"
description: "Global cluster alternative LLM provider"
---

Gemini is the alternative provider on Mirobody's **global cluster**, provided by Google.

> ⚠️ **China cluster note**: Gemini is not available in mainland China. Use [DashScope](/en/cloud/byok/dashscope) or [Volcengine](/en/cloud/byok/volcengine) instead.

## 1. Register and get a key

1. Sign in to [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Create an API key.

## 2. Use it in Mirobody requests

```bash
curl -N -X POST https://test-mcp.thetahealth.ai/api/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-LLM-Provider: gemini" \
  -H "X-LLM-Api-Key: <your Gemini API key>" \
  -H "Content-Type: application/json" \
  -d '{"question":"hi","agent":"Baseline","provider":"gemini-2.5-flash"}'
```
```

- [ ] **Step 11: mint dev 验证 10 个 BYOK 页都渲染**

- [ ] **Step 12: Commit**

```bash
git add en/cloud/byok/ zh/cloud/byok/
git commit -m "$(cat <<'EOF'
docs(cloud): fill BYOK protocol page + 4 provider configuration guides

Defines the X-LLM-Provider / X-LLM-Api-Key header contract, the exact
endpoint whitelist that requires BYOK, and per-provider sign-up steps
for DashScope / Volcengine / OpenAI / Gemini. China-cluster providers
get production-ready instructions; international providers carry a
"not guaranteed on China cluster" notice.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: 填充 Cloud / SDK Examples + Rate Limits（2 页 × 2）

**Files:**
- Overwrite: `en/cloud/sdk-examples.mdx`, `en/cloud/rate-limits.mdx`
- Overwrite: `zh/cloud/sdk-examples.mdx`, `zh/cloud/rate-limits.mdx`

- [ ] **Step 1: 写 `zh/cloud/sdk-examples.mdx`**

```mdx
---
title: "SDK 示例"
description: "curl / Python / Node.js 三套接入示例"
---

下面是端到端最小可用示例。已加入 BYOK header，CN 集群直接可跑。

## curl

```bash
CN=https://test-mcp.thetahealth.cn
TOKEN="<您的 access_token>"
LLM_KEY="<您的 DashScope API Key>"

# 基础对话
curl -N -X POST $CN/api/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-LLM-Provider: dashscope" \
  -H "X-LLM-Api-Key: $LLM_KEY" \
  -H "Content-Type: application/json" \
  -d '{"question":"你好","agent":"App","provider":"DeepSeekFlash"}'

# 上传文件 + 带文件提问
UP=$(curl -sS -X POST $CN/files/upload \
     -H "Authorization: Bearer $TOKEN" \
     -F "files=@report.pdf")
FL=$(echo "$UP" | jq -c .data)

REQ=$(jq -n --arg q "帮我分析这份体检报告" --argjson fl "$FL" \
     '{question:$q, agent:"App", provider:"DeepSeekFlash", file_list:$fl}')
curl -N -X POST $CN/api/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-LLM-Provider: dashscope" \
  -H "X-LLM-Api-Key: $LLM_KEY" \
  -H "Content-Type: application/json" \
  --data-binary "$REQ"
```

## Python (requests + SSE 解析)

```python
import requests
import json

CN = "https://test-mcp.thetahealth.cn"
TOKEN = "<your access_token>"
LLM_KEY = "<your DashScope key>"

headers = {
    "Authorization":  f"Bearer {TOKEN}",
    "X-LLM-Provider": "dashscope",
    "X-LLM-Api-Key":  LLM_KEY,
    "Content-Type":   "application/json",
}

resp = requests.post(
    f"{CN}/api/chat",
    headers=headers,
    json={"question": "你好", "agent": "App", "provider": "DeepSeekFlash"},
    stream=True,
)

for line in resp.iter_lines(decode_unicode=True):
    if not line or not line.startswith("data: "):
        continue
    evt = json.loads(line[6:])
    if evt["type"] == "reply":
        print(evt["content"], end="", flush=True)
    elif evt["type"] == "end":
        break
```

## Node.js (fetch + ReadableStream)

```javascript
const CN = "https://test-mcp.thetahealth.cn";
const TOKEN = "<your access_token>";
const LLM_KEY = "<your DashScope key>";

const resp = await fetch(`${CN}/api/chat`, {
  method: "POST",
  headers: {
    "Authorization":  `Bearer ${TOKEN}`,
    "X-LLM-Provider": "dashscope",
    "X-LLM-Api-Key":  LLM_KEY,
    "Content-Type":   "application/json",
  },
  body: JSON.stringify({ question: "你好", agent: "App", provider: "DeepSeekFlash" }),
});

const reader = resp.body.getReader();
const decoder = new TextDecoder();
let buf = "";

while (true) {
  const { value, done } = await reader.read();
  if (done) break;
  buf += decoder.decode(value, { stream: true });
  let idx;
  while ((idx = buf.indexOf("\n\n")) !== -1) {
    const chunk = buf.slice(0, idx);
    buf = buf.slice(idx + 2);
    if (!chunk.startsWith("data: ")) continue;
    const evt = JSON.parse(chunk.slice(6));
    if (evt.type === "reply") process.stdout.write(evt.content);
    if (evt.type === "end") return;
  }
}
```

更多示例：[食物识别](/zh/api-reference/food/analyze)、[日记创建](/zh/api-reference/journal/create)、[WebSocket 上传](/zh/api-reference/websocket/health-report)。
```

- [ ] **Step 2: 写 `en/cloud/sdk-examples.mdx`**（英文同结构）

```mdx
---
title: "SDK Examples"
description: "End-to-end examples in curl / Python / Node.js"
---

Minimum-viable end-to-end examples. BYOK headers included; works as-is on the China cluster.

## curl

```bash
CN=https://test-mcp.thetahealth.cn
TOKEN="<your access_token>"
LLM_KEY="<your DashScope API key>"

# Basic chat
curl -N -X POST $CN/api/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-LLM-Provider: dashscope" \
  -H "X-LLM-Api-Key: $LLM_KEY" \
  -H "Content-Type: application/json" \
  -d '{"question":"Hello","agent":"App","provider":"DeepSeekFlash"}'

# Upload file + ask about it
UP=$(curl -sS -X POST $CN/files/upload \
     -H "Authorization: Bearer $TOKEN" \
     -F "files=@report.pdf")
FL=$(echo "$UP" | jq -c .data)

REQ=$(jq -n --arg q "Analyze this report" --argjson fl "$FL" \
     '{question:$q, agent:"App", provider:"DeepSeekFlash", file_list:$fl}')
curl -N -X POST $CN/api/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-LLM-Provider: dashscope" \
  -H "X-LLM-Api-Key: $LLM_KEY" \
  -H "Content-Type: application/json" \
  --data-binary "$REQ"
```

## Python (requests + SSE parser)

```python
import requests
import json

CN = "https://test-mcp.thetahealth.cn"
TOKEN = "<your access_token>"
LLM_KEY = "<your DashScope key>"

headers = {
    "Authorization":  f"Bearer {TOKEN}",
    "X-LLM-Provider": "dashscope",
    "X-LLM-Api-Key":  LLM_KEY,
    "Content-Type":   "application/json",
}

resp = requests.post(
    f"{CN}/api/chat",
    headers=headers,
    json={"question": "Hello", "agent": "App", "provider": "DeepSeekFlash"},
    stream=True,
)

for line in resp.iter_lines(decode_unicode=True):
    if not line or not line.startswith("data: "):
        continue
    evt = json.loads(line[6:])
    if evt["type"] == "reply":
        print(evt["content"], end="", flush=True)
    elif evt["type"] == "end":
        break
```

## Node.js (fetch + ReadableStream)

```javascript
const CN = "https://test-mcp.thetahealth.cn";
const TOKEN = "<your access_token>";
const LLM_KEY = "<your DashScope key>";

const resp = await fetch(`${CN}/api/chat`, {
  method: "POST",
  headers: {
    "Authorization":  `Bearer ${TOKEN}`,
    "X-LLM-Provider": "dashscope",
    "X-LLM-Api-Key":  LLM_KEY,
    "Content-Type":   "application/json",
  },
  body: JSON.stringify({ question: "Hello", agent: "App", provider: "DeepSeekFlash" }),
});

const reader = resp.body.getReader();
const decoder = new TextDecoder();
let buf = "";

while (true) {
  const { value, done } = await reader.read();
  if (done) break;
  buf += decoder.decode(value, { stream: true });
  let idx;
  while ((idx = buf.indexOf("\n\n")) !== -1) {
    const chunk = buf.slice(0, idx);
    buf = buf.slice(idx + 2);
    if (!chunk.startsWith("data: ")) continue;
    const evt = JSON.parse(chunk.slice(6));
    if (evt.type === "reply") process.stdout.write(evt.content);
    if (evt.type === "end") return;
  }
}
```

More examples: [Food analyze](/en/api-reference/food/analyze), [Journal create](/en/api-reference/journal/create), [WebSocket upload](/en/api-reference/websocket/health-report).
```

- [ ] **Step 3: 写 `zh/cloud/rate-limits.mdx`**

```mdx
---
title: "限流"
description: "API 配额机制 + 客户端节奏建议"
---

Mirobody 按 **每用户 × 每路径 × 每分钟** 计数；触发后返回 HTTP 429，带 `Retry-After`（单位：秒）。

```text
HTTP/1.1 429 Too Many Requests
Retry-After: 47

Too Many Requests
```

## 推荐节奏

| 路径 | 推荐 RPM | 备注 |
| --- | --- | --- |
| `/email/login` | ≤ 1 | 60s 内同一邮箱重发会被拒 |
| `/api/chat` | ≤ 60 | 并发对话也算入 |
| `/files/upload` | ≤ 30 | 多文件请合并到一次请求 |
| `/api/v1/food/analyze` | ≤ 20 | 重计算路径 |
| `/api/v1/holywell/journal/*` | ≤ 60 | 增删改查共享配额 |
| 其他读接口 | ≤ 120 | history / file-list / 指标查询 |

> **正式接入前请向运营确认贵方部署的精确数值**——具体阈值由部署侧通过 `REQUEST_RATE_LIMITER` 环境变量注入。

## 客户端退避建议

- 收到 429 后**严格遵守 `Retry-After`**，不要立即重试。
- 连续两次 429 后将 backoff 翻倍，上限 5 分钟。
- chat 调用不要并发；上一轮 `end` 事件到达后再发下一轮。
- 状态查询走 [推荐轮询节奏](/zh/api-reference/overview#推荐异步轮询节奏)。
```

- [ ] **Step 4: 写 `en/cloud/rate-limits.mdx`**

```mdx
---
title: "Rate Limits"
description: "Quota mechanism + client pacing"
---

Mirobody counts requests per **user × path × minute**. On overflow you get HTTP 429 with a `Retry-After` header (seconds).

```text
HTTP/1.1 429 Too Many Requests
Retry-After: 47

Too Many Requests
```

## Recommended pacing

| Path | Recommended RPM | Notes |
| --- | --- | --- |
| `/email/login` | ≤ 1 | Resending within 60s for the same email is rejected |
| `/api/chat` | ≤ 60 | Concurrent chats count too |
| `/files/upload` | ≤ 30 | Batch multiple files into one request |
| `/api/v1/food/analyze` | ≤ 20 | Compute-heavy path |
| `/api/v1/holywell/journal/*` | ≤ 60 | All journal CRUD shares quota |
| Other read endpoints | ≤ 120 | history / file-list / indicator queries |

> **Confirm the exact numbers for your deployment with your Mirobody account manager before going live** — thresholds are injected per deployment via the `REQUEST_RATE_LIMITER` env var.

## Client backoff guidance

- On 429, **respect `Retry-After`** — never retry immediately.
- Double the backoff after two consecutive 429s, up to 5 minutes.
- Don't fire chat calls in parallel; wait for the previous `end` event.
- For polling, use the [recommended cadence](/en/api-reference/overview#recommended-polling-cadence).
```

- [ ] **Step 5: mint dev 验证 4 页**

- [ ] **Step 6: Commit**

```bash
git add en/cloud/sdk-examples.mdx en/cloud/rate-limits.mdx zh/cloud/sdk-examples.mdx zh/cloud/rate-limits.mdx
git commit -m "$(cat <<'EOF'
docs(cloud): add SDK examples and rate-limit guidance

curl / Python / Node.js end-to-end samples include BYOK headers and
work as-is on the China test cluster. Rate-limit page surfaces the
per-path recommended RPM and client backoff guidance.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: 重排 API Reference + 把 `api_docs/cn_delivery_api.md` 内容拆到各页

**Files:**
- Modify: `docs.json`（重排 API Reference tab 的 groups/pages 数组）
- Modify / Create: 约 25 个 `en/api-reference/**/*.mdx` 和对称 zh

**这是最大的一步，按 spec §3.3 + §3.4 的映射执行。**

由于内容量大，本任务**整体不内联完整代码**——做法是：

1. 先在 docs.json 把 API Reference 的 groups 重写。
2. 每个新页都是从 `api_docs/cn_delivery_api.md` 对应小节拷贝 + 调整 frontmatter + 加 BYOK 提示框 + 改链接（CN 集群 base URL 全部统一为 `https://test-mcp.thetahealth.cn`）。
3. 中文页和英文页**结构一一对应**；英文翻译沿用 spec 文档里出现过的英文术语。

- [ ] **Step 1: 重写 docs.json 的 en 语言 API Reference tab**

把 en 语言 `tabs` 中 `tab == "API Reference"` 那一项的 `groups` 整体替换为：

```json
{
  "tab": "API Reference",
  "groups": [
    {
      "group": "Overview",
      "pages": [
        "en/api-reference/overview"
      ]
    },
    {
      "group": "Authentication",
      "pages": [
        "en/api-reference/authentication/email",
        "en/api-reference/authentication/oauth",
        "en/api-reference/authentication/refresh",
        "en/api-reference/authentication/beneficiary"
      ]
    },
    {
      "group": "Chat",
      "pages": [
        "en/api-reference/chat/chat",
        "en/api-reference/chat/session",
        "en/api-reference/chat/history",
        "en/api-reference/chat/custom-prompt"
      ]
    },
    {
      "group": "Files",
      "pages": [
        "en/api-reference/files/upload",
        "en/api-reference/files/list",
        "en/api-reference/files/delete"
      ]
    },
    {
      "group": "Journal",
      "pages": [
        "en/api-reference/journal/list",
        "en/api-reference/journal/create",
        "en/api-reference/journal/update-delete"
      ]
    },
    {
      "group": "Health Indicators",
      "pages": [
        "en/api-reference/health-indicators/categories",
        "en/api-reference/health-indicators/latest",
        "en/api-reference/health-indicators/query",
        "en/api-reference/health-indicators/distribution"
      ]
    },
    {
      "group": "Food",
      "pages": [
        "en/api-reference/food/analyze",
        "en/api-reference/food/save-history"
      ]
    },
    {
      "group": "ASR",
      "pages": [
        "en/api-reference/asr/sync",
        "en/api-reference/asr/task"
      ]
    },
    {
      "group": "WebSocket",
      "pages": [
        "en/api-reference/websocket/health-report",
        "en/api-reference/websocket/llm-analysis",
        "en/api-reference/websocket/file-progress"
      ]
    }
  ]
}
```

zh 语言对称（group 名翻译）：

```json
{
  "tab": "API 引用",
  "groups": [
    { "group": "概览", "pages": ["zh/api-reference/overview"] },
    { "group": "鉴权", "pages": ["zh/api-reference/authentication/email","zh/api-reference/authentication/oauth","zh/api-reference/authentication/refresh","zh/api-reference/authentication/beneficiary"] },
    { "group": "对话", "pages": ["zh/api-reference/chat/chat","zh/api-reference/chat/session","zh/api-reference/chat/history","zh/api-reference/chat/custom-prompt"] },
    { "group": "文件", "pages": ["zh/api-reference/files/upload","zh/api-reference/files/list","zh/api-reference/files/delete"] },
    { "group": "日记", "pages": ["zh/api-reference/journal/list","zh/api-reference/journal/create","zh/api-reference/journal/update-delete"] },
    { "group": "健康指标", "pages": ["zh/api-reference/health-indicators/categories","zh/api-reference/health-indicators/latest","zh/api-reference/health-indicators/query","zh/api-reference/health-indicators/distribution"] },
    { "group": "食物", "pages": ["zh/api-reference/food/analyze","zh/api-reference/food/save-history"] },
    { "group": "语音转写", "pages": ["zh/api-reference/asr/sync","zh/api-reference/asr/task"] },
    { "group": "WebSocket", "pages": ["zh/api-reference/websocket/health-report","zh/api-reference/websocket/llm-analysis","zh/api-reference/websocket/file-progress"] }
  ]
}
```

**保留** Pulse 和 MCP 两组——**不要删**。把它们拼接在 WebSocket 之后：

```json
{
  "group": "Pulse API",
  "pages": [
    "en/api-reference/pulse/link",
    "en/api-reference/pulse/callback",
    "en/api-reference/pulse/unlink",
    "en/api-reference/pulse/providers"
  ]
},
{
  "group": "MCP Protocol",
  "pages": [
    "en/api-reference/mcp/overview",
    "en/api-reference/mcp/tools",
    "en/api-reference/mcp/resources"
  ]
}
```

zh 同。

- [ ] **Step 2: 拷贝 `api_docs/cn_delivery_api.md` 内容到 `zh/api-reference/overview.mdx`**

新建 `zh/api-reference/overview.mdx`：

```mdx
---
title: "API 概览"
description: "Mirobody Platform API 的通用规范、鉴权、路径风格、限流、错误码"
---

import OverviewBody from '/api_docs/cn_delivery_api.md';
```

由于 Mintlify Mint 不直接支持 `import md`，**实际做法是把 `api_docs/cn_delivery_api.md` 的 §12 通用规范、§1 概览（去掉 base URL 表头）等内容**直接拷贝过来：

参考 `api_docs/cn_delivery_api.md` 的：
- §1 概览 → "服务能力一览" + 健康检查
- §12 通用规范（路径风格、标准响应壳、SSE 协议、国际化、限流、错误码速查） → 直接全部搬过来
- 末尾加 "推荐异步轮询节奏" 小节，文本：

  > 当前不提供 Webhook 推送；异步状态请按下列节奏轮询：
  > - 推荐轮询间隔：**2~5 秒**，最多持续 60 秒
  > - 不建议 < 1s 高频探活，会被限流

英文版 `en/api-reference/overview.mdx` 同样做翻译。

- [ ] **Step 3: 把鉴权章节拆 4 页**

zh：

- `zh/api-reference/authentication/email.mdx` ← cn_delivery_api.md §2.1, §2.2, §2.3
- `zh/api-reference/authentication/oauth.mdx` ← §2.4 全套
- `zh/api-reference/authentication/refresh.mdx` ← §2.5
- `zh/api-reference/authentication/beneficiary.mdx` ← §7 家庭共享

每页 frontmatter 示例：

```mdx
---
title: "邮箱码登录"
description: "/email/login + /email/verify 两步"
---
```

en 对称。

- [ ] **Step 4: 把 Chat 章节拆 4 页**

zh：

- `zh/api-reference/chat/chat.mdx` ← §3.1, §3.2, §3.3, §3.4, §3.5 — **在文件顶部 frontmatter 后立即加 BYOK 提示**：

  ```mdx
  > ⚠️ **此接口需要 LLM 凭证** — 调用时必须额外携带 `X-LLM-Provider` 与 `X-LLM-Api-Key` header，详见 [BYOK 协议](/zh/cloud/byok/index)。
  ```

- `zh/api-reference/chat/session.mdx` ← §4.1
- `zh/api-reference/chat/history.mdx` ← §4.2, §4.3, §4.4
- `zh/api-reference/chat/custom-prompt.mdx` ← §6

en 对称。

- [ ] **Step 5: 把 Files / Journal / Health Indicators / Food / ASR / WebSocket 内容拆完**

按 spec §3.4 的对照表逐页拷贝。**每个"需要 BYOK"的页都在顶部加 `> ⚠️ **此接口需要 LLM 凭证** ...` 提示框**：

- `*/api-reference/journal/create.mdx` ✅ 需要
- `*/api-reference/food/analyze.mdx` ✅ 需要
- `*/api-reference/asr/sync.mdx` ✅ 需要（仅 DashScope）
- `*/api-reference/asr/task.mdx` ✅ 需要（仅 DashScope）
- `*/api-reference/websocket/health-report.mdx` ✅ 需要（WS query 形式）
- `*/api-reference/websocket/llm-analysis.mdx` ✅ 需要
- `*/api-reference/journal/update-delete.mdx` —— 只在 `update` 携带新内容时需要

其他页不加 BYOK 提示。

- [ ] **Step 6: 检查路径**

把所有页中的 `https://test-mcp.thetahealth.ai` 全部改为 `https://test-mcp.thetahealth.cn`（之前 `cn_delivery_api.md` 已经在用 `.cn` 域名，本步主要是用 grep 兜底）：

```bash
grep -rn "thetahealth.ai" en/api-reference/ zh/api-reference/ en/cloud/ zh/cloud/ en/trust/ zh/trust/ 2>&1 | head
```

只允许出现在 `*regions/global.mdx` 和 `*byok/openai.mdx` `*byok/gemini.mdx`。其余出现都改为 `.cn`。

- [ ] **Step 7: 删除旧 API Reference 页**

新 IA 不再用以下文件：

- `en/api-reference/chat/send-message.mdx` — 内容已并入 `chat/chat.mdx`
- `en/api-reference/introduction.mdx` — 替换为 `overview.mdx`
- zh 同

```bash
git rm en/api-reference/chat/send-message.mdx en/api-reference/introduction.mdx zh/api-reference/chat/send-message.mdx zh/api-reference/introduction.mdx
```

`api-reference/chat/history.mdx`、`api-reference/pulse/**`、`api-reference/mcp/**` 都保留。

- [ ] **Step 8: mint dev 完整验证 30+ 页**

```bash
mint dev
```

逐 tab 逐页点击，重点：
- 左 sidebar 结构与 docs.json 一致
- 每个"AI 接口"页都能看到 BYOK 提示框
- 全站搜索 `thetahealth.ai`，应该只在 Global / OpenAI / Gemini 几页出现
- 链接（链到 `/zh/cloud/byok/index` 之类）都能跳转，无红色 broken link

- [ ] **Step 9: Commit**

```bash
git add docs.json en/api-reference/ zh/api-reference/
git commit -m "$(cat <<'EOF'
docs(api-ref): reorganize API Reference into 9 groups + 25 pages

Splits cn_delivery_api.md content into per-endpoint Mintlify pages
(Auth / Chat / Files / Journal / Health Indicators / Food / ASR /
WebSocket / Overview). Every AI-dependent endpoint page carries an
explicit BYOK requirement banner linking to the protocol page.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: 最终验证 & navbar Primary CTA 调整

**Files:**
- Modify: `docs.json`（可选：调整 `navbar.primary.href`）

- [ ] **Step 1: docs.json 的 `navbar.primary` 把 CTA 改成 Cloud Quickstart（更贴合 2B 受众）**

```json
"navbar": {
  "links": [
    { "label": "Support", "href": "https://github.com/thetahealth/mirobody/issues" }
  ],
  "primary": {
    "type": "button",
    "label": "Get Started",
    "href": "/en/cloud/quickstart"
  }
}
```

(原本指向 `/en/quickstart`，那是开源自部署快速开始；2B 受众应直接进 Cloud Quickstart。)

- [ ] **Step 2: 全站 `mint dev` 最终冒烟**

```bash
mint dev
```

走一遍：
- 顶部 4 个 tab：Documentation / API Reference / Cloud / Trust & Compliance（en / zh 切换均生效）
- 左 sidebar 各 group 展开正常
- 任意点几页验证 frontmatter title / description 正确
- BYOK / Compliance 等内链能跳转
- 没有 broken link 红字、没有 MDX 编译报错

- [ ] **Step 3: Commit**

```bash
git add docs.json
git commit -m "$(cat <<'EOF'
docs(navbar): redirect Get Started CTA to Cloud Quickstart

The primary CTA now points 2B partners directly to the hosted-API
quickstart instead of the self-hosted Docker quickstart.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: 本地 dev server 长跑 + 浏览器截图验收

**Files:** 无（运行时验证）

- [ ] **Step 1: 启动 dev server (background)**

```bash
cd /Users/admin/Desktop/development/mirobody-health-docs
mint dev
```

服务监听 http://localhost:3000。

- [ ] **Step 2: 用 chrome-devtools mcp 打开主页 + 各 tab 截图归档**

```text
1. navigate /
2. screenshot 主页
3. navigate /en/cloud/quickstart, screenshot
4. navigate /en/trust/data-residency, screenshot
5. navigate /en/cloud/byok/index, screenshot
6. navigate /zh/cloud/quickstart, screenshot
7. navigate /zh/api-reference/chat/chat, screenshot — 验证 BYOK 提示框
```

- [ ] **Step 3: 列举发现的问题**

如果有问题：MDX 编译错误、broken link、布局错位、tab 顺序异常 → 记录并修复。

---

## 完成标准

- 所有 Task 1-9 步骤都 ✅
- `mint dev` 运行无 error / warning
- 顶部 4 tabs 在 en / zh 都正确显示
- 每个 AI 接口页都有 BYOK 提示框
- 全站搜索 `Theta Health` 字符串只剩 `global.anchors` 那一处（指向 thetahealth.ai）
- 仍未做：后端 BYOK middleware（另一个 plan）

---

## Self-Review Checklist (执行人在 Task 9 完成后跑一遍)

1. Spec §1 定位 → Task 1 + Task 4 (quickstart)
2. Spec §2 BYOK 协议 → Task 5 (byok/index 完整覆盖 §2.1/2.2/2.3/2.4)
3. Spec §3.1 品牌修正 → Task 1
4. Spec §3.2 双语策略 → 所有任务都有 en+zh 对称
5. Spec §3.3 IA → Task 2 + Task 7
6. Spec §3.4 内容映射 → Task 7 (含所有小节)
7. Spec §4 工作量 → 8 个文档任务 + 1 个验证任务
8. Spec §5 Out-of-Scope → 本 plan **没有** Console / 计费 / 后端改动等
9. Spec §6 风险 → Task 5 在 BYOK index 加了出境网络 / DashScope 必备 等提示
10. Spec §7 实施顺序 → Phase A 全在本 plan；Phase B（后端 middleware）将由另一个 plan 覆盖
