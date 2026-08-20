import { config } from '../config.mjs'
import { adsbLolProvider } from '../providers/adsblol.mjs'
import { aeroDataBoxProvider } from '../providers/aerodatabox.mjs'
import { flightAwareProvider } from '../providers/flightaware.mjs'
import { flightradar24Provider } from '../providers/flightradar24.mjs'
import { variFlightProvider } from '../providers/variflight.mjs'
import { classifyFlights } from './specialFlightRules.mjs'

const commercialProviders = [variFlightProvider, flightAwareProvider, flightradar24Provider]
const scheduleProviders = [
  aeroDataBoxProvider,
  ...(config.enableCommercialProviders ? commercialProviders : []),
]
const enrichmentProviders = [adsbLolProvider]
const providers = [...scheduleProviders, ...enrichmentProviders]
const cache = new Map()

const normalizeIdentity = (value = '') => value.toLocaleUpperCase().replace(/[^A-Z0-9]/g, '')

const formatTime = (value, timezone) => {
  if (!value) return '--:--'
  if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}/.test(value)) return value.slice(11, 16)
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return `${value}`.slice(0, 5)
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

const localDate = (value, timezone) => {
  if (!value) return ''
  if (/^\d{4}-\d{2}-\d{2}\s/.test(value)) return value.slice(0, 10)
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(parsed)
}

const statusRank = {
  cancelled: 6,
  landed: 5,
  approaching: 4,
  airborne: 3,
  delayed: 2,
  scheduled: 1,
}

const mergeValue = (current, incoming) => current || incoming

function mergeFlights(records, airport, date) {
  const groups = new Map()

  for (const record of records) {
    const eventTime = record.scheduledTime || record.estimatedTime || record.actualTime
    if (eventTime && localDate(eventTime, airport.timezone) && localDate(eventTime, airport.timezone) !== date) continue

    const flightId = normalizeIdentity(record.flightNumber || record.callsign)
    const routeId = normalizeIdentity(record.originCode) + normalizeIdentity(record.destinationCode)
    const registrationId = normalizeIdentity(record.registration)
    const key = flightId ? `${flightId}-${routeId}` : `${registrationId || record.providerId}-${routeId}`
    const current = groups.get(key)

    if (!current) {
      groups.set(key, { ...record, sources: [record.provider] })
      continue
    }

    const nextStatus = (statusRank[record.status] || 0) > (statusRank[current.status] || 0)
      ? record.status
      : current.status

    groups.set(key, {
      ...current,
      flightNumber: mergeValue(current.flightNumber, record.flightNumber),
      callsign: mergeValue(current.callsign, record.callsign),
      airlineCode: mergeValue(current.airlineCode, record.airlineCode),
      airline: mergeValue(current.airline, record.airline),
      aircraftType: mergeValue(current.aircraftType, record.aircraftType),
      aircraftName: mergeValue(current.aircraftName, record.aircraftName),
      registration: mergeValue(current.registration, record.registration),
      originCode: mergeValue(current.originCode, record.originCode),
      originCity: mergeValue(current.originCity, record.originCity),
      destinationCode: mergeValue(current.destinationCode, record.destinationCode),
      scheduledTime: mergeValue(current.scheduledTime, record.scheduledTime),
      estimatedTime: mergeValue(record.estimatedTime, current.estimatedTime),
      actualTime: mergeValue(record.actualTime, current.actualTime),
      terminal: mergeValue(record.terminal, current.terminal),
      serviceType: current.serviceType !== 'unknown' ? current.serviceType : record.serviceType,
      status: nextStatus,
      latitude: record.latitude ?? current.latitude,
      longitude: record.longitude ?? current.longitude,
      weatherText: mergeValue(record.weatherText, current.weatherText),
      updatedAt: record.updatedAt > current.updatedAt ? record.updatedAt : current.updatedAt,
      sources: [...new Set([...current.sources, record.provider])],
    })
  }

  return [...groups.values()]
}

