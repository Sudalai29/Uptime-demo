import { useState, useEffect, useCallback } from 'react'
import { monitorsApi, checksApi } from './api/index'
import MonitorCard    from './components/MonitorCard'
import AddMonitorModal from './components/AddMonitorModal'
import ResponseChart  from './components/ResponseChart'
import IncidentLog    from './components/IncidentLog'

export default function App() {
  const [monitors, setMonitors]     = useState([])
  const [selected, setSelected]     = useState(null)   // selected monitor id
  const [checks,   setChecks]       = useState([])
  const [showModal, setShowModal]   = useState(false)
  const [loading,  setLoading]      = useState(true)
  const [error,    setError]        = useState('')

  // ── Fetch all monitors ───────────────────────────────────
  const fetchMonitors = useCallback(async () => {
    try {
      const res = await monitorsApi.getAll()
      setMonitors(res.data)
      setError('')
    } catch {
      setError('Cannot reach API. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Fetch checks for selected monitor ───────────────────
  const fetchChecks = useCallback(async (id) => {
    if (!id) return
    try {
      const res = await checksApi.getHistory(id, 24)
      setChecks(res.data)
    } catch {
      setChecks([])
    }
  }, [])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    fetchMonitors()
    const interval = setInterval(fetchMonitors, 30000)
    return () => clearInterval(interval)
  }, [fetchMonitors])

  useEffect(() => {
    if (selected) fetchChecks(selected)
  }, [selected, fetchChecks])

  // ── Handlers ─────────────────────────────────────────────
  const handleAdd = async (data) => {
    await monitorsApi.create(data)
    await fetchMonitors()
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this monitor?')) return
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

  // ── Overall status ───────────────────────────────────────
  const totalMonitors = monitors.length
  const downCount     = monitors.filter(m => m.latest_check?.status === 'down').length
  const overallStatus = totalMonitors === 0 ? 'none'
    : downCount === 0                       ? 'operational'
    : downCount === totalMonitors           ? 'outage'
    :                                         'degraded'

  const statusBar = {
    none:        { color: '#64748b', text: 'No monitors yet',          bg: 'rgba(100,116,139,0.1)' },
    operational: { color: '#22c55e', text: 'All systems operational',  bg: 'rgba(34,197,94,0.1)'  },
    degraded:    { color: '#f59e0b', text: `${downCount} site${downCount > 1 ? 's' : ''} down`, bg: 'rgba(245,158,11,0.1)' },
    outage:      { color: '#ef4444', text: 'Major outage',             bg: 'rgba(239,68,68,0.1)'  },
  }[overallStatus]

  const selectedItem = monitors.find(m => m.monitor.id === selected)

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">📡</span>
            <span className="logo-text">Uptime Monitor</span>
          </div>
          <div className="header-right">
            <span className="refresh-hint">auto-refreshes every 30s</span>
            <button className="btn-primary" onClick={() => setShowModal(true)}>+ Add Monitor</button>
          </div>
        </div>
      </header>

      <main className="main">
        {/* Status Banner */}
        <div className="status-banner" style={{ background: statusBar.bg, borderColor: statusBar.color + '44' }}>
          <span className="status-banner-dot" style={{ background: statusBar.color }} />
          <span style={{ color: statusBar.color, fontWeight: 600 }}>{statusBar.text}</span>
          <span className="status-banner-count" style={{ color: statusBar.color }}>
            {totalMonitors > 0 && `${totalMonitors} monitor${totalMonitors > 1 ? 's' : ''}`}
          </span>
        </div>

        {error && <div className="error-box">{error}</div>}

        {loading ? (
          <div className="empty-state">Loading monitors...</div>
        ) : monitors.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: 48, marginBottom: 16 }}>📡</div>
            <p>No monitors yet.</p>
            <p style={{ color: '#64748b', fontSize: 13 }}>Add a URL to start tracking its uptime.</p>
          </div>
        ) : (
          <div className="content">
            {/* Monitor grid */}
            <div className="monitors-grid">
              {monitors.map(item => (
                <MonitorCard
                  key={item.monitor.id}
                  item={item}
                  selected={selected === item.monitor.id}
                  onDelete={handleDelete}
                  onPause={handlePause}
                  onSelect={handleSelect}
                />
              ))}
            </div>

            {/* Detail panel */}
            {selectedItem && (
              <div className="detail-panel">
                <div className="detail-header">
                  <div>
                    <div className="detail-name">{selectedItem.monitor.name}</div>
                    <div className="detail-url">{selectedItem.monitor.url}</div>
                  </div>
                  <button className="btn-icon" onClick={() => { setSelected(null); setChecks([]) }}>✕</button>
                </div>

                <div className="section-title">Response Time (24h)</div>
                <ResponseChart checks={checks} />

                <IncidentLog checks={checks} />

                {/* Raw check history */}
                <div className="section-title" style={{ marginTop: 20 }}>Recent Checks</div>
                <div className="checks-list">
                  {checks.slice(0, 20).map((c, i) => (
                    <div key={i} className="check-row">
                      <span className="check-dot" style={{ background: c.status === 'up' ? '#22c55e' : '#ef4444' }} />
                      <span className="check-time">{new Date(c.checked_at).toLocaleTimeString()}</span>
                      <span className="check-code" style={{ color: c.status === 'up' ? '#94a3b8' : '#ef4444' }}>
                        {c.status_code || c.error || '—'}
                      </span>
                      <span className="check-ms">{c.response_ms ? `${c.response_ms}ms` : '—'}</span>
                    </div>
                  ))}
                </div>
              </div>
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
