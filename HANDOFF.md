# 文档与 API Platform 交接（2026-07-23）

## 当前状态

| 仓库 | 基线 | 本轮状态 |
| --- | --- | --- |
| `mirobody-health-docs` | `dev` / `66a00e0` | 公开文档已做全站事实审查与精简；100+ 个中英文页面/片段有未提交修改，`HANDOFF.md` 为未跟踪文件。未推送、未发布。 |
| `cdm` | `dev` / `7a8b103` | `apps/api-platform` 有 9 个未提交文件，集中在 Quickstart、Data/Agent Playground、Models、Usage 与中英文文案。未推送。 |
| `a007-mirovital` | `test` / `a12c2d93` | 只读核对，无修改。关键提交：`99960744`（限时留存）、`f1a744ea`（Subject 删除级联 Responses）、`a12c2d93`（Agent 主循环只读，写入移至 consolidation）。 |
| `thetahealth/mirobody` 本地仓库 | `main-v2` / `7af9894` | 只读核对，无修改。2026-07-23 已确认公开 GitHub 默认展示 `main-v2`；文档以该分支的 `build.sh`、`config.example.yml`、路由和 vendor 实现为准。 |

> 不要直接发布。文档站无 staging；`main` 会直接影响 `docs.mirobody.ai`。前端也必须遵循 `dev → test → main`。

## 已完成：托管 API 文档

- 统一三种输入边界：
  - `/v1/data` 写结构化读数并运行标准化；
  - `/v1/files` 保存原件并异步抽取文本，不自动创建结构化读数；
  - `/v1/extract` 同步抽取，默认 dry-run；`store=true` 才写读数。
- 按真实代码重写留存、会话与删除语义：
  - `DELETE /v1/sessions/{id}` 只清理 session-retention 数据/文件与 chat session，不删除已存储 Response；
  - `DELETE /v1/responses/{id}` 总会删除该 Response，仅在它是最后一个存活响应时拆除对话与回撤对话记忆；
  - consolidation 已写入数据面的读数需通过 `/v1/data` 或 Subject 擦除删除。
- 修正 Answers API：`retention`、`session_id` 不是 `/v1/chat/completions` 字段；该接口无状态。
- 修正 Agent API：主循环只读；健康写入由后台 consolidation 处理；推理字段是 provider 返回的文本/摘要，不承诺完整内部推理。
- 修正文件状态：上传响应的 `status: processed` 只表示原件已接收保存，不代表文本抽取完成。
- 修正 structured output：`json_schema` 当前回退为 `json_object + prompt`，服务端不做 schema 校验，调用方必须校验。
- 修正 Usage/Models/Rate Limits：
  - Console Usage 只显示请求数，不声称提供 token/cost 分析；
  - `/v1/models` 的实时元数据/价格为事实来源；
  - RPM 为 key 级合计，monthly cap 仅在后端开关启用时生效。
- 删除未经仓库或合同材料证实的 HIPAA、BAA、Vanta、持续审计、明文不可见等绝对声明，改为产品控制与合规审查边界。
- 中国区文档改为“待明确开通”；全球 `.ai` 为当前生产入口。中国 API/platform/chat 域名未确认前不得写成已上线。
- 标准化示例统一使用与 `LOINC 1558-6 / Mass/volume` 一致的 `mg/dL`，不再把该 code 与 `mmol/L` 混写。
- 明确 `/v1/data` 与 `store=true /v1/extract` 不具备幂等性，盲目重试可能重复写入。

## 已完成：开源文档

- Quickstart 收敛为真实可运行的 SQLite 路径：`./build.sh sqlite` → `build-sqlite/mirobody`；默认 PostgreSQL 产物为 `build/mirobody`。
- 全面修正构建目录、测试二进制、配置键、源码路径与 MCP/tool 注册位置。
- Provider 文档按源码区分真实实现与显式 stub：
  - 不再声称七个设备品牌都完整实现 OAuth + fetch；Garmin 当前仅接通 `revoke`；
  - 通用 `ehr` 只面向符合 SMART App Launch + FHIR R4 的租户端点，不承诺覆盖所有 EHR；
  - `/vendors/{id}/data` 只返回 vendor 原生 JSON，`/sync` 才映射并写入 FHIR；
  - 浏览器 OAuth 与手动 `bind/verify` 两条路径已分开说明。
