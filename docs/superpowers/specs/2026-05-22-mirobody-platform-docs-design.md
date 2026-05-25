# Mirobody Platform 文档站升级 + 轻量 BYOK 设计

- 日期：2026-05-22
- 现状仓库：`mirobody-health-docs/`（Mintlify 双语 en+zh），现品牌错标为 "Theta Health"
- 决策状态：用户已确认下文所有设计要点，可进入 implementation plan

---

## 1. 目标与受众

### 1.1 一句话定位

> **Mirobody Platform** — 一个开源的健康 AI 框架。我们替合作伙伴把 agent + 文件解析 + 健康指标 + 日记 + ASR + 图表这整套基础设施跑起来，并在合作伙伴所在的法域内合规存储用户数据。**LLM 算力由合作伙伴自带（BYOK）** —— OpenAI / Gemini / DashScope / 火山引擎，任何官方 key 接进来都能跑。

### 1.2 受众

- **业务决策者**：关心合规、数据驻留、品牌背书。落点页 = 首页 + Trust & Compliance + Regions。
- **集成工程师**：关心 quickstart、API reference、BYOK 用法、SDK 示例。落点页 = API Reference + Cloud / Quickstart + Cloud / BYOK。

### 1.3 商业模式确认

- **不卖 LLM token**（后续需要再加，本期完全不做）。
- **不需要计费 / 充值 / 自助控制台**（M3 / M4 整体砍掉）。
- 基础框架与基础设施免费；潜在收入 = 定制 / 企业支持（**本文档站不展示**收费内容，由销售线下对接）。

---

## 2. BYOK 协议设计（核心技术决策）

### 2.1 协议

AI 类接口在 `Authorization` 之外，额外需要两个 HTTP header；非 AI 接口仍只需 `Authorization`。

```text
Authorization:   Bearer <mirobody_access_token>     # 必填：用户身份
X-LLM-Provider:  openai | gemini | dashscope | volcengine
X-LLM-Api-Key:   <合作伙伴自有的 LLM 厂商官方 key>
X-LLM-Base-Url:  <可选；自有相对网关 base URL>
```

WebSocket 因浏览器无法设置 header，统一改用 query：

```text
wss://<host>/ws/upload-health-report?token=<at>&llm_provider=dashscope&llm_api_key=<...>
```

### 2.2 后端最小改动

- **不新增数据库表**、**不持久化任何 LLM 凭证**、**不写入日志**。
- 新增一个 Starlette middleware（~30 行）读取 `X-LLM-*` header，写入 `request.state.llm_provider / llm_api_key / llm_base_url`，请求结束即丢弃。
- 改造 `mirobody/utils/llm/clients.py` 的 LLM client 构造：优先 `request.state.*` → fallback 到全局 env var（保留单租户自部署模式不破坏）。
- 改造每个 AI 路由的入口，把 `request.state.llm_*` 透传到 client 构造调用链。
- WS 改造 `verify_token_*` 同步解析 query 中的 `llm_provider/llm_api_key/llm_base_url`，写入 ws 会话上下文。

### 2.3 接口范围（基于实测代码梳理）

**需要 BYOK header 的接口**：

| 接口 | LLM 用途 |
| --- | --- |
| `POST /api/chat` | 对话主流程 |
| `POST /api/v1/food/analyze` | 食物图像识别（vision LLM） |
| `POST /api/v1/holywell/journal/create` | 异步分类 / 摘要 / 症状抽取 |
| `POST /api/v1/holywell/journal/reprocess` | 重跑日记 AI |
| `POST /api/v1/holywell/journal/update` | 仅当请求体携带新的 `text_input` 或 `files` 时触发 AI 重处理；如仅更新 `symptom` / `ts` 元数据，则不需要 BYOK header |
| `WS  /ws/upload-health-report` | 报告解析 + 摘要 |
| `WS  /ws/upload-with-llm-analysis` | 一站式 LLM 分析 |
| `POST /api/v1/holywell/file-upload/asr` | ASR（DashScope） |
| `POST /api/v1/holywell/file-upload/asr-task` | 异步 ASR（DashScope） |

