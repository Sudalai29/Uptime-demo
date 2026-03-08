import { useState, useEffect, useCallback } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { monitorsApi, checksApi } from './api/index'
import AddMonitorModal from './components/AddMonitorModal'
import IncidentLog     from './components/IncidentLog'

// ── Cyberpunk chart tooltip ──────────────────────────────
function CyberTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div style={{
      background: '#070e1a', border: '1px solid rgba(0,255,231,0.3)',
      padding: '8px 12px', fontFamily: 'Share Tech Mono, monospace', fontSize: 11,
    }}>
      <div style={{ color: 'rgba(0,255,231,0.5)', marginBottom: 4 }}>{label}</div>
      {d?.status === 'down'
        ? <div style={{ color: '#ff2d78', textShadow: '0 0 6px #ff2d78' }}>OFFLINE</div>
        : <div style={{ color: '#00ffe7', textShadow: '0 0 6px #00ffe7' }}>{d?.ms}ms</div>
      }
    </div>
  )
}

// ── Single monitor card ──────────────────────────────────
function MonitorCard({ item, selected, onDelete, onPause, onSelect }) {
  const { monitor, latest_check, uptime_pct, avg_response } = item
  const status = latest_check?.status || 'unknown'

  const uptimeColor = uptime_pct == null ? '#00ffe7'
    : uptime_pct >= 99 ? '#00ff88'
    : uptime_pct >= 90 ? '#ffe600'
    : '#ff2d78'

  return (
    <div
      className={`monitor-card ${selected ? 'selected' : ''}`}
      onClick={() => onSelect(monitor.id)}
    >
      {/* Corner brackets */}
      <div className="corner tl" /><div className="corner tr" />
      <div className="corner bl" /><div className="corner br" />

      <div className="card-top">
        <span className={`status-tag ${status}`}>● {status.toUpperCase()}</span>
        <div className="card-actions" onClick={e => e.stopPropagation()}>
          <button
            className="btn-icon-cyber"
            onClick={() => onPause(monitor.id)}
            title={monitor.paused ? 'Resume' : 'Pause'}
          >
            {monitor.paused ? '▶' : '⏸'}
          </button>
          <button className="btn-icon-cyber danger" onClick={() => onDelete(monitor.id)} title="Delete">✕</button>
        </div>
      </div>

      <div className="card-name">{monitor.name}</div>
      <div className="card-url">{monitor.url}</div>
      {monitor.paused && <div className="paused-badge">PAUSED</div>}

      <div className="card-stats">
        <div>
          <div className="stat-val" style={{ color: uptimeColor }}>
            {uptime_pct != null ? `${uptime_pct}%` : '—'}
          </div>
          <div className="stat-lbl">UPTIME</div>
        </div>
        <div>
          <div className="stat-val" style={{ color: '#00ffe7' }}>
            {avg_response != null ? `${avg_response}` : '—'}
          </div>
          <div className="stat-lbl">AVG MS</div>
        </div>
        <div>
          <div className="stat-val" style={{ color: '#00ffe7' }}>{monitor.interval_minutes}m</div>
          <div className="stat-lbl">INTERVAL</div>
        </div>
      </div>

      {latest_check && (
        <div className="card-last-check">
          LAST_CHECK: {new Date(latest_check.checked_at).toLocaleTimeString()}
          {latest_check.status_code && ` · HTTP/${latest_check.status_code}`}
          {latest_check.response_ms && ` · ${latest_check.response_ms}ms`}
          {latest_check.error && ` · ${latest_check.error}`}
        </div>
      )}
    </div>
  )
}

