import { config } from '../config.mjs'
import { fetchJson } from './http.mjs'

export const flightradar24Provider = {
  id: 'flightradar24',
  label: 'Flightradar24',
  isConfigured: () => Boolean(config.fr24.token),

  async fetchArrivals({ airport }) {
    const airportCode = airport.icao || airport.iata
    const url = new URL(`${config.fr24.baseUrl}/live/flight-positions/full`)
    url.searchParams.set('airports', `inbound:${airportCode}`)
    url.searchParams.set('limit', '300')

    const payload = await fetchJson('Flightradar24', url, {
      headers: {
        Authorization: `Bearer ${config.fr24.token}`,
        'Accept-Version': 'v1',
      },
    })

    const flights = Array.isArray(payload) ? payload : payload.data || []
    return flights.map((flight) => ({
      provider: this.id,
      providerId: flight.fr24_id || flight.hex || crypto.randomUUID(),
      flightNumber: flight.flight || flight.callsign || '',
      callsign: flight.callsign || '',
      airlineCode: flight.operating_as || flight.operated_as || flight.painted_as || '',
      airline: flight.operating_as || flight.operated_as || flight.painted_as || '',
      aircraftType: flight.type || '',
      aircraftName: flight.type || '',
      registration: flight.reg || '',
      originCode: flight.orig_iata || flight.orig_icao || '',
      originCity: '',
      destinationCode: flight.dest_iata || flight.dest_icao || airportCode,
      scheduledTime: '',
      estimatedTime: flight.eta || '',
      actualTime: '',
      status: 'approaching',
      terminal: '',
      serviceType: flight.category === 'C' ? 'cargo' : flight.category === 'J' ? 'business' : 'unknown',
      latitude: flight.lat ?? null,
      longitude: flight.lon ?? null,
      weatherText: '',
      updatedAt: flight.timestamp ? new Date(flight.timestamp * 1000).toISOString() : new Date().toISOString(),
    }))
  },
}
