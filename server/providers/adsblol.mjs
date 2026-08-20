import { config } from '../config.mjs'
import { fetchJson } from './http.mjs'

const cache = new Map()

const normalize = (value = '') => `${value}`.toLocaleUpperCase().replace(/[^A-Z0-9]/g, '')

const pickAircraft = (payload, callsign) => {
  const aircraft = Array.isArray(payload?.ac) ? payload.ac : []
  const expected = normalize(callsign)
  return aircraft.find((item) => normalize(item.flight) === expected) || aircraft[0] || null
}

async function lookup(callsign) {
  const key = normalize(callsign)
  const cached = cache.get(key)
  if (cached && cached.expiresAt > Date.now()) return cached.value

  const url = `${config.adsbLol.baseUrl}/v2/callsign/${encodeURIComponent(key)}`
  const payload = await fetchJson('ADSB.lol', url)
  const aircraft = pickAircraft(payload, key)
  const value = aircraft ? {
    registration: aircraft.r || '',
    aircraftType: aircraft.t || '',
    callsign: `${aircraft.flight || callsign}`.trim(),
    latitude: aircraft.lat ?? null,
    longitude: aircraft.lon ?? null,
    updatedAt: new Date().toISOString(),
  } : null
  cache.set(key, { value, expiresAt: Date.now() + config.adsbLol.cacheTtlMs })
  return value
}

export const adsbLolProvider = {
  id: 'adsblol',
  label: 'ADSB.lol 开放数据',
  isConfigured: () => config.adsbLol.enabled,

  async enrichFlights(flights) {
    const candidates = flights
      .filter((flight) => flight.callsign && (!flight.registration || !flight.aircraftType))
      .slice(0, config.adsbLol.maxEnrichmentRequests)
    const updates = []
    const errors = []

    for (const flight of candidates) {
      try {
        const result = await lookup(flight.callsign)
        if (result) updates.push({ flight, result })
      } catch (error) {
        errors.push(error instanceof Error ? error.message : 'ADSB.lol 查询失败')
      }
    }

    return { attempted: candidates.length, updates, errors }
  },
}
