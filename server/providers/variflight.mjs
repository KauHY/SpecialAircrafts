import { createHash } from 'node:crypto'
import { config } from '../config.mjs'
import { fetchJson, ProviderError } from './http.mjs'

const md5 = (value) => createHash('md5').update(value).digest('hex')

function createToken(params, security) {
  const serialized = Object.entries(params)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('&')
  return md5(md5(`${serialized}${security}`))
}

const mapStatus = (status = '') => {
  const value = status.toLocaleLowerCase()
  if (value.includes('cancel')) return 'cancelled'
  if (value.includes('arrival') || value.includes('landed')) return 'landed'
  if (value.includes('delay')) return 'delayed'
  if (['descending', 'landing', 'circling'].some((item) => value.includes(item))) return 'approaching'
  if (['departure', 'climbing', 'cruising'].some((item) => value.includes(item))) return 'airborne'
  return 'scheduled'
}

const inferAircraftType = (name = '') => {
  const normalized = name.toLocaleUpperCase().replace(/\s+/g, '')
  const patterns = [
    ['747-8', 'B748'], ['747-400', 'B744'], ['A380', 'A388'],
    ['A340-600', 'A346'], ['A340-500', 'A345'], ['MD-11', 'MD11'],
    ['AN-124', 'A124'], ['IL-76', 'IL76'],
  ]
  return patterns.find(([pattern]) => normalized.includes(pattern))?.[1] || ''
}

export const variFlightProvider = {
  id: 'variflight',
  label: '飞常准',
  isConfigured: () => Boolean(config.variFlight.appId && config.variFlight.appSecurity),

  async fetchArrivals({ airport, date }) {
    const airportCode = airport.iata || airport.icao
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
    const url = new URL(config.variFlight.baseUrl)
    Object.entries({ ...params, token }).forEach(([key, value]) => url.searchParams.set(key, value))

    const payload = await fetchJson('飞常准', url)
    if (!Array.isArray(payload)) {
      const message = payload?.error || payload?.message || '返回格式不符合 Flight Status Query V3 文档'
      throw new ProviderError('飞常准', message)
    }

    return payload.map((flight) => ({
      provider: this.id,
      providerId: `${flight.FlightNo || 'unknown'}-${flight.FlightDeptimePlanDate || ''}`,
      flightNumber: flight.FlightNo || '',
      callsign: '',
      airlineCode: '',
      airline: flight.FlightCompany || '',
      aircraftType: inferAircraftType(flight.generic),
      aircraftName: flight.generic || '',
      registration: '',
      originCode: flight.FlightDepcode || '',
      originCity: flight.FlightDep || flight.FlightDepAirport || '',
      destinationCode: flight.FlightArrcode || airportCode,
      scheduledTime: flight.FlightArrtimePlanDate || '',
      estimatedTime: flight.VeryZhunReadyArrtimeDate || flight.FlightArrtimeReadyDate || '',
      actualTime: flight.FlightArrtimeDate || flight.FlightIngateTime || '',
      status: mapStatus(flight.FlightState),
      terminal: flight.FlightTerminal || '',
      serviceType: flight.fservice === 'F' ? 'cargo' : 'passenger',
      latitude: null,
      longitude: null,
      weatherText: flight.ArrWeather?.split('|||')[0] || '',
      updatedAt: new Date().toISOString(),
    }))
  },
}
