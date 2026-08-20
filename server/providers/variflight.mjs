import { createHash } from 'node:crypto'
import { config } from '../config.mjs'
import { fetchJson, ProviderError } from './http.mjs'

const md5 = (value) => createHash('md5').update(value).digest('hex')
const mcpCache = new Map()

function createToken(params, security) {
  const serialized = Object.entries(params)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('&')
  return md5(md5(`${serialized}${security}`))
}

const first = (...values) => values.find((value) => value !== undefined && value !== null && value !== '') ?? ''

const mapStatus = (status = '') => {
  const value = `${status}`.toLocaleLowerCase()
  if (value.includes('cancel') || value.includes('取消')) return 'cancelled'
  if (value.includes('arrival') || value.includes('landed') || value.includes('到达')) return 'landed'
  if (value.includes('delay') || value.includes('延误')) return 'delayed'
  if (['descending', 'landing', 'circling', '进近', '下降'].some((item) => value.includes(item))) return 'approaching'
  if (['departure', 'climbing', 'cruising', '起飞', '途中'].some((item) => value.includes(item))) return 'airborne'
  return 'scheduled'
}

const inferAircraftType = (name = '') => {
  const normalized = `${name}`.toLocaleUpperCase().replace(/\s+/g, '')
  const patterns = [
    ['747-8', 'B748'], ['747-400', 'B744'], ['A380', 'A388'],
    ['A340-600', 'A346'], ['A340-500', 'A345'], ['MD-11', 'MD11'],
    ['AN-225', 'A225'], ['AN-124', 'A124'], ['IL-76', 'IL76'],
  ]
  return patterns.find(([pattern]) => normalized.includes(pattern))?.[1] || ''
}

const parsePossibleJson = (value) => {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

function extractFlights(payload) {
  if (payload?.code && Number(payload.code) !== 200) {
    throw new ProviderError('飞常准 MCP', payload.message || `业务状态码 ${payload.code}`)
  }

  const data = parsePossibleJson(payload?.data ?? payload)
  if (data?.error_code) {
    if (Number(data.error_code) === 10) return []
    throw new ProviderError('飞常准 MCP', data.error || `业务错误码 ${data.error_code}`)
  }

  const findArray = (value, depth = 0) => {
    const parsed = parsePossibleJson(value)
    if (Array.isArray(parsed)) return parsed
    if (!parsed || typeof parsed !== 'object' || depth >= 5) return null
    for (const nested of Object.values(parsed)) {
      const found = findArray(nested, depth + 1)
      if (found) return found
    }
    return null
  }
  const candidates = [
    data,
    data?.flights,
    data?.flightInfos,
    data?.flightList,
    data?.list,
    data?.rows,
    data?.result,
  ].map(parsePossibleJson)
  const flights = candidates.find(Array.isArray) || findArray(data)
  const looksLikeFlight = data && typeof data === 'object' && [
    'FlightNo', 'flightNo', 'flightNumber', 'fnum',
  ].some((key) => data[key])
  if (!flights && looksLikeFlight) return [data]
  if (!flights) {
    throw new ProviderError('飞常准 MCP', '返回内容中未找到航班列表')
  }
  return flights
}

const mapFlight = (flight, airportCode, index) => {
  const flightNumber = first(flight.FlightNo, flight.flightNo, flight.flightNumber, flight.fnum, flight.flight_no)
  const scheduledTime = first(
    flight.FlightArrtimePlanDate,
    flight.arrTimePlan,
    flight.scheduledArrival,
    flight.scheduled_arrival,
    flight.arrtime,
  )
  const aircraftName = first(
    flight.generic,
    flight.aircraftTypeName,
    flight.aircraftName,
    flight.aircraft_type_name,
    flight.aircraftType,
  )

  return {
    provider: 'variflight',
    providerId: first(flight.flightId, flight.id, `${flightNumber || 'unknown'}-${scheduledTime || index}`),
    flightNumber,
    callsign: first(flight.callSign, flight.callsign),
    airlineCode: first(flight.airlineIcao, flight.airlineICAO, flight.airlineCode, flight.airline_code),
    airline: first(flight.FlightCompany, flight.airlineName, flight.airline, flight.airline_name),
    aircraftType: first(flight.aircraftIcao, flight.aircraftICAO, flight.aircraftCode, inferAircraftType(aircraftName)),
    aircraftName,
    registration: first(flight.anum, flight.registration, flight.aircraftRegistration, flight.aircraft_no),
    originCode: first(flight.FlightDepcode, flight.dep, flight.depCode, flight.departureAirportCode, flight.dep_code),
    originCity: first(flight.FlightDep, flight.FlightDepAirport, flight.depCity, flight.departureAirportName),
    destinationCode: first(flight.FlightArrcode, flight.arr, flight.arrCode, flight.arrivalAirportCode, airportCode),
    scheduledTime,
    estimatedTime: first(
      flight.VeryZhunReadyArrtimeDate,
      flight.FlightArrtimeReadyDate,
      flight.estimatedArrival,
      flight.estimated_arrival,
    ),
    actualTime: first(flight.FlightArrtimeDate, flight.FlightIngateTime, flight.actualArrival, flight.actual_arrival),
    status: mapStatus(first(flight.FlightState, flight.status, flight.flightStatus)),
    terminal: first(flight.FlightTerminal, flight.arrTerminal, flight.terminal, flight.gate),
    serviceType: first(flight.fservice, flight.serviceType) === 'F' || flight.isCargo ? 'cargo' : 'passenger',
    latitude: first(flight.latitude, flight.lat) || null,
    longitude: first(flight.longitude, flight.lon, flight.lng) || null,
    weatherText: first(flight.ArrWeather?.split?.('|||')[0], flight.arrivalWeather),
    updatedAt: first(flight.updatedAt, flight.updateTime, new Date().toISOString()),
  }
}

async function fetchMcpFlight(flight, date) {
  const payload = await fetchJson('飞常准 MCP', config.variFlight.mcpBaseUrl, {
    method: 'POST',
    headers: {
      'X-VARIFLIGHT-KEY': config.variFlight.apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      endpoint: 'flight',
      params: {
        fnum: `${flight.flightNumber}`.replace(/\s+/g, ''),
        date,
      },
    }),
  })
  return extractFlights(payload)
}

