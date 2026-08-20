# 特别飞机查询系统 Web MVP

面向航空爱好者的特别飞机发现工具。系统通过后端聚合飞常准、FlightAware 与 Flightradar24 的官方 API，统一航班号、计划/预计时间、机型和注册号，再由规则引擎识别特殊机型、彩绘机、货机、公务机与低频境外航司候选。

> 航班信息可能随机场运行情况变化，请始终以机场和航空公司官方信息为准。

## 功能

- 接受任意 IATA 三字码或 ICAO 四字码，不再限制为三个机场。
- 内置 47 个常用机场的中文名称、城市和时区，可按名称模糊搜索。
- 同时支持飞常准、FlightAware、Flightradar24，也允许只配置其中一家。
- 多来源航班去重、字段互补、可信度评分与数据源状态展示。
- 特殊机型、特别涂装、货机、公务机和低频境外航司候选识别。
- 120 秒内存缓存，减少 API 额度消耗。
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

在 `.env` 中填写至少一个官方 API 的凭据，然后启动前端和后端：

```bash
pnpm dev
```

- Web：http://127.0.0.1:5173
- 后端健康检查：http://127.0.0.1:8787/api/health

没有配置供应商时，应用仍可启动，但不会再展示虚构的“今日航班”，页面会提示数据源尚未配置。

## 数据源配置

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

## 后端接口

```http
GET /api/health
GET /api/airports/search?q=上海
GET /api/airports/PVG/special-flights
GET /api/airports/ZSPD/special-flights?date=2026-08-20
GET /api/airports/LHR/special-flights?refresh=1
```

`refresh=1` 会跳过本地短时缓存并消耗新的供应商查询额度，仅建议用于人工刷新。

## 特别飞机资料库

特殊涂装按注册号维护在 `server/data/specialRegistry.mjs`。默认不预置未经核验的彩绘机数据，以避免过期或错误标记。正式产品应增加管理后台，并为每条涂装记录保存来源、有效期和复核时间。

更完整的架构、字段合并和限制说明参见《系统设计文档.md》。