const sourceLabels = {
  aerodatabox: 'AeroDataBox',
  adsblol: 'ADSB.lol',
  variflight: '飞常准',
  flightaware: 'FlightAware',
  flightradar24: 'Flightradar24',
}

const toClientFlight = (flight, airport) => {
  const completeness = [flight.registration, flight.aircraftType || flight.aircraftName, flight.estimatedTime || flight.actualTime]
    .filter(Boolean).length
  const confidence = Math.min(99, 50 + flight.sources.length * 14 + completeness * 3)
  const displayTime = flight.actualTime || flight.estimatedTime || flight.scheduledTime

  return {
    id: `${flight.sources[0]}-${flight.providerId}`,
    flightNumber: flight.flightNumber || flight.callsign || '未知航班',
    callsign: flight.callsign || '--',
    airline: flight.airline || flight.airlineCode || '运营方待确认',
    airlineCountry: '待确认',
    aircraftType: flight.aircraftType || '--',
    aircraftName: flight.aircraftName || flight.aircraftType || '机型待确认',
    registration: flight.registration || '待起飞后确认',
    originCode: flight.originCode || '---',
    originCity: flight.originCity || '始发地待确认',
    destinationCode: airport.iata || airport.icao,
    scheduledTime: formatTime(flight.scheduledTime, airport.timezone),
    estimatedTime: formatTime(displayTime, airport.timezone),
    actualTime: formatTime(flight.actualTime, airport.timezone),
    status: flight.status === 'airborne' ? 'approaching' : flight.status,
    terminal: flight.terminal || '待确认',
    categories: flight.categories,
    rarityScore: flight.rarityScore,
    rarityReason: flight.rarityReason,
    livery: flight.livery || '',
    recentVisits: null,
    sources: flight.sources.map((source) => sourceLabels[source] || source),
    confidence,
    dataQuality: confidence >= 85 ? 'high' : confidence >= 70 ? 'medium' : 'low',
    latitude: flight.latitude,
    longitude: flight.longitude,
    lastUpdated: flight.updatedAt,
  }
}

export function getProviderConfiguration() {
  return providers.map((provider) => ({
    id: provider.id,
    label: provider.label,
    configured: provider.isConfigured(),
    role: enrichmentProviders.includes(provider) ? 'enrichment' : 'schedule',
    ...(provider.getUsage ? { quota: provider.getUsage() } : {}),
  }))
}

