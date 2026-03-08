import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

export default function ResponseChart({ checks }) {
  if (!checks || checks.length === 0) {
    return <div className="chart-empty">No check history yet.</div>
  }

  // Prepare data — oldest first for chart
  const data = [...checks].reverse().map(c => ({
    time:   new Date(c.checked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    ms:     c.status === 'up' ? (c.response_ms || null) : null,
    status: c.status,
  }))

  const CustomDot = (props) => {
    const { cx, cy, payload } = props
    if (payload.status === 'down') {
      return <circle cx={cx} cy={cy || 10} r={5} fill="#ef4444" stroke="#ef4444" />
    }
    return null
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    const d = payload[0]?.payload
    return (
      <div style={{
        background: '#1e293b', border: '1px solid #334155',
        borderRadius: 8, padding: '10px 14px', fontSize: 12
      }}>
        <div style={{ color: '#94a3b8', marginBottom: 4 }}>{label}</div>
        {d?.status === 'down'
          ? <div style={{ color: '#ef4444' }}>DOWN</div>
          : <div style={{ color: '#22c55e' }}>{d?.ms}ms</div>
        }
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
        <XAxis
          dataKey="time"
          tick={{ fill: '#475569', fontSize: 10 }}
          interval="preserveStartEnd"
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fill: '#475569', fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          unit="ms"
          width={45}
        />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="ms"
          stroke="#6366f1"
          strokeWidth={2}
          dot={<CustomDot />}
          activeDot={{ r: 4, fill: '#6366f1' }}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