> ASR 仅支持 `X-LLM-Provider: dashscope`，合作伙伴必须自备阿里 DashScope 账号。

**不需要 BYOK header 的接口**（仅 `Authorization`）：

- 全部 auth（`/email/login`、`/email/verify`、`/oauth/*`、`/user/*`）
- `/api/session`、`/api/history*`、`/api/history/delete`
- `/api/agents`、`/api/providers`、`/api/models`、`/api/prompts`
- `/api/user/prompt*`、`/api/user/mcp*`
- `/api/beneficiary-users`
- `/files/upload`
- `/api/v1/data/uploaded-files`、`/api/v1/data/data-distribution`、`/api/v1/data/delete-files`
- `/api/v1/holywell/journal/{list, memo/types, delete, mark_read, update（仅元数据）}`
- `/api/v1/holywell/health-indicator/*`、`/api/v1/holywell/udata/*`
- `/api/v1/food/{save, history, delete}`、`/food/get_recognized`

### 2.4 错误处理

- 缺 `X-LLM-Api-Key` 但访问 AI 接口：HTTP 400，body `{ code: -10, msg: "X-LLM-Api-Key header is required for this endpoint." }`
- LLM 凭证错误（401 from upstream）：在 SSE 流中以 `data: {"type":"error","content":"LLM auth failed: ..."}` 返回，并随 `end` 事件结束。
- 不在 HTTP access log 里记录任何 `X-LLM-*` 值（middleware 入口处对 header 副本里清除）。

---

## 3. 站点信息架构（Mintlify 重排）

### 3.1 品牌修正

- `docs.json` 的 `"name"` 由 `"Theta Health"` 改为 `"Mirobody"`。
- 主色 **保留** `#2563EB`（Mirobody 视觉，**不**采用 thetahealth.ai 的 `#4763F0`，避免与 Theta 强绑定）。
- favicon、logo 路径不变（`favicon.svg`、`/images/light.svg`、`/images/dark.svg`），后续如要换 Mirobody 自己的 logo 单独换图。
- footer / navbar 文案中"Theta Health"全数替换为"Mirobody"（仅在 marketing 上下文里允许 "powered by Theta Health" 之类提及）。

### 3.2 双语 + 双 cluster 策略

- 两份内容树继续并行：`en/`、`zh/`，目录结构完全对称。
- **本期主线 = 中国集群（CN）**，所有 hosted API 内容以 `*.thetahealth.cn` 为准。
- 海外集群（`*.thetahealth.ai`）所有页面仅占位，标 *Coming Soon / 上线中*。
- 已写好的 `api_docs/cn_delivery_api.md` 按下文 §3.3 拆分到正式页面。

### 3.3 新 Top-level Tabs

```text
Top Nav:  Documentation │ API Reference │ Cloud │ Trust & Compliance │ GitHub
```

#### Tab: Documentation （沿用，开源自部署受众）

不动现有结构：Getting Started / Core Concepts / Using Providers / Provider Examples / Tools & MCP。

#### Tab: API Reference （集成工程师）

```text
├ Overview
├ Authentication
│  ├ Email Login (code)
│  ├ OAuth 2.0 (SSO)
│  └ Token Refresh
├ Chat
│  └ POST /api/chat        ← 含 "此接口需要 BYOK header" 提示与 link
├ Files
│  ├ POST /files/upload
│  ├ GET /api/v1/data/uploaded-files
│  └ POST /api/v1/data/delete-files
├ Journal
│  ├ GET /api/v1/holywell/journal/list
│  ├ POST /journal/create    ← 含 BYOK 提示
│  ├ POST /journal/update    ← 部分情况需 BYOK
│  ├ POST /journal/reprocess ← 含 BYOK 提示
│  ├ POST /journal/delete
│  └ POST /journal/mark_read
├ Health Indicators
│  └ /api/v1/holywell/health-indicator/* 全套
├ Food
│  ├ POST /api/v1/food/analyze ← 含 BYOK 提示
│  ├ POST /api/v1/food/save
│  ├ GET  /api/v1/food/history
│  └ DELETE /api/v1/food/delete/{id}
├ ASR
│  ├ POST /api/v1/holywell/file-upload/asr        ← 含 BYOK 提示（DashScope）
│  └ POST /api/v1/holywell/file-upload/asr-task
└ WebSocket
   ├ wss /ws/upload-health-report                  ← 含 query token + BYOK 提示
   ├ wss /ws/upload-with-llm-analysis              ← 含 BYOK 提示
   └ wss /api/ws/file-progress
```