async function fetchLegacyArrivals(airportCode, date) {
  const params = {
    airport: airportCode,
    appid: config.variFlight.appId,
    date,
    lang: 'en',
    page: '1',
    perpage: '100',
    status: 'ARR',
  }
  const token = createToken(params, config.variFlight.appSecurity)
  const url = new URL(config.variFlight.legacyBaseUrl)
  Object.entries({ ...params, token }).forEach(([key, value]) => url.searchParams.set(key, value))
  const payload = await fetchJson('飞常准旧版 API', url)

  if (!Array.isArray(payload)) {
    throw new ProviderError('飞常准旧版 API', payload?.error || payload?.message || '返回格式不符合 Flight Status Query V3 文档')
  }
  return payload
}

export const variFlightProvider = {
  id: 'variflight_legacy',
  label: '飞常准旧版 V3（计划优先）',
  isConfigured: () => config.variFlight.legacyConfigured,
  getMode: () => '旧版 V3',

  async fetchArrivals({ airport, date }) {
    const airportCode = airport.iata || airport.icao
    const flights = await fetchLegacyArrivals(airportCode, date)
    return flights.map((flight, index) => mapFlight(flight, airportCode, index))
  },
}

async function lookupMcpFlight(flight, date, airportCode) {
  const key = `${date}-${`${flight.flightNumber}`.replace(/\s+/g, '').toLocaleUpperCase()}`
  const cached = mcpCache.get(key)
  if (cached && cached.expiresAt > Date.now()) return cached.value

  const flights = await fetchMcpFlight(flight, date)
  const value = flights[0] ? mapFlight(flights[0], airportCode, 0) : null
  mcpCache.set(key, { value, expiresAt: Date.now() + config.variFlight.mcpCacheTtlMs })
  return value
}

export const variFlightMcpProvider = {
  id: 'variflight',
  label: '飞常准 MCP（优先校验）',
  isConfigured: () => Boolean(config.variFlight.apiKey),
  getMode: () => `Aviation MCP${config.variFlight.apiKeySource === '兼容旧变量' ? '（已兼容旧变量）' : ''}`,

  async enrichFlights(flights, date, airport) {
    const candidates = flights
      .filter((flight) => flight.flightNumber && flight.flightNumber !== '未知航班')
      .slice(0, config.variFlight.mcpMaxEnrichmentRequests)
    const updates = []
    const errors = []
    const airportCode = airport.iata || airport.icao

    for (const flight of candidates) {
      try {
        const result = await lookupMcpFlight(flight, date, airportCode)
        if (result) updates.push({ flight, result })
      } catch (error) {
        errors.push(error instanceof Error ? error.message : '飞常准 MCP 查询失败')
      }
    }
    return { attempted: candidates.length, updates, errors }
  },
}
