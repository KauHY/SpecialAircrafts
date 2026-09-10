import { useState, type FormEvent } from 'react'
import { MapPinIcon, SearchIcon } from './Icons'

interface SearchPanelProps {
  busy: boolean
  error: string
  onSearch: (query: string) => void
}

export function SearchPanel({ busy, error, onSearch }: SearchPanelProps) {
  const [query, setQuery] = useState('PVG')
  const quickAirports = [
    ['PVG', '上海浦东'], ['SHA', '上海虹桥'],
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
        <p>专注上海浦东与上海虹桥，查看今天的特殊机型、彩绘机与稀有航司。</p>
      </div>

      <form className="search-form" onSubmit={submit}>
        <div className={`search-field ${error ? 'has-error' : ''}`}>
          <MapPinIcon />
          <select
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="选择上海机场"
            disabled={busy}
          >
            <option value="PVG">上海浦东国际机场 · PVG</option>
            <option value="SHA">上海虹桥国际机场 · SHA</option>
          </select>
          <button type="submit" disabled={busy || !query.trim()}>
            <SearchIcon />
            <span>{busy ? '查询中' : '查询机场'}</span>
          </button>
        </div>
        {error && <p className="search-error">{error}</p>}
      </form>

      <div className="quick-airports" aria-label="上海机场快捷查询">
        <span>快速查看</span>
        {quickAirports.map(([iata, city]) => (
          <button key={iata} onClick={() => { setQuery(iata); onSearch(iata) }} disabled={busy}>
            <strong>{iata}</strong>
            {city}
          </button>
        ))}
      </div>
    </section>
  )
}