> 每个 AI 接口页面顶部统一 `<Note>` 组件提示「此接口需要 LLM 凭证 header / query，详见 [Bring Your Own LLM Key](/cloud/byok)」。

#### Tab: Cloud （完全新增）

```text
├ Quickstart (5 分钟跑通：登录 → 拿 token → 第一次 chat)
├ Regions
│  ├ 🇨🇳 China Cluster (Live)
│  │   ├ Base URL（test / prod）
│  │   ├ 存储：阿里云 OSS（杭州区域）
│  │   ├ ASR：阿里 DashScope (qwen3-asr-flash-filetrans)
│  │   └ 限流、合规快速链接
│  └ 🌐 Global Cluster (Coming Soon)
│      ├ 上线计划简述
│      └ 已知差异（届时填写）
├ Bring Your Own LLM Key
│  ├ Why BYOK
│  ├ Header / Query 协议
│  ├ Configure DashScope（CN 必备）
│  ├ Configure 火山引擎
│  ├ Configure OpenAI（国际 only）
│  ├ Configure Gemini（国际 only）
│  └ Troubleshooting（401 上游、key 轮换、可观测性建议）
├ SDK Examples
│  ├ curl
│  ├ Python (requests / openai SDK compat 风格)
│  └ Node.js (fetch / openai SDK compat 风格)
└ Rate Limits（指向 API Reference / 通用规范）
```

#### Tab: Trust & Compliance （完全新增；关键卖点）

```text
├ Data Residency Overview
│  └ 地图 + 一张表："Cluster / Base URL / Storage / Region / Status"
├ China — Compliance
│  ├ 个人信息保护法（PIPL）
│  ├ 数据安全法
│  ├ 网络安全法
│  └ 数据 100% 存储于阿里云中国大陆区域
├ Global — Compliance (Coming Soon)
│  ├ HIPAA（计划）
│  └ GDPR（计划）
├ Encryption
│  ├ TLS in transit (HTTPS / WSS 强制)
│  ├ Storage at rest（Aliyun OSS server-side encryption）
│  └ Field-level（Fernet 加密敏感字段 — 患者档案 comment、文件 filename 等）
├ Subprocessors
│  ├ Aliyun OSS / 阿里 DashScope
│  └ Partner-supplied LLM provider（BYOK 模式下由合作伙伴自行约束）
└ Security Practices
   ├ 鉴权 / 令牌生命周期
   ├ 日志脱敏（X-LLM-* 不入 log）
   └ Vanta / SOC 2 Status（当前未启用，规划中；上线后更新此节）
```

### 3.4 内容映射（从现有 `api_docs/cn_delivery_api.md` 拆分）

| 现有章节 | 新位置 |
| --- | --- |
| §1 概览 | Cloud / Quickstart（精简版）+ Cloud / Regions / China |
| §2 鉴权 | API Reference / Authentication（拆 Email / OAuth / Refresh 三页） |
| §3 智能对话 | API Reference / Chat |
| §3.6 BYOK 工具白名单 / 黑名单 | API Reference / Chat 的 "工具能力" 小节 |
| §4 会话与历史 | API Reference / Chat 下子页 |
| §5 文件上传 | API Reference / Files（拆 REST + WS 两页） |
| §6 自定义 Prompt | API Reference / Chat / Custom Prompt |
| §7 家庭共享 | API Reference / Authentication / Beneficiary |
| §8 食物 | API Reference / Food |
| §9 日记 | API Reference / Journal |
| §10 健康指标 | API Reference / Health Indicators |
| §11 ASR | API Reference / ASR |
| §12 通用规范（限流、错误码、SSE、路径风格） | API Reference / Overview |
| §13 端到端示例 | Cloud / SDK Examples |
| 附录 A 测试账号 | Cloud / Quickstart 末段 |

