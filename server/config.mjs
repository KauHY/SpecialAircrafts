import 'dotenv/config'

const positiveNumber = (value, fallback) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

const nonNegativeNumber = (value, fallback) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

const enabledUnlessFalse = (value) => `${value ?? 'true'}`.toLocaleLowerCase() !== 'false'

export const config = {
  port: positiveNumber(process.env.PORT, 8787),
  cacheTtlMs: positiveNumber(process.env.CACHE_TTL_SECONDS, 43_200) * 1000,
  staleCacheTtlMs: positiveNumber(process.env.STALE_CACHE_TTL_SECONDS, 86_400) * 1000,
  providerTimeoutMs: positiveNumber(process.env.PROVIDER_TIMEOUT_MS, 10_000),
  includeAllFlights: process.env.INCLUDE_ALL_FLIGHTS === 'true',
  enableCommercialProviders: process.env.ENABLE_COMMERCIAL_PROVIDERS === 'true',
  aeroDataBox: {
    apiKey: process.env.AERODATABOX_RAPIDAPI_KEY?.trim() ?? '',
    baseUrl: (process.env.AERODATABOX_BASE_URL || 'https://aerodatabox.p.rapidapi.com').replace(/\/$/, ''),
    rapidApiHost: process.env.AERODATABOX_RAPIDAPI_HOST || 'aerodatabox.p.rapidapi.com',
    monthlyUnitBudget: nonNegativeNumber(process.env.AERODATABOX_MONTHLY_UNIT_BUDGET, 500),
    fidsRequestUnitCost: positiveNumber(process.env.AERODATABOX_FIDS_UNIT_COST, 2),
  },
  adsbLol: {
    enabled: enabledUnlessFalse(process.env.ADSB_LOL_ENABLED),
    baseUrl: (process.env.ADSB_LOL_BASE_URL || 'https://api.adsb.lol').replace(/\/$/, ''),
    cacheTtlMs: positiveNumber(process.env.ADSB_LOL_CACHE_TTL_SECONDS, 900) * 1000,
    maxEnrichmentRequests: nonNegativeNumber(process.env.ADSB_LOL_MAX_ENRICHMENT_REQUESTS, 4),
  },
  flightAware: {
    apiKey: process.env.FLIGHTAWARE_API_KEY?.trim() ?? '',
    baseUrl: (process.env.FLIGHTAWARE_BASE_URL || 'https://aeroapi.flightaware.com/aeroapi').replace(/\/$/, ''),
  },
  fr24: {
    token: process.env.FR24_API_TOKEN?.trim() ?? '',
    baseUrl: (process.env.FR24_BASE_URL || 'https://fr24api.flightradar24.com/api').replace(/\/$/, ''),
  },
  variFlight: {
    appId: process.env.VARIFLIGHT_APP_ID?.trim() ?? '',
    appSecurity: process.env.VARIFLIGHT_APP_SECURITY?.trim() ?? '',
    baseUrl: process.env.VARIFLIGHT_BASE_URL || 'https://open-al.variflight.com/api/flight',
  },
}
