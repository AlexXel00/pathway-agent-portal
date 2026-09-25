import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { CondoUnit } from '../lib/types'

const UNIT_STATUS = ['available', 'reserved', 'sold']

export default function AdminCondoType() {
  const { id, type } = useParams<{ id: string; type: string }>()
  const unitType = type ? decodeURIComponent(type) : ''
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [projectName, setProjectName] = useState('')
  const [projectSub, setProjectSub] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [units, setUnits] = useState<CondoUnit[]>([])
  const [floorFilter, setFloorFilter] = useState('all')

  useEffect(() => {
    ;(async () => {
      const { data: p } = await supabase.from('condo_projects').select('*').eq('id', id).single()
      const { data: tRows } = await supabase
        .from('condo_unit_types')
        .select('*')
        .eq('project_id', id)
        .eq('unit_type', unitType)
      const { data: u } = await supabase
        .from('condo_units')
        .select('*')
        .eq('project_id', id)
        .eq('unit_type', unitType)
        .order('floor', { ascending: true })
        .order('unit_no', { ascending: true })

      if (p) {
        setProjectName(p.name ?? '')
        setProjectSub([p.municipality, p.completion_status].filter(Boolean).join(' - '))
      }
      const typePhotos: string[] = tRows && tRows[0] && tRows[0].photos ? tRows[0].photos : []
      setPhotos(typePhotos.length > 0 ? typePhotos : (p?.photos ?? []))
      setUnits((u as CondoUnit[]) ?? [])
      setLoading(false)
    })()
  }, [id, unitType])

  async function updateUnitStatus(unitId: string, status: string) {
    setUnits((prev) => prev.map((u) => (u.id === unitId ? { ...u, status } : u)))
    await supabase.from('condo_units').update({ status }).eq('id', unitId)
  }

  if (loading) return <p style={{ color: 'var(--color-secondary)' }}>Loading...</p>

  const available = units.filter((u) => u.status === 'available')
  const prices = available.map((u) => Number(u.price_php)).filter((n) => !isNaN(n))
  const areas = available.map((u) => Number(u.floor_area_sqm)).filter((n) => !isNaN(n))
  const peso = (n: number) => 'PHP ' + n.toLocaleString()
  const priceLabel = prices.length === 0 ? '-' : Math.min(...prices) === Math.max(...prices) ? peso(Math.min(...prices)) : `${peso(Math.min(...prices))} - ${peso(Math.max(...prices))}`
  const areaLabel = areas.length === 0 ? '' : Math.min(...areas) === Math.max(...areas) ? `${Math.min(...areas)} sqm` : `${Math.min(...areas)}-${Math.max(...areas)} sqm`

  const floorLabels = Array.from(new Set(units.map((u) => u.floor_label || String(u.floor)))).sort()
  const visibleUnits = floorFilter === 'all' ? units : units.filter((u) => (u.floor_label || String(u.floor)) === floorFilter)

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <button className="btn btn-ghost" onClick={() => navigate(`/admin/condo/${id}`)} style={{ marginBottom: 16 }}>
        &larr; Back to project
      </button>

      <div className="card" style={{ padding: '28px 30px' }}>
        <p style={{ fontSize: '0.82rem', color: 'var(--color-secondary)', margin: '0 0 4px' }}>{projectName}</p>
        <h2 style={{ margin: '0 0 4px' }}>{unitType}</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-secondary)', marginTop: 0 }}>{projectSub}</p>

        {photos.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '14px 0' }}>
            {photos.map((url) => (
              <img key={url} src={url} alt="" style={{ width: 150, height: 110, objectFit: 'cover', borderRadius: 8 }} />
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', marginTop: 8 }}>
          <div>
            <p style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-secondary)', margin: '0 0 2px' }}>Available</p>
            <p style={{ fontWeight: 600, margin: 0 }}>{available.length}</p>
          </div>
          <div>
            <p style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-secondary)', margin: '0 0 2px' }}>Price range</p>
            <p style={{ fontWeight: 600, margin: 0 }}>{priceLabel}</p>
          </div>
          {areaLabel && (
            <div>
              <p style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-secondary)', margin: '0 0 2px' }}>Area</p>
              <p style={{ fontWeight: 600, margin: 0 }}>{areaLabel}</p>
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: '28px 30px', marginTop: 24 }}>
        <h3 style={{ marginTop: 0 }}>Units ({units.length})</h3>

        <div className="field" style={{ maxWidth: 220 }}>
          <label htmlFor="floorFilter">Filter by floor</label>
          <select id="floorFilter" value={floorFilter} onChange={(e) => setFloorFilter(e.target.value)}>
            <option value="all">All floors</option>
            {floorLabels.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--color-secondary)' }}>
                <th style={{ padding: '6px 8px' }}>Floor</th>
                <th style={{ padding: '6px 8px' }}>Unit</th>
                <th style={{ padding: '6px 8px' }}>Area</th>
                <th style={{ padding: '6px 8px' }}>Price</th>
                <th style={{ padding: '6px 8px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {visibleUnits.map((u) => (
                <tr key={u.id} style={{ borderTop: '1px solid var(--color-beige)' }}>
                  <td style={{ padding: '6px 8px' }}>{u.floor_label || u.floor}</td>
                  <td style={{ padding: '6px 8px' }}>{u.unit_no}</td>
                  <td style={{ padding: '6px 8px' }}>{u.floor_area_sqm ? `${u.floor_area_sqm} sqm` : '-'}</td>
                  <td style={{ padding: '6px 8px' }}>{u.price_php ? 'PHP ' + Number(u.price_php).toLocaleString() : '-'}</td>
                  <td style={{ padding: '6px 8px' }}>
                    <select value={u.status} onChange={(e) => updateUnitStatus(u.id, e.target.value)}>
                      {UNIT_STATUS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
