import type { Airport, AirportSnapshot } from '../types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({})) as T & { error?: string }
  if (!response.ok) throw new Error(payload.error || `请求失败（HTTP ${response.status}）`)
  return payload
}

export async function getAirportSnapshot(query: string): Promise<AirportSnapshot> {
  const response = await fetch(`${API_BASE_URL}/airports/${encodeURIComponent(query.trim())}/special-flights`)
  return readJson<AirportSnapshot>(response)
}

export async function searchAirports(query: string): Promise<Airport[]> {
  const response = await fetch(`${API_BASE_URL}/airports/search?q=${encodeURIComponent(query.trim())}`)
  const payload = await readJson<{ airports: Airport[] }>(response)
  return payload.airports
}
