import type { AirportSnapshot } from '../types'
import { ClockIcon, EyeIcon, MapPinIcon, WindIcon } from './Icons'

interface AirportOverviewProps {
  snapshot: AirportSnapshot
}

export function AirportOverview({ snapshot }: AirportOverviewProps) {
  const { airport, weather, flights } = snapshot
  const highValueCount = flights.filter((flight) => flight.rarityScore >= 85).length

  return (
    <section className="airport-overview">
      <div className="airport-title-block">
        <div className="airport-code">{airport.iata}</div>
        <div>
          <p className="airport-location"><MapPinIcon /> {airport.city} · {airport.country}</p>
          <h2>{airport.name}</h2>
          <p className="icao">{airport.icao} · 当日特别航班动态</p>
        </div>
      </div>

      <div className="overview-stats">
        <div className="stat featured">
          <span>今日发现</span>
          <strong>{flights.length}<small>架</small></strong>
          <em>{highValueCount} 架高推荐</em>
        </div>
        <div className="stat">
          <ClockIcon />
          <span>数据更新</span>
          <strong>{snapshot.lastUpdated}</strong>
          <em>{snapshot.dataMode === 'cached' ? '缓存快照' : '机场本地日程'}</em>
        </div>
        <div className="stat">
          <WindIcon />
          <span>{weather.windDirection || '风况待接入'}</span>
          <strong>{weather.windSpeed ?? '--'}<small>{weather.windSpeed !== null ? ' km/h' : ''}</small></strong>
          <em>{weather.runwayHint}</em>
        </div>
        <div className="stat">
          <EyeIcon />
          <span>{weather.condition}{weather.temperature !== null ? ` · ${weather.temperature}℃` : ''}</span>
          <strong>{weather.visibility ?? '--'}<small>{weather.visibility !== null ? ' km' : ''}</small></strong>
          <em>能见度</em>
        </div>
      </div>
    </section>
  )
}
