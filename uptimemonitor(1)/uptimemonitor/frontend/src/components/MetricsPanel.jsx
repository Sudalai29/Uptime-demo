import { useState, useEffect } from 'react'
import axios from 'axios'

const host        = window.location.hostname
const GRAFANA_URL = `http://${host}:3001`

function MetricBox({ icon, label, value, unit, color, bg, sub }) {
  return (
    <div className="metric-box" style={{ background: bg || 'var(--surface)' }}>
      <div className="metric-icon">{icon}</div>
      <div className="metric-val" style={{ color }}>
        {value ?? '—'}{unit && <span className="metric-unit">{unit}</span>}
      </div>
      <div className="metric-lbl">{label}</div>
      {sub && <div className="metric-sub">{sub}</div>}
    </div>
  )
}

export default function MetricsPanel() {
  const [stats,   setStats]   = useState(null)
  const [error,   setError]   = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchStats = async () => {
    try {
      const res = await axios.get('/stats')
      setStats(res.data)
      setError(false)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    const id = setInterval(fetchStats, 15000)
    return () => clearInterval(id)
  }, [])

  const avgMs = stats?.performance?.avg_response_ms
  const msColor = avgMs == null ? 'var(--text)'
    : avgMs < 300 ? 'var(--teal)'
    : avgMs < 800 ? 'var(--amber)'
    : 'var(--red)'

  return (
    <div>
      {/* Explainer callout */}
      <div className="callout-purple">
        <span style={{ fontSize: 18, flexShrink: 0 }}>ℹ️</span>
        <span className="callout-text">
          This section tracks <strong>this monitoring app's own health</strong> — not the URLs above.
          For full time-series graphs and historical data, open the{' '}
          <a href={GRAFANA_URL} target="_blank" rel="noreferrer">Grafana dashboard ↗</a>
        </span>
      </div>

      {/* Stat boxes */}
      {loading ? (
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'var(--muted)', padding: '20px 0', textAlign: 'center' }}>
          Loading metrics...
        </div>
      ) : error ? (
        <div className="error-box">Metrics unavailable — API may be unreachable</div>
      ) : stats && (
        <div className="metrics-grid">
          <MetricBox icon="🖥️" label="Total Monitors" value={stats.monitors.total}   color="var(--text)"   bg="var(--blue-lt)"   />
          <MetricBox icon="✅" label="Currently Up"   value={stats.monitors.up}      color="var(--green)"  bg="var(--green-lt)"  sub="services healthy" />
          <MetricBox icon="🔴" label="Currently Down" value={stats.monitors.down}    color={stats.monitors.down > 0 ? 'var(--red)' : 'var(--text)'} bg={stats.monitors.down > 0 ? 'var(--red-lt)' : 'var(--bg)'} sub="needs attention" />
          <MetricBox icon="⏸️" label="Paused"         value={stats.monitors.paused}  color="var(--amber)"  bg="var(--amber-lt)"  />
          <MetricBox icon="⚡" label="Checks / hr"    value={stats.checks.last_hour} color="var(--blue)"   bg="var(--blue-lt)"   sub="last hour" />
          <MetricBox icon="⏱️" label="Avg Response"   value={avgMs}                  color={msColor}       bg="var(--teal-lt)"   unit="ms" sub="across monitors" />
        </div>
      )}

      {/* Grafana — single clean CTA, no raw URLs shown */}
      <div className="grafana-cta">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="grafana-icon">📈</div>
          <div>
            <div className="grafana-name">Grafana Dashboard</div>
            <div className="grafana-desc">Response time graphs · incident history · p50 / p90 / p99 percentiles</div>
          </div>
        </div>
        <a href={GRAFANA_URL} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
          <button className="btn-neu purple">Open Dashboard ↗</button>
        </a>
      </div>
    </div>
  )
}
