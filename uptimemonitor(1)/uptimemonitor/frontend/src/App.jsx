import { useState, useEffect, useCallback } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { monitorsApi, checksApi } from './api/index'
import AddMonitorModal from './components/AddMonitorModal'
import IncidentLog     from './components/IncidentLog'
import MetricsPanel    from './components/MetricsPanel'

// ── Status colour helpers ──────────────────────────────────
const statusColors = {
  up:      { fg: 'var(--green)', bg: 'var(--green-lt)' },
  down:    { fg: 'var(--red)',   bg: 'var(--red-lt)'   },
  unknown: { fg: 'var(--muted)', bg: 'var(--bg)'        },
}

// ── Chart tooltip ──────────────────────────────────────────
function NeuTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div style={{ background: '#eef2f7', border: 'none', borderRadius: 10, padding: '8px 12px', boxShadow: '4px 4px 12px #c5ccd6', fontFamily: 'DM Mono, monospace', fontSize: 11 }}>
      <div style={{ color: 'var(--muted)', marginBottom: 3 }}>{label}</div>
      {d?.status === 'down'
        ? <div style={{ color: 'var(--red)', fontWeight: 600 }}>Offline</div>
        : <div style={{ color: 'var(--teal)', fontWeight: 600 }}>{d?.ms}ms</div>
      }
    </div>
  )
}

// ── Monitor card ───────────────────────────────────────────
function MonitorCard({ item, selected, onSelect, onDelete, onPause }) {
  const { monitor, latest_check, uptime_pct, avg_response } = item
  const st      = latest_check?.status || 'unknown'
  const stColor = statusColors[st] || statusColors.unknown
  const uColor  = uptime_pct == null ? 'var(--muted)'
    : uptime_pct >= 99  ? 'var(--green)'
    : uptime_pct >= 90  ? 'var(--amber)'
    : 'var(--red)'
  const uBg     = uptime_pct == null ? 'var(--bg)'
    : uptime_pct >= 99  ? 'var(--green-lt)'
    : uptime_pct >= 90  ? 'var(--amber-lt)'
    : 'var(--red-lt)'

  return (
    <div className={`monitor-card ${selected ? 'selected' : ''}`} onClick={() => onSelect(monitor.id)}>
      <div className="card-top">
        <span className="status-pill-badge" style={{ background: stColor.bg, color: stColor.fg }}>
          ● {st.toUpperCase()}
        </span>
        <div className="card-actions" onClick={e => e.stopPropagation()}>
          <span className="card-interval">/{monitor.interval_minutes}min</span>
          <button className="btn-icon" onClick={() => onPause(monitor.id)} title={monitor.paused ? 'Resume' : 'Pause'}>
            {monitor.paused ? '▶' : '⏸'}
          </button>
          <button className="btn-icon danger" onClick={() => onDelete(monitor.id)} title="Delete">✕</button>
        </div>
      </div>

      <div className="card-name">{monitor.name}</div>
      <div className="card-url">{monitor.url}</div>
      {monitor.paused && <div className="paused-tag">PAUSED</div>}

      <div className="card-stats">
        <div className="stat-cell" style={{ background: uBg }}>
          <div className="stat-val" style={{ color: uColor }}>{uptime_pct != null ? `${uptime_pct}%` : '—'}</div>
          <div className="stat-lbl">Uptime</div>
        </div>
        <div className="stat-cell" style={{ background: 'var(--blue-lt)' }}>
          <div className="stat-val" style={{ color: 'var(--blue)' }}>{avg_response ?? '—'}</div>
          <div className="stat-lbl">Avg ms</div>
        </div>
        <div className="stat-cell" style={{ background: latest_check?.status_code === 200 ? 'var(--green-lt)' : latest_check?.status_code ? 'var(--red-lt)' : 'var(--bg)' }}>
          <div className="stat-val" style={{ color: latest_check?.status_code === 200 ? 'var(--green)' : latest_check?.status_code ? 'var(--red)' : 'var(--muted)' }}>
            {latest_check?.status_code ?? '—'}
          </div>
          <div className="stat-lbl">HTTP</div>
        </div>
      </div>

      {latest_check && (
        <div className="card-last">
          Last checked {new Date(latest_check.checked_at).toLocaleTimeString()}
          {latest_check.error && ` · ${latest_check.error}`}
        </div>
      )}
    </div>
  )
}

