import { config } from '../config.mjs'
import { getQuotaUsage, reserveQuotaUnits } from '../services/quotaLedger.mjs'
import { fetchJson, ProviderError } from './http.mjs'

const requestSpacingMs = 1_050
let requestQueue = Promise.resolve()
let nextRequestAt = 0

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

const normalize = (value = '') => `${value}`.toLocaleUpperCase().replace(/[^A-Z0-9]/g, '')

const aircraftPatterns = [
  [/ANTONOV.*225|AN[- ]?225/, 'A225'],
  [/ANTONOV.*124|AN[- ]?124/, 'A124'],
  [/AIRBUS.*A380|A380[- ]?8/, 'A388'],
  [/BOEING.*747[- ]?8|B747[- ]?8/, 'B748'],
  [/BOEING.*747[- ]?400|B747[- ]?400/, 'B744'],
  [/AIRBUS.*A340[- ]?600|A340[- ]?6/, 'A346'],
  [/AIRBUS.*A340[- ]?500|A340[- ]?5/, 'A345'],
  [/MCDONNELL.*MD[- ]?11|MD[- ]?11/, 'MD11'],
  [/ILYUSHIN.*76|IL[- ]?76/, 'IL76'],
]

const inferIcaoType = (aircraft = {}) => {
  const supplied = aircraft.icaoCode || aircraft.icaoType || aircraft.type || aircraft.typeCode || ''
  if (/^[A-Z0-9]{3,4}$/i.test(supplied)) return normalize(supplied)
  const model = `${aircraft.model || aircraft.modelName || supplied}`.toLocaleUpperCase()
  return aircraftPatterns.find(([pattern]) => pattern.test(model))?.[1] || ''
}

const movementTime = (movement, field) => movement?.[field]?.utc || movement?.[field]?.local || ''

const mapStatus = (flight) => {
  const value = `${flight.status || ''}`.toLocaleLowerCase()
  if (value.includes('cancel')) return 'cancelled'
  if (value.includes('arriv') || value.includes('land')) return 'landed'
  if (value.includes('delay')) return 'delayed'
  if (value.includes('approach') || value.includes('descend')) return 'approaching'
  if (value.includes('enroute') || value.includes('en route') || value.includes('depart')) return 'airborne'
  return 'scheduled'
}

const mapFlight = (flight, airportCode, index) => {
  const departure = flight.departure || (flight.movement?.airport?.iata !== airportCode ? flight.movement : {})
  const arrival = flight.arrival || (flight.movement?.airport?.iata === airportCode ? flight.movement : {})
  const aircraft = flight.aircraft || {}
  const airline = flight.airline || {}
  const scheduledTime = movementTime(arrival, 'scheduledTime') || movementTime(flight.movement, 'scheduledTime')

  return {
    provider: 'aerodatabox',
    providerId: `${flight.number || flight.callSign || 'unknown'}-${scheduledTime || index}`,
    flightNumber: flight.number || '',
    callsign: flight.callSign || '',
    airlineCode: airline.icao || airline.iata || '',
    airline: airline.name || airline.icao || airline.iata || '',
    aircraftType: inferIcaoType(aircraft),
    aircraftName: aircraft.model || aircraft.modelName || aircraft.type || '',
    registration: aircraft.reg || aircraft.registration || '',
    originCode: departure?.airport?.iata || departure?.airport?.icao || '',
    originCity: departure?.airport?.municipalityName || departure?.airport?.shortName || departure?.airport?.name || '',
    destinationCode: arrival?.airport?.iata || arrival?.airport?.icao || airportCode,
    scheduledTime,
    estimatedTime: movementTime(arrival, 'revisedTime') || movementTime(arrival, 'predictedTime'),
    actualTime: movementTime(arrival, 'runwayTime') || movementTime(arrival, 'actualTime'),
    status: mapStatus(flight),
    terminal: arrival?.terminal || arrival?.gate || '',
    serviceType: flight.isCargo ? 'cargo' : flight.isPrivate ? 'business' : 'passenger',
    latitude: flight.location?.lat ?? flight.location?.latitude ?? null,
    longitude: flight.location?.lon ?? flight.location?.longitude ?? null,
    weatherText: '',
    updatedAt: flight.lastUpdatedUtc || new Date().toISOString(),
  }
}

function enqueueRequest(url) {
  const scheduled = requestQueue.then(async () => {
    const delay = Math.max(0, nextRequestAt - Date.now())
    if (delay) await wait(delay)

    const units = config.aeroDataBox.fidsRequestUnitCost
    const budget = config.aeroDataBox.monthlyUnitBudget
    if (!reserveQuotaUnits('aerodatabox', units, budget)) {
      throw new ProviderError(
        'AeroDataBox',
        `已达到本项目设置的每月 ${budget} API units 安全预算；可等待下月或调整 AERODATABOX_MONTHLY_UNIT_BUDGET`,
        429,
      )
    }

    nextRequestAt = Date.now() + requestSpacingMs
    return fetchJson('AeroDataBox', url, {
      headers: {
        'X-RapidAPI-Key': config.aeroDataBox.apiKey,
        'X-RapidAPI-Host': config.aeroDataBox.rapidApiHost,
      },
    })
  })
  requestQueue = scheduled.catch(() => undefined)
  return scheduled
}

export const aeroDataBoxProvider = {
  id: 'aerodatabox',
  label: 'AeroDataBox 免费档',
  isConfigured: () => Boolean(config.aeroDataBox.apiKey),
  getUsage: () => getQuotaUsage('aerodatabox', config.aeroDataBox.monthlyUnitBudget),

  async fetchArrivals({ airport, date }) {
    const codeType = airport.iata ? 'iata' : 'icao'
    const airportCode = airport.iata || airport.icao
    const windows = [
      [`${date}T00:00`, `${date}T12:00`],
      [`${date}T12:00`, `${date}T23:59`],
    ]
    const flights = []

    for (const [fromLocal, toLocal] of windows) {
      const url = new URL(
        `${config.aeroDataBox.baseUrl}/flights/airports/${codeType}/${encodeURIComponent(airportCode)}/${fromLocal}/${toLocal}`,
      )
      url.searchParams.set('direction', 'Arrival')
      url.searchParams.set('withLeg', 'true')
      url.searchParams.set('withCancelled', 'false')
      url.searchParams.set('withCodeshared', 'false')
      url.searchParams.set('withCargo', 'true')
      url.searchParams.set('withPrivate', 'true')
      url.searchParams.set('withLocation', 'false')

      const payload = await enqueueRequest(url)
      const arrivals = Array.isArray(payload?.arrivals) ? payload.arrivals : []
      flights.push(...arrivals)
    }

    return flights.map((flight, index) => mapFlight(flight, airportCode, index))
  },
}

