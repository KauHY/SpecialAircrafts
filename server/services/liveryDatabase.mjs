import { isBuiltin } from 'node:module'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Node 20 remains supported; newer runtimes use the built-in driver.
const DatabaseSync = isBuiltin('node:sqlite')
  ? (await import('node:sqlite')).DatabaseSync
  : (await import('better-sqlite3')).default

const root = fileURLToPath(new URL('../../', import.meta.url))
export const liveryDatabasePath = resolve(root, 'data/liveries.sqlite')
const seedPath = resolve(root, 'server/data/xmyzl-liveries.json')

export function normalizeRegistration(value = '') {
  const compact = String(value).toUpperCase().replace(/[\s\-－–]/g, '')
  return /^B[A-Z0-9]{3,5}$/.test(compact) ? `B-${compact.slice(1)}` : String(value).trim().toUpperCase()
}

export function openLiveryDatabase(path = liveryDatabasePath) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true })
  const db = new DatabaseSync(path)
  db.exec(`
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS livery_sources (
      source_url TEXT PRIMARY KEY, airline TEXT NOT NULL,
      observed_at TEXT NOT NULL, section_count INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS special_liveries (
      registration TEXT NOT NULL, name TEXT NOT NULL, airline TEXT NOT NULL,
      source_url TEXT NOT NULL, evidence TEXT NOT NULL,
      first_seen_at TEXT NOT NULL, last_seen_at TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
      PRIMARY KEY (registration, name, source_url)
    );
    CREATE INDEX IF NOT EXISTS livery_registration_active ON special_liveries(registration, active);
  `)
  return db
}

export function importLiverySnapshot(db, snapshot) {
  if (!Array.isArray(snapshot.records) || !Array.isArray(snapshot.pages) || !snapshot.pages.length
    || snapshot.pages.length !== snapshot.discoveredAirlines || snapshot.failures?.length) {
    throw new Error('彩绘快照不完整，拒绝覆盖数据库；请完成采集后再导入。')
  }
  const sources = new Set(snapshot.pages.filter(p => p.sections.length).map(p => p.url))
  if (!sources.size || snapshot.pages.some(p => p.warnings.length)) {
    throw new Error('没有识别到彩绘栏目或存在待复核行，拒绝导入。')
  }
  for (const page of snapshot.pages) {
    const previous = db.prepare('SELECT observed_at FROM livery_sources WHERE source_url=?').get(page.url)
    if (!Number.isFinite(Date.parse(page.fetchedAt)) || (previous && Date.parse(page.fetchedAt) < Date.parse(previous.observed_at))) {
      throw new Error('采集时间无效或快照早于数据库已有资料，拒绝回退。')
    }
  }
  for (const row of snapshot.records) {
    if (!/^B-[A-Z0-9]{3,5}$/.test(normalizeRegistration(row.registration)) || !row.name || !row.airline || !row.evidence || !sources.has(row.sourceUrl) || !Number.isFinite(Date.parse(row.observedAt))) {
      throw new Error('彩绘记录缺少有效注册号、名称或来源，拒绝导入。')
    }
  }
  const insert = db.prepare(`INSERT INTO special_liveries
    (registration, name, airline, source_url, evidence, first_seen_at, last_seen_at, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    ON CONFLICT(registration, name, source_url) DO UPDATE SET
      airline=excluded.airline, evidence=excluded.evidence, last_seen_at=excluded.last_seen_at, active=1`)
  const source = db.prepare(`INSERT INTO livery_sources VALUES (?, ?, ?, ?)
    ON CONFLICT(source_url) DO UPDATE SET airline=excluded.airline, observed_at=excluded.observed_at, section_count=excluded.section_count`)
  db.exec('BEGIN IMMEDIATE')
  try {
    for (const page of snapshot.pages) {
      if (!sources.has(page.url)) continue
      // A missing or changed heading is not evidence that all liveries disappeared.
      if (page.warnings.length) throw new Error(`栏目需复核，未导入：${page.airline}`)
      db.prepare('UPDATE special_liveries SET active=0 WHERE source_url=?').run(page.url)
      source.run(page.url, page.airline, page.fetchedAt, page.sections.length)
    }
    for (const row of snapshot.records) {
      insert.run(normalizeRegistration(row.registration), row.name, row.airline, row.sourceUrl, row.evidence, row.observedAt, row.observedAt)
    }
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

let database
function getDatabase() {
  if (!database) {
    database = openLiveryDatabase()
    if (!database.prepare('SELECT COUNT(*) AS count FROM livery_sources').get().count && existsSync(seedPath)) {
      importLiverySnapshot(database, JSON.parse(readFileSync(seedPath, 'utf8')))
    }
  }
  return database
}

export function getLiveryCatalog(db = getDatabase()) {
  const rows = db.prepare('SELECT * FROM special_liveries WHERE active=1 ORDER BY registration, name').all()
  const entries = new Map()
  for (const row of rows) {
    const current = entries.get(row.registration) || { names: [], sources: [], observedAt: row.last_seen_at }
    if (!current.names.includes(row.name)) current.names.push(row.name)
    if (!current.sources.some(s => s.url === row.source_url)) current.sources.push({ name: '民航休闲小站', url: row.source_url, airline: row.airline })
    current.observedAt = current.observedAt > row.last_seen_at ? current.observedAt : row.last_seen_at
    entries.set(row.registration, { ...current, name: current.names.join(' / ') })
  }
  return entries
}

export function getLiveryDatabaseStatus() {
  return {
    source: '民航休闲小站',
    ...getDatabase().prepare(`SELECT COUNT(DISTINCT registration) AS registrations,
      COUNT(DISTINCT source_url) AS airlines, MAX(last_seen_at) AS lastObservedAt
      FROM special_liveries WHERE active=1`).get(),
  }
}
