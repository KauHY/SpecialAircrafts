import { readFileSync } from 'node:fs'
import { openLiveryDatabase, importLiverySnapshot, liveryDatabasePath } from '../server/services/liveryDatabase.mjs'

const snapshot = JSON.parse(readFileSync(new URL('../server/data/xmyzl-liveries.json', import.meta.url), 'utf8'))
const db = openLiveryDatabase()
try {
  importLiverySnapshot(db, snapshot)
  console.log(JSON.stringify({ database: liveryDatabasePath, ...db.prepare('SELECT COUNT(*) AS records, COUNT(DISTINCT registration) AS registrations, COUNT(DISTINCT source_url) AS airlines FROM special_liveries WHERE active=1').get() }))
} finally {
  db.close()
}
