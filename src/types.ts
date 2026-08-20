export type SpecialCategory = 'rare-airline' | 'special-livery' | 'rare-type' | 'charter'

export type FlightStatus = 'approaching' | 'scheduled' | 'landed' | 'delayed' | 'cancelled'

export type DataMode = 'fresh' | 'cached' | 'partial' | 'unavailable' | 'error'
export type DataQuality = 'high' | 'medium' | 'low'

export interface Airport {
  iata: string
  icao: string
  name: string
  city: string
  country: string
  timezone: string
}

export interface WeatherSummary {
  temperature: number | null
  condition: string
  windDirection: string
  windSpeed: number | null
  visibility: number | null
  runwayHint: string
}

export interface ProviderStatus {
  id: string
  label: string
  configured: boolean
  ok: boolean
  recordCount: number
  role: 'schedule' | 'enrichment'
  quota?: {
    used: number
    budget: number
    remaining: number
    resetsAt: string
  }
  error?: string
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
  recentVisits: number | null
  actualTime: string
  sources: string[]
  confidence: number
  dataQuality: DataQuality
  latitude: number | null
  longitude: number | null
  lastUpdated: string
}

export interface AirportSnapshot {
  airport: Airport
  date: string
  lastUpdated: string
  weather: WeatherSummary
  flights: SpecialFlight[]
  dataMode: DataMode
  providers: ProviderStatus[]
  notice: string
}

export type FlightFilter = 'all' | SpecialCategory
