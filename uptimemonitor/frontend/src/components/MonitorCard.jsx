export default function MonitorCard({ item, onDelete, onPause, onSelect, selected }) {
  const { monitor, latest_check, uptime_pct, avg_response } = item

  const statusColor = {
    up:      '#22c55e',
    down:    '#ef4444',
    unknown: '#64748b',
  }

  const status = latest_check?.status || 'unknown'
  const color  = statusColor[status]

  const formatMs = (ms) => ms != null ? `${ms}ms` : '—'
  const formatPct = (p) => p  != null ? `${p}%`   : '—'

  return (
    <div
      className={`monitor-card ${selected ? 'monitor-card--selected' : ''}`}
      onClick={() => onSelect(monitor.id)}
      style={{ borderColor: selected ? color : undefined, cursor: 'pointer' }}
    >
      <div className="card-top">
        <div className="card-status">
          <span className="status-dot" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
          <span className="status-label" style={{ color }}>{status.toUpperCase()}</span>
        </div>
        <div className="card-actions" onClick={e => e.stopPropagation()}>
          <button
            className="btn-icon"
            onClick={() => onPause(monitor.id)}
            title={monitor.paused ? 'Resume' : 'Pause'}
          >
            {monitor.paused ? '▶' : '⏸'}
          </button>
          <button className="btn-icon btn-danger" onClick={() => onDelete(monitor.id)} title="Delete">
            🗑
          </button>
        </div>
      </div>

      <div className="card-name">{monitor.name}</div>
      <div className="card-url">{monitor.url}</div>

      {monitor.paused && <div className="paused-badge">PAUSED</div>}

      <div className="card-stats">
        <div className="stat">
          <div className="stat-value" style={{ color: uptime_pct >= 99 ? '#22c55e' : uptime_pct >= 90 ? '#f59e0b' : '#ef4444' }}>
            {formatPct(uptime_pct)}
          </div>
          <div className="stat-label">24h uptime</div>
        </div>
        <div className="stat">
          <div className="stat-value">{formatMs(avg_response)}</div>
          <div className="stat-label">avg response</div>
        </div>
        <div className="stat">
          <div className="stat-value">{monitor.interval_minutes}m</div>
          <div className="stat-label">interval</div>
        </div>
      </div>

      {latest_check && (
        <div className="card-last-check">
          Last check: {new Date(latest_check.checked_at).toLocaleTimeString()}
          {latest_check.status_code && ` · ${latest_check.status_code}`}
          {latest_check.response_ms && ` · ${latest_check.response_ms}ms`}
          {latest_check.error && ` · ${latest_check.error}`}
        </div>
      )}
    </div>
  )
}
