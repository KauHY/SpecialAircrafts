import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { openLiveryDatabase, importLiverySnapshot, getLiveryCatalog, normalizeRegistration } from '../services/liveryDatabase.mjs'
import { classifyFlights } from '../services/specialFlightRules.mjs'

const sourceUrl = 'http://www.xmyzl.com/?mod=jidui_show&id=19'
const date = '2026-09-10T02:00:00Z'
const makeSnapshot = () => ({
  discoveredAirlines: 1, failures: [],
  pages: [{ url: sourceUrl, airline: '测试航司', fetchedAt: date, sections: [{ heading: '当前彩绘情况' }], warnings: [] }],
  records: [{ registration: 'B2006', name: '爱中国', airline: '测试航司', sourceUrl, evidence: '爱中国：B-2006', observedAt: date }],
})

test('normalize registration variants and reject missing identities', () => {
  for (const value of ['B2006', 'b-2006', ' B－2006 ', 'B 2006']) assert.equal(normalizeRegistration(value), 'B-2006')
  assert.equal(normalizeRegistration(), '')
})

test('transactional, idempotent import and removal/reactivation', () => {
  const db = openLiveryDatabase(':memory:')
  try {
    const snapshot = makeSnapshot()
    importLiverySnapshot(db, snapshot)
    importLiverySnapshot(db, snapshot)
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM special_liveries').get().n, 1)
    assert.equal(getLiveryCatalog(db).get('B-2006').name, '爱中国')
    importLiverySnapshot(db, { ...snapshot, records: [] })
    assert.equal(getLiveryCatalog(db).size, 0)
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM special_liveries').get().n, 1)
    importLiverySnapshot(db, snapshot)
    assert.equal(getLiveryCatalog(db).size, 1)
    assert.equal(db.prepare('SELECT first_seen_at FROM special_liveries').get().first_seen_at, date)
  } finally { db.close() }
})

test('bad, incomplete, older and ambiguous snapshots preserve database', () => {
  const db = openLiveryDatabase(':memory:')
  try {
    importLiverySnapshot(db, makeSnapshot())
    for (const mutate of [
      s => { s.failures = [{ error: 'timeout' }] },
      s => { s.pages[0].warnings = ['unparsed'] },
      s => { s.discoveredAirlines = 2 },
      s => { s.records[0].registration = 'N-UNKNOWN' },
      s => { s.records[0].sourceUrl = 'https://unknown.example' },
      s => { s.pages[0].fetchedAt = '2025-01-01T00:00:00Z' },
      s => { s.pages[0].sections = [] },
    ]) {
      const snapshot = makeSnapshot(); mutate(snapshot)
      assert.throws(() => importLiverySnapshot(db, snapshot))
      assert.equal(getLiveryCatalog(db).size, 1)
    }
    // A database constraint failure after updates also rolls back deactivation.
    const invalid = makeSnapshot()
    invalid.records.push({ ...invalid.records[0], name: { invalid: true } })
    assert.throws(() => importLiverySnapshot(db, invalid))
    assert.equal(getLiveryCatalog(db).size, 1)
  } finally { db.close() }
})

test('real source snapshot classification: positive, negative, unknown and past', () => {
  const snapshot = JSON.parse(readFileSync(new URL('../data/xmyzl-liveries.json', import.meta.url), 'utf8'))
  const db = openLiveryDatabase(':memory:')
  try {
    importLiverySnapshot(db, snapshot)
    const catalog = getLiveryCatalog(db)
    assert.equal(catalog.size, new Set(snapshot.records.map(r => r.registration)).size)
    assert.ok(catalog.size >= 300)
    const flights = ['B2006', 'B-1151', 'B-1136', 'B-323H', 'B-0000', undefined].map(registration => ({ registration, airlineCode: 'CCA', aircraftType: 'A320' }))
    const results = classifyFlights(flights, { country: '中国' }, snapshot.generatedAt.slice(0, 10), false, catalog)
    assert.equal(results.length, 4)
    assert.ok(results.every(f => f.categories.includes('special-livery') && f.liverySources[0].url.startsWith('http://www.xmyzl.com/')))
    assert.equal(classifyFlights(flights, { country: '中国' }, '2000-01-01', false, catalog).length, 0)
  } finally { db.close() }
})
