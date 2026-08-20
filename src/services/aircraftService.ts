import { airportSnapshots } from '../data/mockData'
import type { AirportSnapshot } from '../types'

const normalize = (value: string) => value.trim().toLocaleLowerCase()

export const listSupportedAirports = () => airportSnapshots.map(({ airport }) => airport)

export async function getAirportSnapshot(query: string): Promise<AirportSnapshot> {
  const keyword = normalize(query)

  await new Promise((resolve) => window.setTimeout(resolve, 280))

  const snapshot = airportSnapshots.find(({ airport }) => {
    const fields = [airport.iata, airport.icao, airport.name, airport.city]
    return fields.some((field) => normalize(field).includes(keyword))
  })

  if (!snapshot) {
    throw new Error('暂未找到该机场。MVP 示例目前支持 PVG、HKG 和 PEK。')
  }

  return snapshot
}
