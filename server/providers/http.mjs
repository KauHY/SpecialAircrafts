import { config } from '../config.mjs'

export class ProviderError extends Error {
  constructor(provider, message, status) {
    super(message)
    this.name = 'ProviderError'
    this.provider = provider
    this.status = status
  }
}

export async function fetchJson(provider, url, options = {}) {
  let response
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...options.headers,
      },
      signal: AbortSignal.timeout(config.providerTimeoutMs),
    })
  } catch (error) {
    const detail = error instanceof Error ? error.message : '网络请求失败'
    throw new ProviderError(provider, `${provider} 请求失败：${detail}`)
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    const safeBody = body.slice(0, 180).replace(/\s+/g, ' ')
    throw new ProviderError(provider, `${provider} 返回 HTTP ${response.status}${safeBody ? `：${safeBody}` : ''}`, response.status)
  }

  return response.json()
}

