import { config } from '../config.mjs'
import { fetchJson } from './http.mjs'

const mapStatus = (flight) => {
  const status = `${flight.status || ''}`.toLocaleLowerCase()
  if (flight.cancelled || status.includes('cancel')) return 'cancelled'
  if (flight.actual_on || flight.actual_in || status.includes('arrived')) return 'landed'
  if ((flight.arrival_delay ?? 0) > 15 * 60 || status.includes('delay')) return 'delayed'
  if (flight.actual_off || flight.actual_out || status.includes('en route')) return 'airborne'
  return 'scheduled'
}

const mapFlight = (flight, airportCode) => ({
  provider: 'flightaware',
  providerId: flight.fa_flight_id || flight.ident || crypto.randomUUID(),
  flightNumber: flight.ident_iata || flight.ident || '',
  callsign: flight.atc_ident || flight.ident_icao || '',
  airlineCode: flight.operator_icao || flight.operator || '',
  airline: flight.operator_name || flight.operator || '',
  aircraftType: flight.aircraft_type || '',
  aircraftName: flight.aircraft_type || '',
  registration: flight.registration || '',
  originCode: flight.origin?.code_iata || flight.origin?.code_icao || flight.origin?.code || '',
  originCity: flight.origin?.city || flight.origin?.name || '',
  destinationCode: flight.destination?.code_iata || flight.destination?.code_icao || airportCode,
  scheduledTime: flight.scheduled_on || flight.scheduled_in || '',
  estimatedTime: flight.estimated_on || flight.estimated_in || '',
  actualTime: flight.actual_on || flight.actual_in || '',
  status: mapStatus(flight),
  terminal: flight.terminal_destination || flight.gate_destination || '',
  serviceType: 'unknown',
  latitude: flight.last_position?.latitude ?? null,
  longitude: flight.last_position?.longitude ?? null,
  weatherText: '',
  updatedAt: flight.last_position?.timestamp || new Date().toISOString(),
})

export const flightAwareProvider = {
  id: 'flightaware',
  label: 'FlightAware',
  isConfigured: () => Boolean(config.flightAware.apiKey),

  async fetchArrivals({ airport, date }) {
    const airportCode = airport.icao || airport.iata
    const center = new Date(`${date}T12:00:00Z`)
    const start = new Date(center.getTime() - 24 * 60 * 60 * 1000).toISOString()
    const end = new Date(center.getTime() + 24 * 60 * 60 * 1000).toISOString()
    const url = new URL(`${config.flightAware.baseUrl}/airports/${airportCode}/flights`)
    url.searchParams.set('start', start)
    url.searchParams.set('end', end)
    url.searchParams.set('max_pages', '5')

    const payload = await fetchJson('FlightAware', url, {
      headers: { 'x-apikey': config.flightAware.apiKey },
    })
    const arrivals = [
      ...(Array.isArray(payload.arrivals) ? payload.arrivals : []),
      ...(Array.isArray(payload.scheduled_arrivals) ? payload.scheduled_arrivals : []),
    ]
    return arrivals.map((flight) => mapFlight(flight, airportCode))
  },
}

