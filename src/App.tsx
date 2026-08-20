import { useEffect, useMemo, useState } from 'react'
import { AirportOverview } from './components/AirportOverview'
import { FlightCard } from './components/FlightCard'
import { FlightDrawer } from './components/FlightDrawer'
import { PlaneIcon } from './components/Icons'
import { SearchPanel } from './components/SearchPanel'
import { getAirportSnapshot } from './services/aircraftService'
import type { AirportSnapshot, FlightFilter, SpecialFlight } from './types'

const filters: { value: FlightFilter; label: string }[] = [
  { value: 'all', label: '全部发现' },
  { value: 'special-livery', label: '特别涂装' },
  { value: 'rare-type', label: '特殊机型' },
  { value: 'rare-airline', label: '稀有航司' },
  { value: 'charter', label: '临时包机' },
]

function App() {
  const [snapshot, setSnapshot] = useState<AirportSnapshot | null>(null)
  const [filter, setFilter] = useState<FlightFilter>('all')
  const [selectedFlight, setSelectedFlight] = useState<SpecialFlight | null>(null)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')

  const searchAirport = async (query: string) => {
    setBusy(true)
    setError('')
    try {
      const result = await getAirportSnapshot(query)
      setSnapshot(result)
      setFilter('all')
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : '查询失败，请稍后再试。')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    void searchAirport('PVG')
  }, [])

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedFlight(null)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [])

  const visibleFlights = useMemo(() => {
    if (!snapshot) return []
    if (filter === 'all') return snapshot.flights
    return snapshot.flights.filter((flight) => flight.categories.includes(filter))
  }, [filter, snapshot])

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="航迹志首页">
          <span className="brand-mark"><PlaneIcon /></span>
          <span><strong>航迹志</strong><small>SPECIAL AIRCRAFTS</small></span>
        </a>
        <nav aria-label="主导航">
          <a className="active" href="#discover">今日发现</a>
          <a href="#about">项目说明</a>
        </nav>
        <span className="mvp-badge">MVP · 多源聚合</span>
      </header>

      <main id="top">
        <SearchPanel busy={busy} error={error} onSearch={searchAirport} />

        <div className="content-wrap" id="discover">
          {busy && !snapshot ? (
            <div className="loading-state"><i /><p>正在读取机场动态...</p></div>
          ) : snapshot ? (
            <>
              <AirportOverview snapshot={snapshot} />

              <section className={`data-status ${snapshot.dataMode}`} aria-label="数据源状态">
                <div>
                  <strong>{snapshot.dataMode === 'live' ? '实时数据已连接' : snapshot.dataMode === 'partial' ? '部分数据可用' : snapshot.dataMode === 'error' ? '数据源请求失败' : '等待配置真实数据源'}</strong>
                  <p>{snapshot.notice}</p>
                </div>
                <div className="provider-list">
                  {snapshot.providers.map((provider) => (
                    <span key={provider.id} className={provider.ok ? 'ok' : provider.configured ? 'failed' : ''} title={provider.error}>
                      <i />{provider.label}{provider.ok ? ` · ${provider.recordCount}` : provider.configured ? ' · 异常' : ' · 未配置'}
                    </span>
                  ))}
                </div>
              </section>

              <section className="discover-section" aria-labelledby="discover-title">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">CURATED FOR SPOTTERS</span>
                    <h2 id="discover-title">今日特别飞机</h2>
                    <p>按稀有度、到访频率与涂装信息筛选出的关注目标。</p>
                  </div>
                  <div className="filter-tabs" aria-label="特别飞机类型">
                    {filters.map((item) => (
                      <button
                        key={item.value}
                        className={filter === item.value ? 'active' : ''}
                        onClick={() => setFilter(item.value)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {visibleFlights.length ? (
                  <div className="flight-grid">
                    {visibleFlights.map((flight) => (
                      <FlightCard key={flight.id} flight={flight} onSelect={setSelectedFlight} />
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <PlaneIcon />
                    <h3>{snapshot.dataMode === 'unavailable' ? '尚未连接真实航班数据' : '当前分类暂无特别飞机'}</h3>
                    <p>{snapshot.dataMode === 'unavailable' ? '按照 .env.example 配置至少一个官方 API 后重新启动。' : '试试其他分类，或稍后刷新机场动态。'}</p>
                  </div>
                )}
              </section>
            </>
          ) : null}
        </div>

        <section className="about-strip" id="about">
          <div>
            <span className="eyebrow">ABOUT THE MVP</span>
            <h2>从“查航班”到“发现值得等的飞机”</h2>
          </div>
          <p>当前版本已加入后端聚合层，可连接飞常准、FlightAware 与 Flightradar24，并对来源、更新时间和数据可信度进行标注。</p>
        </section>
      </main>

      <footer>
        <div className="brand compact"><span className="brand-mark"><PlaneIcon /></span><strong>航迹志</strong></div>
        <p>特别飞机查询系统 · 第一阶段 MVP</p>
        <p>航班信息仅供参考，请以机场及航司官方信息为准。</p>
      </footer>

      <FlightDrawer flight={selectedFlight} onClose={() => setSelectedFlight(null)} />
    </div>
  )
}

export default App
