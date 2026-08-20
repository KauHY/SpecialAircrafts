import { useState, type FormEvent } from 'react'
import { MapPinIcon, SearchIcon } from './Icons'

interface SearchPanelProps {
  busy: boolean
  error: string
  onSearch: (query: string) => void
}

export function SearchPanel({ busy, error, onSearch }: SearchPanelProps) {
  const [query, setQuery] = useState('')
  const quickAirports = [
    ['PVG', '上海'], ['PEK', '北京'], ['CAN', '广州'], ['HKG', '香港'],
    ['NRT', '东京'], ['SIN', '新加坡'], ['LHR', '伦敦'], ['LAX', '洛杉矶'],
  ]

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (query.trim()) onSearch(query)
  }

  return (
    <section className="search-panel" aria-labelledby="search-heading">
      <div className="search-copy">
        <span className="eyebrow">TODAY'S MOVEMENTS</span>
        <h1 id="search-heading">找到今天值得等的那架飞机</h1>
        <p>输入机场名称、IATA 或 ICAO 代码，查看特殊机型、彩绘机与稀有航司。</p>
      </div>

      <form className="search-form" onSubmit={submit}>
        <div className={`search-field ${error ? 'has-error' : ''}`}>
          <MapPinIcon />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="例如：上海浦东 / PVG / ZSPD"
            aria-label="机场名称或代码"
          />
          <button type="submit" disabled={busy || !query.trim()}>
            <SearchIcon />
            <span>{busy ? '查询中' : '查询机场'}</span>
          </button>
        </div>
        {error && <p className="search-error">{error}</p>}
      </form>

      <div className="quick-airports" aria-label="热门机场">
        <span>快速查看</span>
        {quickAirports.map(([iata, city]) => (
          <button key={iata} onClick={() => onSearch(iata)} disabled={busy}>
            <strong>{iata}</strong>
            {city}
          </button>
        ))}
      </div>
    </section>
  )
}
