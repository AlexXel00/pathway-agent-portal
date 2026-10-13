import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Property } from '../lib/types'

interface OverviewUnit {
  status: string
  unit_type: string | null
  price_php: number | null
  project_id: string
}

interface OverviewProject {
  id: string
  municipality: string | null
  listing_status: string | null
}

// Fixed display order for condo unit types; any other type is appended after these.
const UNIT_TYPE_ORDER = ['Studio', '1-BR', '2-BR', '3-BR']
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
  const [units, setUnits] = useState<OverviewUnit[]>([])
  const [projects, setProjects] = useState<OverviewProject[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [propRes, unitRes, projRes] = await Promise.all([
        supabase.from('properties').select('*'),
        supabase.from('condo_units').select('status, unit_type, price_php, project_id').range(0, 9999),
        supabase.from('condo_projects').select('id, municipality, listing_status'),
      ])
      setProperties(propRes.data ?? [])
      setUnits((unitRes.data as OverviewUnit[]) ?? [])
      setProjects((projRes.data as OverviewProject[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const active = useMemo(() => properties.filter((p) => p.listing_status === 'Active'), [properties])
  const sold = useMemo(() => properties.filter((p) => p.listing_status === 'Sold'), [properties])

  const totalActiveValue = useMemo(() => active.reduce((sum, p) => sum + (p.price_total_php ?? 0), 0), [active])

  const byLocation = useMemo(() => toChartData(groupBy(active, (p) => p.municipality || 'Unknown')), [active])
  const byType = useMemo(() => toChartData(groupBy(active, (p) => p.type || 'Other')), [active])

  // Condos: a unit counts as active when it is available and its project is active.
  const projectById = useMemo(() => {
    const map: Record<string, OverviewProject> = {}
    projects.forEach((p) => {
      map[p.id] = p
    })
    return map
  }, [projects])

  const activeUnits = useMemo(
    () =>
      units.filter((u) => {
        const project = projectById[u.project_id]
        return u.status === 'available' && (project?.listing_status ?? 'Active') === 'Active'
      }),
    [units, projectById]
  )
  const reservedUnits = useMemo(() => units.filter((u) => u.status === 'reserved'), [units])
  const soldUnits = useMemo(() => units.filter((u) => u.status === 'sold'), [units])
  const totalCondoValue = useMemo(() => activeUnits.reduce((sum, u) => sum + (u.price_php ?? 0), 0), [activeUnits])

  const condoByLocation = useMemo(
    () => toChartData(countBy(activeUnits, (u) => projectById[u.project_id]?.municipality || 'Unknown')),
    [activeUnits, projectById]
  )
  const condoByType = useMemo(
    () => toChartData(countBy(activeUnits, (u) => u.unit_type || 'Other'), unitTypeSort),
    [activeUnits]
  )

  if (loading) {
    return <p style={{ color: 'var(--color-secondary)' }}>Loading overview...</p>
  }

  return (
    <div>
      <h1>Overview</h1>
      <p style={{ color: 'var(--color-secondary)', marginBottom: 28 }}>
        Current inventory and performance across all of Pathway Real Estate.
      </p>

      <h2 style={{ marginBottom: 16 }}>Properties</h2>
      <div style={statGridStyle}>
        <StatCard label="Active listings" value={String(active.length)} />
        <StatCard label="Total value (active)" value={formatPhp(totalActiveValue)} />
        <StatCard label="Closed sales" value={String(sold.length)} />
      </div>

      <div style={chartGridStyle}>
        <section className="card" style={{ padding: '22px 26px' }}>
          <h3>Active listings by location</h3>
          <PieChart data={byLocation} />
        </section>
        <section className="card" style={{ padding: '22px 26px' }}>
          <h3>Active listings by type</h3>
          <PieChart data={byType} />
        </section>
      </div>

      <h2 style={{ marginTop: 48, marginBottom: 16 }}>Condos</h2>
      <div style={statGridStyle}>
        <StatCard label="Active condo units" value={String(activeUnits.length)} />
        <StatCard label="Total value (active)" value={formatPhp(totalCondoValue)} />
        <StatCard label="Reserved" value={String(reservedUnits.length)} />
        <StatCard label="Closed sales" value={String(soldUnits.length)} />
      </div>

      <div style={chartGridStyle}>
        <section className="card" style={{ padding: '22px 26px' }}>
          <h3>Active condos by location</h3>
          <PieChart data={condoByLocation} />
        </section>
        <section className="card" style={{ padding: '22px 26px' }}>
          <h3>Active condos by unit type</h3>
          <PieChart data={condoByType} />
        </section>
      </div>
    </div>
  )
}

const statGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))',
  gap: 16,
  marginBottom: 24,
} as const

const chartGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(380px, 100%), 1fr))',
  gap: 24,
} as const

function countBy<T>(items: T[], keyFn: (item: T) => string): Record<string, number> {
  const map: Record<string, number> = {}
  items.forEach((item) => {
    const key = keyFn(item)
    map[key] = (map[key] ?? 0) + 1
  })
  return map
}

function unitTypeSort(a: [string, number], b: [string, number]): number {
  const ia = UNIT_TYPE_ORDER.indexOf(a[0])
  const ib = UNIT_TYPE_ORDER.indexOf(b[0])
  return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
}

function groupBy(items: Property[], keyFn: (p: Property) => string): Record<string, number> {
  const map: Record<string, number> = {}
  items.forEach((p) => {
    const key = keyFn(p)
    map[key] = (map[key] ?? 0) + 1
  })
  return map
}

function toChartData(
  map: Record<string, number>,
  sortFn: (a: [string, number], b: [string, number]) => number = (a, b) => b[1] - a[1]
): PieSlice[] {
  return Object.entries(map)
    .sort(sortFn)
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
