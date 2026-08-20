export type SpecialCategory = 'rare-airline' | 'special-livery' | 'rare-type' | 'charter'

export type FlightStatus = 'approaching' | 'scheduled' | 'landed' | 'delayed'

export interface Airport {
  iata: string
  icao: string
  name: string
  city: string
  country: string
  timezone: string
}

export interface WeatherSummary {
  temperature: number
  condition: string
  windDirection: string
  windSpeed: number
  visibility: number
  runwayHint: string
}

export interface SpecialFlight {
  id: string
  flightNumber: string
  callsign: string
  airline: string
  airlineCountry: string
  aircraftType: string
  aircraftName: string
  registration: string
  originCode: string
  originCity: string
  destinationCode: string
  scheduledTime: string
  estimatedTime: string
  status: FlightStatus
  terminal?: string
  categories: SpecialCategory[]
  rarityScore: number
  rarityReason: string
  livery?: string
  recentVisits: number
}

export interface AirportSnapshot {
  airport: Airport
  date: string
  lastUpdated: string
  weather: WeatherSummary
  flights: SpecialFlight[]
}

export type FlightFilter = 'all' | SpecialCategory