export async function aggregateAirportSnapshot(airport, date, bypassCache = false) {
  const cacheKey = `${airport.iata || airport.icao}-${date}`
  const cached = cache.get(cacheKey)
  if (!bypassCache && cached && cached.expiresAt > Date.now()) {
    return {
      ...cached.value,
      dataMode: 'cached',
      notice: `正在展示 ${Math.round(config.cacheTtlMs / 3_600_000)} 小时缓存内的当日计划快照，不会重复消耗免费 API 额度。`,
    }
  }

  const enabledProviders = scheduleProviders.filter((provider) => provider.isConfigured())
  if (enabledProviders.length === 0) {
    return {
      airport,
      date,
      lastUpdated: new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()),
      weather: { temperature: null, condition: '暂无实时天气', windDirection: '', windSpeed: null, visibility: null, runwayHint: '等待数据源' },
      flights: [],
      dataMode: 'unavailable',
      providers: getProviderConfiguration().map((provider) => ({
        ...provider,
        ok: provider.role === 'enrichment' && provider.configured,
        recordCount: 0,
      })),
      notice: '尚未配置计划航班数据源。推荐申请 AeroDataBox RapidAPI 免费档，并在 .env 中填写 AERODATABOX_RAPIDAPI_KEY。',
    }
  }

  const settled = await Promise.allSettled(
    enabledProviders.map(async (provider) => ({
      provider,
      records: await provider.fetchArrivals({ airport, date }),
    })),
  )
  const allRecords = []
  const providerResults = getProviderConfiguration().map((provider) => ({ ...provider, ok: false, recordCount: 0 }))

  settled.forEach((result, index) => {
    const provider = enabledProviders[index]
    const status = providerResults.find((item) => item.id === provider.id)
    if (result.status === 'fulfilled') {
      allRecords.push(...result.value.records)
      Object.assign(status, { ok: true, recordCount: result.value.records.length })
    } else {
      Object.assign(status, {
        ok: false,
        recordCount: 0,
        error: result.reason instanceof Error ? result.reason.message : '未知错误',
      })
    }
  })

  const successful = providerResults.filter((provider) => provider.configured && provider.ok)
  const merged = mergeFlights(allRecords, airport, date)
  const preliminaryCandidates = classifyFlights(merged, airport, date, false)
  const adsbStatus = providerResults.find((provider) => provider.id === adsbLolProvider.id)
  if (adsbLolProvider.isConfigured()) {
    const enrichment = await adsbLolProvider.enrichFlights(preliminaryCandidates)
    for (const { flight, result } of enrichment.updates) {
      const target = merged.find((item) => (
        item.provider === flight.provider
        && item.providerId === flight.providerId
      ))
      if (!target) continue
      target.registration ||= result.registration
      target.aircraftType ||= result.aircraftType
      target.callsign ||= result.callsign
      target.latitude = result.latitude ?? target.latitude
      target.longitude = result.longitude ?? target.longitude
      target.updatedAt = result.updatedAt || target.updatedAt
      target.sources = [...new Set([...target.sources, adsbLolProvider.id])]
    }
    Object.assign(adsbStatus, {
      ok: enrichment.attempted === 0 || enrichment.updates.length > 0 || enrichment.errors.length === 0,
      recordCount: enrichment.updates.length,
      ...(enrichment.errors.length && enrichment.updates.length === 0 ? { error: enrichment.errors[0] } : {}),
    })
  }

  const classified = classifyFlights(merged, airport, date, config.includeAllFlights)
    .map((flight) => toClientFlight(flight, airport))
    .sort((left, right) => right.rarityScore - left.rarityScore || left.estimatedTime.localeCompare(right.estimatedTime))
  const weatherText = merged.find((flight) => flight.weatherText)?.weatherText
  const successfulSchedules = successful.filter((provider) => provider.role === 'schedule')
  const dataMode = successfulSchedules.length === enabledProviders.length ? 'fresh' : successfulSchedules.length ? 'partial' : 'error'
  const notice = dataMode === 'fresh'
    ? `已生成今日低频计划快照，来源：${successfulSchedules.map((item) => item.label).join('、')}；注册号可能在飞机起飞后才出现。`
    : dataMode === 'partial'
      ? '部分数据源请求失败，当前结果可能不完整。'
      : '已配置的数据源均请求失败，请检查密钥、IP 白名单和接口额度。'

  if (dataMode === 'error' && cached && cached.staleUntil > Date.now()) {
    return {
      ...cached.value,
      dataMode: 'cached',
      providers: providerResults,
      notice: '本次免费数据源请求失败，正在展示 24 小时容错期内的上一份快照。',
    }
  }

  const snapshot = {
    airport,
    date,
    lastUpdated: new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()),
    weather: {
      temperature: null,
      condition: weatherText || '天气数据待接入',
      windDirection: '',
      windSpeed: null,
      visibility: null,
      runwayHint: '跑道方向须结合实时机场运行数据确认',
    },
    flights: classified,
    dataMode,
    providers: providerResults,
    notice,
  }
  if (successfulSchedules.length) {
    cache.set(cacheKey, {
      value: snapshot,
      expiresAt: Date.now() + config.cacheTtlMs,
      staleUntil: Date.now() + config.staleCacheTtlMs,
    })
  }
  return snapshot
}

export function getAirportLocalDate(airport) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: airport.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}
