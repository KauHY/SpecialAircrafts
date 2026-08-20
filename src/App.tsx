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
        <span className="mvp-badge">MVP · 示例数据</span>
      </header>

      <main id="top">
        <SearchPanel busy={busy} error={error} onSearch={searchAirport} />

        <div className="content-wrap" id="discover">
          {busy && !snapshot ? (
            <div className="loading-state"><i /><p>正在读取机场动态...</p></div>
          ) : snapshot ? (
            <>
              <AirportOverview snapshot={snapshot} />

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
                    <h3>当前分类暂无记录</h3>
                    <p>试试其他分类，或稍后刷新机场动态。</p>
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
          <p>当前版本完成机场检索、分类筛选、稀有度展示与航班详情的前端闭环。后续可直接替换数据服务层，接入合规的实时航班及航空器数据。</p>
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