---

## 4. 工作量与交付物

| 任务 | 内容 | 工作量 |
| --- | --- | --- |
| **T1 — 站点品牌修正** | `docs.json` name 改 Mirobody；navbar / footer / index 文案巡检 | 0.5 天 |
| **T2 — IA 重排** | docs.json 新增 Cloud + Trust & Compliance 两 tab；API Reference 重组 | 2 天 |
| **T3 — CN 内容填写** | 现有 `cn_delivery_api.md` 按 §3.4 拆到各 page；BYOK 说明页；Regions / China；Compliance / China；Encryption | 3 天 |
| **T4 — 海外 "上线中"** | Global 系列占位页（en + zh） | 0.5 天 |
| **T5 — 后端 BYOK middleware**（可选，可与文档并行） | `X-LLM-Provider/X-LLM-Api-Key` middleware + `clients.py` 改造 + env var fallback + WS query 接管 + 日志脱敏 | 3 天 |
| **T6 — SDK examples** | curl / Python / Node 三套（含 openai SDK 兼容风格示例） | 1 天 |

**文档侧 T1–T4 + T6 ≈ 7 天，可立即推进且不依赖后端。**
**后端 T5 ≈ 3 天，可并行；先用 env var 默认 LLM 跑 demo，T5 上线后切到 BYOK 路径。**

---

## 5. 非目标 / Out-of-Scope（明确不做）

- ❌ 中转 / 计费 / 充值 / 账单 / 控制台（M3 / M4 整体砍掉）。
- ❌ 持久化合作伙伴的 LLM 凭证（不进 DB、不进日志）。
- ❌ 海外集群正式内容（占位即可，等真上线再补）。
- ❌ Mirobody 自有 LLM token 销售（以后想做再加）。
- ❌ 主题色 / logo 改成 Theta 风格（保持 Mirobody 自有视觉）。
- ❌ Console 顶级 tab。

---

## 6. 风险与已知问题

| 风险 | 缓解 |
| --- | --- |
| 海外 LLM key（OpenAI / Gemini）在 CN 集群无法直连 | 文档明确说明 CN 集群 BYOK 推荐 `dashscope` / `volcengine`；OpenAI/Gemini 需合作伙伴自备出境代理，性能不保证 |
| BYOK header 在某些代理 / CDN 被剥离 | 默认 header 名 `X-LLM-Provider` / `X-LLM-Api-Key` 走标准 `X-` 前缀；HTTP header 大小写不敏感，middleware 走 case-insensitive 匹配。若客户遇到代理剥离，文档建议改用 query 形式（`?llm_provider=...&llm_api_key=...`，仅限内部网络环境） |
| ASR 必须 DashScope 增加合作伙伴接入门槛 | 在 BYOK 页明确"国内 ASR 仅 DashScope"，并给出 DashScope 开通指南链接 |
| 现有自部署用户的 env var 模式不能破坏 | middleware fallback：无 header 时回退到全局 env var；自部署一键 docker 模式继续可用 |
| 日志意外打印 BYOK 凭证 | middleware 入口处在 header 副本中删除 `X-LLM-*`；single 单测覆盖；建议接入方使用 short-lived key |

---

## 7. 实施顺序（不同期可并行）

1. **Phase A（文档侧，立刻开工）**：T1 → T2 → T3 → T4 → T6（顺序执行，~7 天）。
2. **Phase B（后端 BYOK，与 A 并行）**：T5（~3 天），完成后文档 BYOK 示例从"占位"切到真实可跑。

文档上线不阻塞后端 T5；T5 上线后只需更新 `Cloud / BYOK` 一页示例和 Regions / China 的"BYOK 状态"小节。
