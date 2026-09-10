const AIRPORTS = [
  ['PVG', 'ZSPD', '上海浦东国际机场', '上海', '中国', 'Asia/Shanghai'],
  ['SHA', 'ZSSS', '上海虹桥国际机场', '上海', '中国', 'Asia/Shanghai'],
].map(([iata, icao, name, city, country, timezone]) => ({ iata, icao, name, city, country, timezone }))

const normalize = (value = '') => value.trim().toLocaleUpperCase()

export function resolveAirport(query) {
  const keyword = normalize(query)
  if (!keyword) return null
  const exact = AIRPORTS.find((airport) => airport.iata === keyword || airport.icao === keyword)
  if (exact) return exact

  // Only resolve a name when it identifies one of the two supported airports.
  // Ambiguous input such as “上海” must not silently select Pudong.
  const matches = AIRPORTS.filter((airport) => airport.name.includes(keyword))
  return matches.length === 1 ? matches[0] : null
}

export function searchAirports(query, limit = 8) {
  const keyword = normalize(query)
  return AIRPORTS.filter((airport) =>
    [airport.iata, airport.icao, airport.name, airport.city]
      .some((field) => field.toLocaleUpperCase().includes(keyword)),
  ).slice(0, limit)
}

export { AIRPORTS }