- 补充 vendor OAuth token 的真实安全边界：没有 `VENDOR_TOKEN_ENCRYPTION_KEY` 或 `FILE_ENCRYPTION_KEY` 时，token 不会以明文落库。
- 自托管合规章节改为完整出站数据流清单：LLM、对象存储、vendor/EHR、身份/邮件、远程配置、崩溃上报；自托管或选择 Vertex/Azure 本身不等于合规。
- `CONFIG_ENCRYPTION_KEY` 与 44 字符 Fernet key 的用途已区分，避免把两种派生规则混为一谈。

## 已完成：`apps/api-platform`

- Quickstart 真实展示 `files → 等待 extracted_text → extract`，SDK 示例从环境变量读取 `MIROBODY_API_KEY`，并正确传递 Subject。
- Data Playground：
  - 文件详情改为读取后端真实字段 `extracted_text`；
  - 文本完成后可直接用 `file_key` 调 `/v1/extract` 并存储标准化读数；
  - 写入前确认“重复执行可能产生重复数据”；
  - 文件仍在后台处理时显示等待提示，不再把整个 JSON 当成抽取文本；
  - 明确设备采集/OAuth 属于调用方，平台负责接收、标准化与 AI 使用。
- Agent Playground 将 `store`、异步 consolidation、reasoning summary、server tool trace 的边界写清。
- Models 展示实时 context window、max output、input/output 单价；Usage 明确只统计请求数。
- Flow Strip 不再暗示所有文件自动标准化，改为仅对 `/data` 与 `/extract` 写入的结构化读数说明 LOINC/UCUM/FHIR。

## 已执行验证

- API Platform 定向 ESLint：通过。
- API Platform Vitest：3 个文件、9 个测试通过。
- API Platform production build：通过；仅有既存的 >500 kB chunk warning。
- `docs.json` 与 API Platform 两份 i18n JSON：可解析。
- 文档导航：106 个条目均存在。
- 文档内部路由：106 个页面通过。
- 中英文树：53 对页面完全镜像。
- MDX import：116 个文件全部解析到现有目标。
- 开源文档引用的源码路径扫描：无实际缺失（`cli/jwt_keygen` 是生成后的二进制名）。

### 已知校验噪声

- `npm run lint -w @mirobody/api-platform` 会在生成文件 `apps/api-platform/public/__/auth/handler*.js` 上报约 427 个既存错误；本轮修改文件的定向 ESLint 全部通过。不要为通过 lint 改生成产物。
- 构建会更新 `apps/api-platform/dist/`，该目录未出现在 git 状态中。
- 当前 macOS 沙箱内运行 git 会出现 `xcrun_db` 临时目录警告，但 git 查询仍能返回结果。

## 发布前必须处理或确认

1. **后端上线门槛**：留存、Subject 级 Responses 删除和只读 Agent 的事实目前只在后端 `test/a12c2d93` 代码中确认。发布对应文档前必须确认目标生产环境已部署这些提交。
2. **中国区门槛**：`api.mirobody.cn`、`platform.mirobody.cn`、`chat.mirobody.cn` 未确认可用前，不得把前端或文档推成中国区生产已上线。
3. **高优先级后端隔离缺陷**：Responses 的 `session_id` 内部仅加 `v1sess-`，没有 owner/Subject namespace；删除 Response 时“是否还有剩余响应”的查询也没有 `owner_user_id` 条件，随后对 `chat_sessions`/checkpoints 的清理同样未按 owner 限定。不同账户复用相同 `session_id` 可能发生线程冲突或错误清理。公开文档已要求使用全局唯一 UUID 规避碰撞，但后端仍应修复为 owner-scoped。
4. **删除语义产品缺口**：`DELETE /v1/sessions/{id}` 不删除 `api_responses`。客户端若要完整清理短期会话，必须先保存并逐个删除 response id，再删 session；或使用 Subject 擦除。
5. **Mintlify 视觉预览尚未执行**：仓库与本机均无 Mintlify CLI；临时下载并执行最新版 CLI 的请求被安全策略拒绝。发布前需在受信任、已安装 Mintlify 的环境启动预览，检查导航、表格、Tabs/Steps/Warning 与中英文锚点的实际渲染。
6. **需要人工确认后再提交/推送**：建议将文档与 `cdm` 分仓提交；先推 `test` 验证 API Platform，再决定生产发布。
