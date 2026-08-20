import type { SpecialFlight } from '../types'
import { categoryLabels, statusLabels } from './FlightCard'
import { CloseIcon, PlaneIcon } from './Icons'

interface FlightDrawerProps {
  flight: SpecialFlight | null
  onClose: () => void
}

export function FlightDrawer({ flight, onClose }: FlightDrawerProps) {
  if (!flight) return null

  return (
    <div className="drawer-layer" role="presentation" onMouseDown={onClose}>
      <aside
        className="flight-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="flight-detail-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="drawer-close" onClick={onClose} aria-label="关闭详情">
          <CloseIcon />
        </button>

        <div className="drawer-hero">
          <div className="aircraft-illustration"><PlaneIcon /></div>
          <p>{flight.airline} · {flight.airlineCountry}</p>
          <h2 id="flight-detail-title">{flight.aircraftName}</h2>
          <div className="category-list">
            {flight.categories.map((category) => (
              <span key={category} className={`category ${category}`}>{categoryLabels[category]}</span>
            ))}
          </div>
        </div>

        <div className="drawer-score">
          <div>
            <span>特别推荐值</span>
            <strong>{flight.rarityScore}<small>/ 100</small></strong>
          </div>
          <p>{flight.rarityReason}</p>
        </div>

        <dl className="detail-grid">
          <div><dt>航班号</dt><dd>{flight.flightNumber}</dd></div>
          <div><dt>呼号</dt><dd>{flight.callsign}</dd></div>
          <div><dt>注册号</dt><dd>{flight.registration}</dd></div>
          <div><dt>机型代码</dt><dd>{flight.aircraftType}</dd></div>
          <div><dt>计划到达</dt><dd>{flight.scheduledTime}</dd></div>
          <div><dt>预计到达</dt><dd>{flight.estimatedTime}</dd></div>
          <div><dt>航班状态</dt><dd>{statusLabels[flight.status]}</dd></div>
          <div><dt>航站区域</dt><dd>{flight.terminal ?? '待确认'}</dd></div>
          <div><dt>近 30 日到访</dt><dd>{flight.recentVisits === null ? '待积累' : `${flight.recentVisits} 次`}</dd></div>
          <div><dt>特别涂装</dt><dd>{flight.livery ?? '常规涂装'}</dd></div>
          <div><dt>数据来源</dt><dd>{flight.sources.join(' + ')}</dd></div>
          <div><dt>数据可信度</dt><dd>{flight.confidence}%</dd></div>
        </dl>

        <div className="drawer-note">
          <strong>数据说明</strong>
          <p>信息由后端聚合并标注来源。注册号、预计时间及实际运行仍可能随航班状态变化。</p>
        </div>
      </aside>
    </div>
  )
}
