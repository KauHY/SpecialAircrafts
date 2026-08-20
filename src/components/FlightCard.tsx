import type { FlightStatus, SpecialCategory, SpecialFlight } from '../types'
import { ChevronIcon, PlaneIcon } from './Icons'

const categoryLabels: Record<SpecialCategory, string> = {
  'rare-airline': '稀有航司',
  'special-livery': '特别涂装',
  'rare-type': '特殊机型',
  charter: '临时包机',
}

const statusLabels: Record<FlightStatus, string> = {
  approaching: '正在进近',
  scheduled: '计划到达',
  landed: '已经落地',
  delayed: '延误',
  cancelled: '已取消',
}

interface FlightCardProps {
  flight: SpecialFlight
  onSelect: (flight: SpecialFlight) => void
}

export function FlightCard({ flight, onSelect }: FlightCardProps) {
  return (
    <button className="flight-card" onClick={() => onSelect(flight)}>
      <div className="flight-card-top">
        <div className="category-list">
          {flight.categories.map((category) => (
            <span key={category} className={`category ${category}`}>{categoryLabels[category]}</span>
          ))}
        </div>
        <span className={`status ${flight.status}`}><i />{statusLabels[flight.status]}</span>
      </div>

      <div className="flight-identity">
        <div className="aircraft-mark"><PlaneIcon /></div>
        <div>
          <span>{flight.airline}</span>
          <h3>{flight.aircraftName}</h3>
          <p>{flight.registration} · {flight.flightNumber}</p>
        </div>
        <div className="rarity-score">
          <span>推荐值</span>
          <strong>{flight.rarityScore}</strong>
        </div>
      </div>

      <div className="flight-route">
        <div>
          <strong>{flight.originCode}</strong>
          <span>{flight.originCity}</span>
        </div>
        <div className="route-line">
          <span>{flight.estimatedTime}</span>
          <i><PlaneIcon /></i>
        </div>
        <div className="destination">
          <strong>{flight.destinationCode}</strong>
          <span>预计到达</span>
        </div>
      </div>

      <div className="flight-reason">
        <p>{flight.rarityReason}</p>
        <span>{flight.confidence}% 可信度 <ChevronIcon /></span>
      </div>
    </button>
  )
}

export { categoryLabels, statusLabels }
