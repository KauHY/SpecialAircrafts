import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = dirname(dirname(dirname(fileURLToPath(import.meta.url))))
const ledgerPath = join(rootDir, '.runtime', 'api-usage.json')

const currentMonth = () => new Date().toISOString().slice(0, 7)

const nextMonthStart = () => {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString()
}

function readLedger() {
  if (!existsSync(ledgerPath)) return { month: currentMonth(), providers: {} }
  try {
    const data = JSON.parse(readFileSync(ledgerPath, 'utf8'))
    if (data.month === currentMonth() && data.providers) return data
  } catch {
    // A damaged local ledger should not crash the API. It is replaced below.
  }
  return { month: currentMonth(), providers: {} }
}

function writeLedger(ledger) {
  mkdirSync(dirname(ledgerPath), { recursive: true })
  writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`, 'utf8')
}

export function getQuotaUsage(providerId, budget) {
  const ledger = readLedger()
  const used = Number(ledger.providers[providerId]?.units || 0)
  return {
    used,
    budget,
    remaining: Math.max(0, budget - used),
    resetsAt: nextMonthStart(),
  }
}

export function reserveQuotaUnits(providerId, units, budget) {
  const ledger = readLedger()
  const used = Number(ledger.providers[providerId]?.units || 0)
  if (budget > 0 && used + units > budget) return false

  ledger.providers[providerId] = {
    units: used + units,
    updatedAt: new Date().toISOString(),
  }
  writeLedger(ledger)
  return true
}

