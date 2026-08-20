# 特别飞机查询系统 Web MVP

面向航空爱好者的特别飞机发现工具。系统默认以飞常准 Aviation MCP 为第一顺位，以 AeroDataBox 免费计划航班为第二顺位，以 ADSB.lol 开放 ADS-B 数据做候选补充。后端统一航班号、计划时间、机型和注册号，再由规则引擎识别特殊机型、彩绘机、货机、公务机与低频境外航司候选。

> 航班信息可能随机场运行情况变化，请始终以机场和航空公司官方信息为准。

## 功能

- 接受任意 IATA 三字码或 ICAO 四字码，不再限制为三个机场。
- 内置 47 个常用机场的中文名称、城市和时区，可按名称模糊搜索。
- 飞常准新版单 API Key 鉴权与旧版 APP ID 签名均受支持，新版优先。
- 飞常准无数据或请求失败时自动回退 AeroDataBox；ADSB.lol 无需密钥。
- 多来源航班去重、字段互补、可信度评分与数据源状态展示。
- 特殊机型、特别涂装、货机、公务机和低频境外航司候选识别。
- 12 小时机场快照缓存、24 小时失败回退和本地月度额度账本，减少免费额度消耗。
- API 密钥只保存在后端 `.env`，不会进入浏览器构建产物。

## 环境要求

- Node.js 22 或更高版本，推荐 Node.js 24 LTS。
- pnpm 11。

## 本地运行

安装依赖：

```bash
pnpm install
```

复制环境变量模板：

```cmd
copy .env.example .env
```

在 `.env` 中填写飞常准或 AeroDataBox 密钥，然后启动前端和后端：

```bash
pnpm dev
```

- Web：http://127.0.0.1:5173
- 后端健康检查：http://127.0.0.1:8787/api/health

没有配置计划供应商时，应用仍可启动，但不会展示虚构的“今日航班”，页面会提示数据源尚未配置。

## 数据源顺位

默认 `PROVIDER_STRATEGY=priority`，查询顺序如下：

1. 如果存在真正的旧版 V3 APP ID 凭据，飞常准可直接提供机场到港列表。
2. 否则由 AeroDataBox 获取完整机场日程。
3. 飞常准 Aviation MCP 按航班号优先校验最多 4 个特别候选，其字段覆盖后备来源。
4. ADSB.lol 继续补全仍缺少注册号或机型的候选。
5. 启用商业聚合后才考虑 FlightAware 与 FR24。

高顺位计划来源成功返回非空航班表后，低顺位计划来源进入“后备待命”，不会继续消耗额度。需要多源同时聚合时，可显式设置 `PROVIDER_STRATEGY=aggregate`。

### 飞常准 Aviation MCP：第一顺位

