export default function IncidentLog({ checks }) {
  if (!checks || checks.length === 0) return null

  const incidents = []
  let current = null
  const sorted = [...checks].reverse()

  for (const c of sorted) {
    if (c.status === 'down') {
      if (!current) current = { start: c.checked_at, end: c.checked_at, count: 1 }
      else { current.end = c.checked_at; current.count++ }
    } else {
      if (current) { incidents.push(current); current = null }
    }
  }
  if (current) incidents.push(current)

  if (incidents.length === 0) {
    return <div className="incident-ok">✓ No incidents in the last 24 hours</div>
  }

  return (
    <div>
      {incidents.map((inc, i) => {
        const start    = new Date(inc.start)
        const end      = new Date(inc.end)
        const duration = Math.round((end - start) / 60000) + 1
        return (
          <div key={i} className="incident-item">
            <div className="incident-dot" />
            <div>
              <div className="incident-time">
                {start.toLocaleTimeString()} — {end.toLocaleTimeString()}
              </div>
              <div className="incident-desc">
                ~{duration} min outage · {inc.count} failed check{inc.count > 1 ? 's' : ''}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
