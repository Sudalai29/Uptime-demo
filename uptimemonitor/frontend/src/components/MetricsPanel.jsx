import { useState, useEffect } from 'react'
import axios from 'axios'

const host           = window.location.hostname
const GRAFANA_URL    = `http://${host}:3001`
const PROMETHEUS_URL = `http://${host}:9090`

function MetricBox({ label, value, unit = '', color = 'var(--text)', sub }) {
  return (
    <div className="metric-box">
      <div className="metric-val" style={{ color }}>
        {value ?? '—'}{unit && <span style={{ fontSize: 13, marginLeft: 2, color: 'var(--muted)' }}>{unit}</span>}
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

  return (
    <div>
      {/* Explainer callout */}
      <div className="callout">
        <span style={{ fontSize: 18, flexShrink: 0 }}>ℹ️</span>
        <span className="callout-text">
          This section shows how <strong>this monitoring app itself</strong> is performing —
          not the services it watches above. For full time-series graphs open{' '}
          <a href={GRAFANA_URL} target="_blank" rel="noreferrer">Grafana ↗</a> or{' '}
          <a href={PROMETHEUS_URL} target="_blank" rel="noreferrer">Prometheus ↗</a>.
        </span>
      </div>

      {/* Stats */}
      {loading ? (
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'var(--muted)', padding: '20px 0', textAlign: 'center' }}>
          Loading metrics...
        </div>
      ) : error ? (
        <div className="error-box">Metrics unavailable — API may be unreachable</div>
      ) : stats ? (
        <div className="metrics-grid">
          <MetricBox label="Total Monitors"  value={stats.monitors.total}  color="var(--text)" />
          <MetricBox label="Currently Up"    value={stats.monitors.up}     color="var(--green)" sub="services healthy" />
          <MetricBox
            label="Currently Down"
            value={stats.monitors.down}
            color={stats.monitors.down > 0 ? 'var(--red)' : 'var(--text)'}
            sub="services failing"
          />
          <MetricBox label="Paused"          value={stats.monitors.paused}               color="var(--yellow)" />
          <MetricBox label="Checks / hr"     value={stats.checks.last_hour}              color="var(--text)"  sub="last hour" />
          <MetricBox
            label="Avg Response"
            value={stats.performance.avg_response_ms}
            unit="ms"
            color={
              stats.performance.avg_response_ms == null ? 'var(--text)'
              : stats.performance.avg_response_ms < 300  ? 'var(--green)'
              : stats.performance.avg_response_ms < 800  ? 'var(--yellow)'
              : 'var(--red)'
            }
            sub="across all monitors"
          />
        </div>
      ) : null}

      {/* Tool links */}
      <div className="tool-links">
        {[
          { icon: '📈', label: 'Open Grafana',    desc: `Full time-series dashboard · ${host}:3001`,      href: GRAFANA_URL    },
          { icon: '🔬', label: 'Open Prometheus',  desc: `Raw metrics explorer · ${host}:9090`,            href: PROMETHEUS_URL },
          { icon: '📋', label: 'Raw /metrics',     desc: 'Prometheus scrape endpoint · this API',         href: '/metrics'     },
        ].map(l => (
          <a key={l.label} href={l.href} target="_blank" rel="noreferrer" className="tool-link">
            <span style={{ fontSize: 22 }}>{l.icon}</span>
            <div>
              <div className="tool-link-name">{l.label}</div>
              <div className="tool-link-desc">{l.desc}</div>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
