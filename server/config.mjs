import 'dotenv/config'

const positiveNumber = (value, fallback) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export const config = {
  port: positiveNumber(process.env.PORT, 8787),
  cacheTtlMs: positiveNumber(process.env.CACHE_TTL_SECONDS, 120) * 1000,
  providerTimeoutMs: positiveNumber(process.env.PROVIDER_TIMEOUT_MS, 10_000),
  includeAllFlights: process.env.INCLUDE_ALL_FLIGHTS === 'true',
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