// ── Detail panel ─────────────────────────────────────────
function DetailPanel({ item, checks, onClose }) {
  const { monitor } = item

  const chartData = [...checks].reverse().map(c => ({
    time:   new Date(c.checked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    ms:     c.status === 'up' ? (c.response_ms || null) : null,
    status: c.status,
  }))

  return (
    <div className="detail-panel">
      <div className="detail-header">
        <div>
          <div className="detail-name">{monitor.name.toUpperCase()}</div>
          <div className="detail-url">{monitor.url}</div>
        </div>
        <button className="btn-icon-cyber" onClick={onClose}>[✕]</button>
      </div>

      {/* Response chart */}
      <div className="section-label">▸ RESPONSE_TIME / 24H</div>
      {checks.length === 0
        ? <div className="chart-empty">NO DATA YET — WAITING FOR CHECKS...</div>
        : (
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
              <XAxis
                dataKey="time"
                tick={{ fill: 'rgba(0,255,231,0.35)', fontSize: 8, fontFamily: 'monospace' }}
                tickLine={false} axisLine={false} interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: 'rgba(0,255,231,0.35)', fontSize: 8, fontFamily: 'monospace' }}
                tickLine={false} axisLine={false} unit="ms" width={40}
              />
              <Tooltip content={<CyberTooltip />} />
              <Line
                type="monotone" dataKey="ms"
                stroke="#00ffe7" strokeWidth={1.5}
                dot={(p) => p.payload.status === 'down'
                  ? <circle key={p.key} cx={p.cx} cy={p.cy || 10} r={4} fill="#ff2d78" stroke="#ff2d78" />
                  : <span key={p.key} />
                }
                activeDot={{ r: 4, fill: '#00ffe7', stroke: '#00ffe7' }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )
      }

      {/* Incidents */}
      <div className="section-label" style={{ marginTop: 18 }}>▸ INCIDENT_LOG</div>
      <IncidentLog checks={checks} />

      {/* Recent checks */}
      <div className="section-label" style={{ marginTop: 18 }}>▸ RECENT_CHECKS</div>
      <div className="checks-list">
        {checks.length === 0
          ? <div style={{ fontSize: 11, color: 'rgba(0,255,231,0.3)', padding: '10px 0' }}>NO CHECKS YET</div>
          : checks.slice(0, 20).map((c, i) => (
            <div key={i} className="check-row">
              <span
                className="check-dot"
                style={{
                  background: c.status === 'up' ? '#00ff88' : '#ff2d78',
                  boxShadow: `0 0 5px ${c.status === 'up' ? '#00ff88' : '#ff2d78'}`,
                }}
              />
              <span className="check-time">{new Date(c.checked_at).toLocaleTimeString()}</span>
              <span className="check-code" style={{ color: c.status === 'up' ? 'rgba(0,255,231,0.5)' : '#ff2d78' }}>
                {c.status_code || c.error || '—'}
              </span>
              <span className="check-ms">{c.response_ms ? `${c.response_ms}ms` : '—'}</span>
            </div>
          ))
        }
      </div>
    </div>
  )
}

