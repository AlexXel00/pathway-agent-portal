import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Property } from '../lib/types'
import { formatPhp } from '../lib/format'
import PieChart, { type PieSlice } from '../components/PieChart'

const CHART_COLORS = [
  '#7e6454',
  '#b6a180',
  '#4f7a5c',
  '#a1493f',
  '#5c7d8a',
  '#9c6b53',
  '#8d7764',
  '#c9a575',
  '#6b8f71',
  '#a08cae',
]

export default function Overview() {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase.from('properties').select('*')
      setProperties(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const active = useMemo(() => properties.filter((p) => p.listing_status === 'Active'), [properties])
  const sold = useMemo(() => properties.filter((p) => p.listing_status === 'Sold'), [properties])

  const totalActiveValue = useMemo(() => active.reduce((sum, p) => sum + (p.price_total_php ?? 0), 0), [active])
  const totalCommissionEarned = useMemo(
    () => sold.reduce((sum, p) => sum + (p.actual_commission_php ?? p.approx_commission_php ?? 0), 0),
    [sold]
  )

  const byLocation = useMemo(() => toChartData(groupBy(active, (p) => p.municipality || 'Unknown')), [active])
  const byType = useMemo(() => toChartData(groupBy(active, (p) => p.type || 'Other')), [active])

  if (loading) {
    return <p style={{ color: 'var(--color-secondary)' }}>Loading overview...</p>
  }

  return (
    <div>
      <h1>Overview</h1>
      <p style={{ color: 'var(--color-secondary)', marginBottom: 28 }}>
        Current inventory and performance across all of Pathway Real Estate.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 16,
          marginBottom: 36,
        }}
      >
        <StatCard label="Active listings" value={String(active.length)} />
        <StatCard label="Total value (active)" value={formatPhp(totalActiveValue)} />
        <StatCard label="Closed sales" value={String(sold.length)} />
        <StatCard label="Commission earned" value={formatPhp(totalCommissionEarned)} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 24 }}>
        <section className="card" style={{ padding: '22px 26px' }}>
          <h3>Active listings by location</h3>
          <PieChart data={byLocation} />
        </section>
        <section className="card" style={{ padding: '22px 26px' }}>
          <h3>Active listings by type</h3>
          <PieChart data={byType} />
        </section>
      </div>
    </div>
  )
}

function groupBy(items: Property[], keyFn: (p: Property) => string): Record<string, number> {
  const map: Record<string, number> = {}
  items.forEach((p) => {
    const key = keyFn(p)
    map[key] = (map[key] ?? 0) + 1
  })
  return map
}

function toChartData(map: Record<string, number>): PieSlice[] {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], i) => ({ label, value, color: CHART_COLORS[i % CHART_COLORS.length] }))
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card" style={{ padding: '18px 20px' }}>
      <div
        style={{
          fontSize: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: '0.03em',
          color: 'var(--color-secondary)',
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: '1.4rem', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>{value}</div>
    </div>
  )
}