在[飞常准 Aviation MCP 页面](https://www.modelscope.cn/mcp/servers/@variflight-ai/variflight-mcp)申请 API Key：

```dotenv
VARIFLIGHT_API_KEY=你的_API_KEY
VARIFLIGHT_MCP_BASE_URL=https://mcp.variflight.com/api/v1/mcp/data
```

后端使用 `X-VARIFLIGHT-KEY` 请求头和 `endpoint=flight`，按航班号校验特别候选。公开 MCP 的路线列表工具要求出发地与到达地，无法单独列出某机场的全部到港，因此机场列表仍需旧 V3 或 AeroDataBox 发现。为控制试用额度，每份快照默认最多校验 4 个候选并缓存 12 小时。若旧 `VARIFLIGHT_APP_SECURITY` 的值以 `sk-` 开头，系统会自动将其识别为新版 MCP Key。

### AeroDataBox：第二顺位

1. 在 [AeroDataBox RapidAPI 页面](https://rapid.aerodatabox.com/pricing)订阅 FREE 计划。
2. 将 RapidAPI Key 写入 `.env`：

```dotenv
AERODATABOX_RAPIDAPI_KEY=你的_RAPIDAPI_KEY
```

机场 FIDS 接口一次最多查询 12 小时，且属于 Tier 2。项目为完整覆盖机场本地当天，会请求 `00:00–12:00` 与 `12:00–23:59` 两段，共计约 4 API units。默认每个“机场 + 日期”缓存 12 小时，并将月度本地预算限制为 500 units，为官方免费档的 600 units 留出余量。

本地消耗记录保存在 `.runtime/api-usage.json`，该目录不会提交到 Git。它是项目侧的安全阀，不等同于 RapidAPI 的最终计费账单；重装或多实例部署时，应在网关侧继续设置硬额度上限。

### ADSB.lol：候选飞机补充

ADSB.lol 无需 API Key。它不提供完整的未来航班计划，因此只用于补全已命中特别规则、但缺少注册号或 ICAO 机型代码的少量候选。默认每份机场快照最多查询 4 个呼号，并缓存 15 分钟：

```dotenv
ADSB_LOL_ENABLED=true
ADSB_LOL_MAX_ENRICHMENT_REQUESTS=4
```

开放 ADS-B 数据不保证覆盖所有地区或所有飞机。生产公开服务前请核对其 ODbL 署名、衍生数据库和敏感航空器处理要求。

## 可选商业数据源

商业源默认整体关闭，即使旧 `.env` 中仍有密钥也不会被调用。确需启用时先设置：

```dotenv
ENABLE_COMMERCIAL_PROVIDERS=true
```

### FlightAware AeroAPI v4

```dotenv
FLIGHTAWARE_API_KEY=你的_AEROAPI_KEY
```

后端调用机场航班接口，补充计划到港、实际到港、注册号和机型等字段。

### Flightradar24 API

```dotenv
FR24_API_TOKEN=你的_FR24_API_TOKEN
```

后端调用实时入港位置接口，补充已经被跟踪飞机的注册号、ICAO 机型、位置和 ETA。FR24 API 不提供尚未开始跟踪的完整未来航班计划，因此建议与飞常准或 FlightAware 组合使用。

## 常用命令

```bash
pnpm dev       # 同时启动 API 和 Web 开发服务
pnpm dev:api   # 只启动后端
pnpm dev:web   # 只启动前端
pnpm build     # TypeScript 检查并构建前端
pnpm start     # 生产模式：后端同时提供 dist 静态文件
```

生产模式：

```bash
pnpm build
pnpm start
```

访问 http://127.0.0.1:8787。

## 缓存与额度行为

- 普通查询优先返回 12 小时内的机场当日快照，不重复调用上游 API。
- 上游请求失败时，可返回 24 小时容错期内的上一份内存快照。
- `refresh=1` 会跳过快照缓存，但仍受本地月度预算保护。
- 同一机场和日期的并发请求会合并为一次上游任务，避免 React 开发模式重复加载消耗额度。
- AeroDataBox 的两个请求至少间隔 1.5 秒，为免费档 1 req/s 限制留出边界余量。
- 对瞬时网络错误、HTTP 429 和上游 5xx，每个 12 小时时段最多自动重试一次。
- AeroDataBox 的月度账本按 UTC 自然月重置；RapidAPI 实际账期可能不同，应以其控制台为准。
- `.runtime` 账本只适合单实例 MVP。多实例部署应改用 Redis 或数据库中的原子计数器。

## 后端接口

```http
GET /api/health
GET /api/airports/search?q=上海
GET /api/airports/PVG/special-flights
GET /api/airports/ZSPD/special-flights?date=2026-08-20
GET /api/airports/LHR/special-flights?refresh=1
```

`refresh=1` 会跳过本地快照并消耗新的供应商查询额度，仅建议用于排障或人工校验。

## 特别飞机资料库

特殊涂装按注册号维护在 `server/data/specialRegistry.mjs`。默认不预置未经核验的彩绘机数据，以避免过期或错误标记。正式产品应增加管理后台，并为每条涂装记录保存来源、有效期和复核时间。

更完整的架构、字段合并和限制说明参见《系统设计文档.md》。
