import { useState, useEffect } from 'react'
import axios from 'axios'

const CYAN   = 'var(--cyan)'
const GREEN  = 'var(--green)'
const PINK   = 'var(--pink)'
const YELLOW = 'var(--yellow)'

// Build URLs using the current browser's hostname so they work on
// localhost, EC2 IP, or a custom domain — no hardcoding needed
const host      = window.location.hostname
const GRAFANA_URL    = `http://${host}:3001`
const PROMETHEUS_URL = `http://${host}:9090`

function StatBox({ label, value, unit = '', color = CYAN, blink = false }) {
  return (
    <div style={{
      background: '#040810',
      border: '1px solid rgba(0,255,231,0.1)',
      padding: '12px 10px',
      textAlign: 'center',
    }}>
      <div style={{
        fontFamily: "'Orbitron', monospace",
        fontSize: 20, fontWeight: 900,
        color, textShadow: `0 0 10px ${color}`,
        animation: blink ? 'statusBlink 1s ease infinite' : 'none',
      }}>
        {value ?? '—'}{unit && <span style={{ fontSize: 11, marginLeft: 2 }}>{unit}</span>}
      </div>
      <div style={{ fontSize: 8, color: 'rgba(0,255,231,0.4)', letterSpacing: 2, marginTop: 4, fontFamily: "'Orbitron', monospace" }}>
        {label}
      </div>
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
    <div style={{
      background: '#070e1a',
      border: '1px solid rgba(0,255,231,0.15)',
      padding: 20, marginBottom: 20,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: CYAN, boxShadow: `0 0 8px ${CYAN}` }} />
          <span style={{
            fontFamily: "'Orbitron', monospace", fontSize: 10,
            fontWeight: 700, color: CYAN, letterSpacing: 3,
            textShadow: `0 0 8px ${CYAN}`,
          }}>
            SYSTEM_METRICS
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 9, color: 'rgba(0,255,231,0.35)', letterSpacing: 1 }}>
            REFRESH: 15S
          </span>
          <a
            href={GRAFANA_URL}
            target="_blank"
            rel="noreferrer"
            style={{
              fontFamily: "'Orbitron', monospace", fontSize: 9,
              color: CYAN, textDecoration: 'none',
              border: '1px solid rgba(0,255,231,0.3)',
              padding: '3px 10px', letterSpacing: 1,
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.target.style.background = CYAN; e.target.style.color = '#040810' }}
            onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = CYAN }}
          >
            GRAFANA ↗
          </a>
        </div>
      </div>

      {/* Stats grid */}
      {loading ? (
        <div style={{ fontSize: 11, color: 'rgba(0,255,231,0.3)', textAlign: 'center', padding: '16px 0' }}>
          LOADING METRICS...
        </div>
      ) : error ? (
        <div style={{ fontSize: 11, color: 'var(--pink)', textAlign: 'center', padding: '8px 0' }}>
          ⚠ METRICS UNAVAILABLE
        </div>
      ) : stats ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 8 }}>
          <StatBox label="TOTAL NODES" value={stats.monitors.total}  color={CYAN}  />
          <StatBox label="ONLINE"      value={stats.monitors.up}     color={GREEN} />
          <StatBox
            label="OFFLINE" value={stats.monitors.down}
            color={stats.monitors.down > 0 ? PINK : 'rgba(0,255,231,0.2)'}
            blink={stats.monitors.down > 0}
          />
          <StatBox label="PAUSED"    value={stats.monitors.paused}              color={YELLOW} />
          <StatBox label="CHECKS/HR" value={stats.checks.last_hour}             color={CYAN}   />
          <StatBox
            label="AVG RESP" value={stats.performance.avg_response_ms} unit="ms"
            color={
              stats.performance.avg_response_ms == null ? CYAN
              : stats.performance.avg_response_ms < 300  ? GREEN
              : stats.performance.avg_response_ms < 800  ? YELLOW
              : PINK
            }
          />
        </div>
      ) : null}

      {/* Footer links */}
      {!error && (
        <div style={{
          marginTop: 12, paddingTop: 10,
          borderTop: '1px solid rgba(0,255,231,0.07)',
          display: 'flex', gap: 20, flexWrap: 'wrap',
        }}>
          {[
            { label: 'PROMETHEUS', href: PROMETHEUS_URL,  desc: `:9090 · ${host}` },
            { label: 'GRAFANA',    href: GRAFANA_URL,     desc: `:3001 · admin / cyberpunk` },
            { label: 'RAW METRICS', href: '/metrics',     desc: 'prometheus scrape endpoint' },
          ].map(l => (
            <a key={l.label} href={l.href} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
              <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 8, color: 'rgba(0,255,231,0.5)', letterSpacing: 1 }}>
                {l.label}
              </span>
              <span style={{ fontSize: 8, color: 'rgba(0,255,231,0.25)', marginLeft: 4 }}>
                {l.desc}
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
