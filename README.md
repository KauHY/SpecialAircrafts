# 特别飞机查询系统 Web MVP

面向航空爱好者的特别飞机发现工具。系统默认以 AeroDataBox 免费计划航班为主数据源，以 ADSB.lol 开放 ADS-B 数据做候选补充，统一航班号、计划时间、机型和注册号，再由规则引擎识别特殊机型、彩绘机、货机、公务机与低频境外航司候选。飞常准、FlightAware 与 Flightradar24 保留为可选增强源。

> 航班信息可能随机场运行情况变化，请始终以机场和航空公司官方信息为准。

## 功能

- 接受任意 IATA 三字码或 ICAO 四字码，不再限制为三个机场。
- 内置 47 个常用机场的中文名称、城市和时区，可按名称模糊搜索。
- AeroDataBox RapidAPI 免费档覆盖全球机场当日到港计划；ADSB.lol 无需密钥。
- 飞常准、FlightAware、Flightradar24 可作为可选后备或增强源。
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

在 `.env` 中填写 AeroDataBox RapidAPI 免费密钥，然后启动前端和后端：

```bash
pnpm dev
```

- Web：http://127.0.0.1:5173
- 后端健康检查：http://127.0.0.1:8787/api/health

没有配置计划供应商时，应用仍可启动，但不会展示虚构的“今日航班”，页面会提示数据源尚未配置。

## 推荐的免费数据方案

### AeroDataBox：当天计划主源

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

### 飞常准 VariFlight

```dotenv
VARIFLIGHT_APP_ID=你的_APP_ID
VARIFLIGHT_APP_SECURITY=你的注册安全码
```

飞常准 Flight Status Query V3 同时校验 Token 和服务器出口 IP。生产部署前需要向飞常准申请凭据并配置 IP 白名单。

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