// ── Detail panel ───────────────────────────────────────────
function DetailPanel({ item, checks, onClose }) {
  const { monitor } = item
  const chartData = [...checks].reverse().map(c => ({
    time:   new Date(c.checked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    ms:     c.status === 'up' ? c.response_ms : null,
    status: c.status,
  }))

  return (
    <div className="detail-panel">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
        <div className="detail-name">{monitor.name}</div>
        <button className="btn-icon" onClick={onClose}>✕</button>
      </div>
      <div className="detail-url">{monitor.url}</div>

      <div className="panel-section">RESPONSE TIME · LAST 24H</div>
      {checks.length === 0 ? (
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--muted)', padding: '20px 0', textAlign: 'center' }}>No checks yet</div>
      ) : (
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#2b9e95" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#2b9e95" stopOpacity={0}   />
              </linearGradient>
            </defs>
            <XAxis dataKey="time" tick={{ fill: '#7a8899', fontSize: 8, fontFamily: 'DM Mono' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fill: '#7a8899', fontSize: 8, fontFamily: 'DM Mono' }} tickLine={false} axisLine={false} unit="ms" width={38} />
            <Tooltip content={<NeuTooltip />} cursor={{ stroke: 'var(--teal)', strokeWidth: 1, strokeDasharray: '4 2' }} />
            <Area type="monotone" dataKey="ms" stroke="var(--teal)" strokeWidth={2} fill="url(#tealGrad)" dot={false} activeDot={{ r: 4, fill: 'var(--teal)' }} connectNulls={false} />
          </AreaChart>
        </ResponsiveContainer>
      )}

      <div className="panel-section" style={{ marginTop: 18 }}>INCIDENTS · LAST 24H</div>
      <IncidentLog checks={checks} />

      <div className="panel-section" style={{ marginTop: 16 }}>RECENT CHECKS</div>
      <div className="checks-list">
        {checks.length === 0
          ? <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--muted)', padding: '8px 0' }}>No checks yet</div>
          : checks.slice(0, 15).map((c, i) => (
            <div key={i} className="check-row" style={{ background: c.status === 'up' ? 'var(--green-lt)' : 'var(--red-lt)' }}>
              <div className="check-dot" style={{ background: c.status === 'up' ? 'var(--green)' : 'var(--red)' }} />
              <span className="check-time">{new Date(c.checked_at).toLocaleTimeString()}</span>
              <span className="check-code" style={{ color: c.status === 'up' ? 'var(--green)' : 'var(--red)' }}>
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

// ── Main ───────────────────────────────────────────────────
export default function App() {
  const [monitors,  setMonitors]  = useState([])
  const [selected,  setSelected]  = useState(null)
  const [checks,    setChecks]    = useState([])
  const [showModal, setShowModal] = useState(false)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')
  const [tick,      setTick]      = useState(0)

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
      setError('Cannot reach API — is the backend running?')
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

  useEffect(() => { fetchMonitors(); const id = setInterval(fetchMonitors, 30000); return () => clearInterval(id) }, [fetchMonitors])
  useEffect(() => { fetchChecks(selected) }, [selected, fetchChecks])

  const handleAdd    = async (data) => { await monitorsApi.create(data); await fetchMonitors() }
  const handleDelete = async (id) => {
    if (!window.confirm('Remove this monitor?')) return
    await monitorsApi.remove(id)
    if (selected === id) { setSelected(null); setChecks([]) }
    await fetchMonitors()
  }
  const handlePause  = async (id) => { await monitorsApi.togglePause(id); await fetchMonitors() }
  const handleSelect = (id) => {
    if (selected === id) { setSelected(null); setChecks([]) }
    else { setSelected(id); fetchChecks(id) }
  }

  const downCount    = monitors.filter(m => m.latest_check?.status === 'down').length
  const allHealthy   = monitors.length > 0 && downCount === 0
  const selectedItem = monitors.find(m => m.monitor.id === selected)

  return (
    <div>
      {/* ── HEADER ── */}
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <div className="logo-icon">📡</div>
            <div>
              <div className="logo-name">Uptime Monitor</div>
              <div className="logo-sub">service watchdog · auto-refresh 30s</div>
            </div>
          </div>

          <div className="status-pill">
            <div className={`status-dot ${downCount > 0 ? 'pulse' : ''}`} style={{
              background: monitors.length === 0 ? 'var(--muted)' : allHealthy ? 'var(--green)' : 'var(--red)',
              boxShadow: `0 0 7px ${monitors.length === 0 ? 'var(--muted)' : allHealthy ? 'var(--green)' : 'var(--red)'}`,
            }} />
            <span className="status-text">
              {monitors.length === 0 ? 'No monitors registered'
                : allHealthy ? 'All services healthy'
                : `${downCount} service${downCount > 1 ? 's' : ''} down`}
            </span>
          </div>

          <div className="header-right">
            <span className="header-clock">{new Date().toLocaleTimeString()}</span>
            <button className="btn-neu" onClick={() => setShowModal(true)}>+ Add Monitor</button>
          </div>
        </div>
      </header>

      <main className="main">

        {/* ════════════════════════════════════════
            SECTION 1 — MONITORED SERVICES
        ════════════════════════════════════════ */}
        <div className="section accent-teal" style={{ animation: 'fadeUp 0.4s ease' }}>
          <div className="section-header">
            <div className="section-title-group">
              <div className="section-icon">🌐</div>
              <div>
                <div className="section-title">Monitored Services</div>
                <div className="section-sub">URLs being watched · automatic health checks</div>
              </div>
            </div>
            {monitors.length > 0 && <div className="section-badge">{monitors.length} registered</div>}
          </div>
          <div className="divider-teal" />

          {error && <div className="error-box">{error}</div>}

          {loading ? (
            <div className="empty-state">
              <div className="empty-icon" style={{ animation: 'spin 1s linear infinite' }}>⟳</div>
              <div className="empty-title">Loading...</div>
            </div>
          ) : monitors.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📡</div>
              <div className="empty-title">No monitors yet</div>
              <div className="empty-hint">Click "+ Add Monitor" to start watching a URL</div>
            </div>
          ) : (
            <div className="monitors-layout">
              <div className="monitors-grid">
                {monitors.map((item, idx) => (
                  <div key={item.monitor.id} style={{ animation: `fadeUp 0.4s ease ${idx * 0.06}s both` }}>
                    <MonitorCard
                      item={item}
                      selected={selected === item.monitor.id}
                      onSelect={handleSelect}
                      onDelete={handleDelete}
                      onPause={handlePause}
                    />
                  </div>
                ))}
              </div>
              {selectedItem && (
                <DetailPanel item={selectedItem} checks={checks} onClose={() => { setSelected(null); setChecks([]) }} />
              )}
            </div>
          )}
        </div>

        {/* ════════════════════════════════════════
            SECTION 2 — APP SYSTEM DASHBOARD
        ════════════════════════════════════════ */}
        <div className="section accent-purple" style={{ animation: 'fadeUp 0.4s ease 0.15s both' }}>
          <div className="section-header">
            <div className="section-title-group">
              <div className="section-icon">📊</div>
              <div>
                <div className="section-title">App System Dashboard</div>
                <div className="section-sub">Internal metrics · how this monitoring app is performing</div>
              </div>
            </div>
          </div>
          <div className="divider-purple" />
          <MetricsPanel />
        </div>

      </main>

      {showModal && <AddMonitorModal onClose={() => setShowModal(false)} onAdd={handleAdd} />}
    </div>
  )
}
