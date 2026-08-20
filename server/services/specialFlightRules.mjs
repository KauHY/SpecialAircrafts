import {
  chineseAirlineIcaoCodes,
  rareAircraftTypes,
  specialLiveries,
} from '../data/specialRegistry.mjs'

const isActiveLivery = (entry, date) => {
  if (!entry) return false
  return (!entry.validFrom || entry.validFrom <= date) && (!entry.validTo || entry.validTo >= date)
}

export function classifyFlights(flights, airport, date, includeAll) {
  const airlineFrequency = new Map()
  for (const flight of flights) {
    const code = flight.airlineCode?.toLocaleUpperCase()
    if (code) airlineFrequency.set(code, (airlineFrequency.get(code) || 0) + 1)
  }

  return flights.map((flight) => {
    const categories = []
    const reasons = []
    let score = 0
    const type = flight.aircraftType?.toLocaleUpperCase()
    const registration = flight.registration?.toLocaleUpperCase()
    const airlineCode = flight.airlineCode?.toLocaleUpperCase()
    const livery = specialLiveries.get(registration)

    if (isActiveLivery(livery, date)) {
      categories.push('special-livery')
      reasons.push(`注册号 ${registration} 命中特别涂装资料库：${livery.name}`)
      score = Math.max(score, 95)
    }

    if (rareAircraftTypes.has(type)) {
      categories.push('rare-type')
      reasons.push(`${rareAircraftTypes.get(type)} 属于重点关注机型`)
      score = Math.max(score, type === 'A225' ? 100 : 88)
    }

    if (flight.serviceType === 'cargo') {
      if (!categories.includes('rare-type')) categories.push('rare-type')
      reasons.push('货运航班，列入特殊机型候选')
      score = Math.max(score, 72)
    }

    if (flight.serviceType === 'business') {
      categories.push('charter')
      reasons.push('公务或通用航空航班')
      score = Math.max(score, 76)
    }

    const isChinaAirport = airport.country === '中国'
    const isForeignCandidate = isChinaAirport && airlineCode && !chineseAirlineIcaoCodes.has(airlineCode)
    if (isForeignCandidate && airlineFrequency.get(airlineCode) === 1) {
      categories.push('rare-airline')
      reasons.push('该航司在今日到港列表中仅出现 1 次，标记为低频候选')
      score = Math.max(score, 68)
    }

    if (includeAll && categories.length === 0) {
      score = 50
      reasons.push('调试模式：显示全部到港航班')
    }

    return {
      ...flight,
      categories: [...new Set(categories)],
      rarityScore: score,
      rarityReason: reasons.join('；') || '尚未命中特别飞机规则',
      livery: isActiveLivery(livery, date) ? livery.name : '',
    }
  }).filter((flight) => includeAll || flight.categories.length > 0)
}

