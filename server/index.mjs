import express from 'express'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from './config.mjs'
import { resolveAirport, searchAirports } from './data/airports.mjs'
import {
  aggregateAirportSnapshot,
  getAirportLocalDate,
  getProviderConfiguration,
} from './services/aggregator.mjs'

const app = express()
const rootDir = dirname(dirname(fileURLToPath(import.meta.url)))
const distDir = join(rootDir, 'dist')

app.disable('x-powered-by')
app.use(express.json({ limit: '32kb' }))

app.get('/api/health', (_request, response) => {
  response.json({
    ok: true,
    time: new Date().toISOString(),
    providers: getProviderConfiguration(),
  })
})

app.get('/api/airports/search', (request, response) => {
  const query = typeof request.query.q === 'string' ? request.query.q : ''
  response.json({ airports: searchAirports(query) })
})

app.get('/api/airports/:query/special-flights', async (request, response) => {
  const airport = resolveAirport(request.params.query)
  if (!airport) {
    return response.status(400).json({ error: '请输入有效的机场名称、IATA 三字码或 ICAO 四字码。' })
  }

  const requestedDate = typeof request.query.date === 'string' ? request.query.date : ''
  const date = /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) ? requestedDate : getAirportLocalDate(airport)
  const refresh = request.query.refresh === '1'

  try {
    const snapshot = await aggregateAirportSnapshot(airport, date, refresh)
    response.setHeader('Cache-Control', 'private, max-age=30')
    return response.json(snapshot)
  } catch (error) {
    const message = error instanceof Error ? error.message : '航班数据聚合失败'
    return response.status(502).json({ error: message })
  }
})

if (existsSync(distDir)) {
  app.use(express.static(distDir, { maxAge: '1h', index: false }))
  app.use((request, response, next) => {
    if (request.path.startsWith('/api/')) return next()
    return response.sendFile(join(distDir, 'index.html'))
  })
}

app.use((request, response) => {
  response.status(404).json({ error: `未找到接口：${request.method} ${request.path}` })
})

app.listen(config.port, '127.0.0.1', () => {
  const configured = getProviderConfiguration().filter((provider) => provider.configured).map((provider) => provider.label)
  console.log(`Special Aircrafts API: http://127.0.0.1:${config.port}`)
  console.log(configured.length ? `已配置数据源：${configured.join('、')}` : '尚未配置真实数据源，请参考 .env.example')
})