// ── Main App ──────────────────────────────────────────────
export default function App() {
  const [monitors, setMonitors]   = useState([])
  const [selected, setSelected]   = useState(null)
  const [checks,   setChecks]     = useState([])
  const [showModal, setShowModal] = useState(false)
  const [loading,  setLoading]    = useState(true)
  const [error,    setError]      = useState('')
  const [tick,     setTick]       = useState(0)

  // Clock tick
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const fetchMonitors = useCallback(async () => {
    try {
      const res = await monitorsApi.getAll()
      setMonitors(res.data)
      setError('')
    } catch {
      setError('CANNOT REACH API — IS BACKEND RUNNING?')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchChecks = useCallback(async (id) => {
    if (!id) return
    try {
      const res = await checksApi.getHistory(id, 24)
      setChecks(res.data)
    } catch { setChecks([]) }
  }, [])

  useEffect(() => {
    fetchMonitors()
    const id = setInterval(fetchMonitors, 30000)
    return () => clearInterval(id)
  }, [fetchMonitors])

  useEffect(() => { fetchChecks(selected) }, [selected, fetchChecks])

  const handleAdd = async (data) => {
    await monitorsApi.create(data)
    await fetchMonitors()
  }
  const handleDelete = async (id) => {
    if (!window.confirm('TERMINATE THIS NODE?')) return
    await monitorsApi.remove(id)
    if (selected === id) { setSelected(null); setChecks([]) }
    await fetchMonitors()
  }
  const handlePause = async (id) => {
    await monitorsApi.togglePause(id)
    await fetchMonitors()
  }
  const handleSelect = (id) => {
    if (selected === id) { setSelected(null); setChecks([]) }
    else { setSelected(id); fetchChecks(id) }
  }

  const downCount   = monitors.filter(m => m.latest_check?.status === 'down').length
  const isOperational = downCount === 0 && monitors.length > 0
  const bannerColor   = monitors.length === 0 ? 'rgba(0,255,231,0.4)'
    : isOperational   ? '#00ff88'
    : '#ff2d78'

  const selectedItem = monitors.find(m => m.monitor.id === selected)

  return (
    <div className="app">
      {/* Background layers */}
      <div className="grid-bg" />
      <div className="vignette" />
      <div className="scanline" />

      {/* Header */}
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <div className="logo-icon">◈</div>
            <div>
              <div className="logo-title">UPTIME<span>_</span>MONITOR</div>
              <div className="logo-sub">SYS.WATCHDOG v2.4.1</div>
            </div>
          </div>

          <div className="header-stats">
            {[
              { label: 'NODES',    val: monitors.length,           color: '#00ffe7' },
              { label: 'ONLINE',   val: monitors.length - downCount, color: '#00ff88' },
              { label: 'CRITICAL', val: downCount,                 color: downCount > 0 ? '#ff2d78' : 'rgba(0,255,231,0.2)' },
            ].map(s => (
              <div key={s.label}>
                <div className="hstat-val" style={{ color: s.color }}>{s.val}</div>
                <div className="hstat-lbl">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="header-right">
            <div className="header-clock">{new Date().toLocaleTimeString()}</div>
            <button className="btn-cyber" onClick={() => setShowModal(true)}>[+] ADD NODE</button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="main">
        {/* Status banner */}
        <div
          className="status-banner"
          style={{ borderColor: bannerColor + '55', background: bannerColor + '08' }}
        >
          <div
            className={`status-banner-dot ${downCount > 0 ? 'blink' : ''}`}
            style={{ background: bannerColor, boxShadow: `0 0 10px ${bannerColor}` }}
          />
          <span className="status-banner-text" style={{ color: bannerColor }}>
            {monitors.length === 0
              ? 'NO NODES REGISTERED'
              : isOperational
              ? 'ALL SYSTEMS OPERATIONAL'
              : `WARNING: ${downCount} NODE${downCount > 1 ? 'S' : ''} OFFLINE`
            }
          </span>
          <div className="status-banner-meta">
            <span className="status-meta-item">TICK #{String(tick).padStart(6, '0')}</span>
            <span className="status-meta-item">AUTO-REFRESH: 30S</span>
          </div>
        </div>

        {error && <div className="error-box">{error}</div>}

        {loading ? (
          <div className="empty-state">
            <div className="empty-icon">⟳</div>
            <div>INITIALIZING...</div>
          </div>
        ) : monitors.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📡</div>
            <div>NO NODES REGISTERED</div>
            <div className="empty-hint">CLICK [+] ADD NODE TO START MONITORING</div>
          </div>
        ) : (
          <div className="content">
            <div className="monitors-grid">
              {monitors.map((item, idx) => (
                <div key={item.monitor.id} style={{ animation: `fadeUp 0.3s ease ${idx * 0.05}s both` }}>
                  <MonitorCard
                    item={item}
                    selected={selected === item.monitor.id}
                    onDelete={handleDelete}
                    onPause={handlePause}
                    onSelect={handleSelect}
                  />
                </div>
              ))}
            </div>

            {selectedItem && (
              <DetailPanel
                item={selectedItem}
                checks={checks}
                onClose={() => { setSelected(null); setChecks([]) }}
              />
            )}
          </div>
        )}
      </main>

      {showModal && (
        <AddMonitorModal onClose={() => setShowModal(false)} onAdd={handleAdd} />
      )}
    </div>
  )
}
