export interface PieSlice {
  label: string
  value: number
  color: string
}

interface Props {
  data: PieSlice[]
  size?: number
}

export default function PieChart({ data, size = 180 }: Props) {
  const total = data.reduce((sum, d) => sum + d.value, 0)

  let cumulative = 0
  const stops = data.map((d) => {
    const start = total > 0 ? (cumulative / total) * 100 : 0
    cumulative += d.value
    const end = total > 0 ? (cumulative / total) * 100 : 0
    return `${d.color} ${start}% ${end}%`
  })
  const gradient = total > 0 ? `conic-gradient(${stops.join(', ')})` : 'var(--color-beige)'
  const holeInset = Math.round(size * 0.22)

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: gradient,
          position: 'relative',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: holeInset,
            borderRadius: '50%',
            background: '#fff',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: '1.3rem', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>{total}</span>
          <span style={{ fontSize: '0.62rem', color: 'var(--color-secondary)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            Total
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 160 }}>
        {data.length === 0 && <span style={{ color: 'var(--color-secondary)', fontSize: '0.85rem' }}>No data yet.</span>}
        {data.map((d) => (
          <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: d.color, flexShrink: 0 }} />
            <span style={{ flex: 1 }}>{d.label}</span>
            <span style={{ color: 'var(--color-secondary)' }}>
              {d.value} ({total > 0 ? Math.round((d.value / total) * 100) : 0}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
