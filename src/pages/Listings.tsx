import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Agent, ListingStatus, Property, CondoProject } from '../lib/types'
import PropertyCard from '../components/PropertyCard'
import PropertyDetailModal from '../components/PropertyDetailModal'
import PropertyTable from '../components/PropertyTable'
import PropertyFilters, { EMPTY_FILTERS, applyFilters, countActiveFilters, type FilterState } from '../components/PropertyFilters'

const TABS: { label: string; value: ListingStatus | 'All' }[] = [
  { label: 'Active', value: 'Active' },
  { label: 'Sold', value: 'Sold' },
  { label: 'All', value: 'All' },
]

export default function Listings() {
  const { agent } = useAuth()
  const [properties, setProperties] = useState<Property[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<ListingStatus | 'All'>('Active')
  const [kind, setKind] = useState<'property' | 'condo'>('property')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Property | null>(null)
  const [view, setView] = useState<'cards' | 'table'>('cards')
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS)
  const [showFilters, setShowFilters] = useState(false)
  const [condoProjects, setCondoProjects] = useState<CondoProject[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    supabase
      .from('condo_projects')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => setCondoProjects((data as CondoProject[]) ?? []))
  }, [])

  async function loadProperties() {
    // properties_for_agents masks the owner contact for non-admins at the database level -
    // it always returns owner_contact_name as null unless the querying user is an admin.
    const [{ data: props }, { data: ags }] = await Promise.all([
      supabase.from('properties_for_agents').select('*').order('created_at', { ascending: false }),
      supabase.from('agents').select('*'),
    ])
    setProperties(props ?? [])
    setAgents(ags ?? [])
  }

  useEffect(() => {
    setLoading(true)
    loadProperties().finally(() => setLoading(false))
  }, [])

  const agentsById = useMemo(() => {
    const map: Record<string, Agent> = {}
    agents.forEach((a) => (map[a.id] = a))
    return map
  }, [agents])

  const municipalities = useMemo(() => {
    const set = new Set<string>()
    properties.forEach((p) => {
      if (p.municipality) set.add(p.municipality)
    })
    return Array.from(set).sort()
  }, [properties])

  const filtered = useMemo(() => {
    let result = properties.filter(
      (p) => ((p.listing_kind ?? 'property') === kind) && (tab === 'All' ? true : p.listing_status === tab)
    )
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.municipality ?? '').toLowerCase().includes(q) ||
          (p.barangay ?? '').toLowerCase().includes(q) ||
          (p.internal_code ?? '').toLowerCase().includes(q)
      )
    }
    return applyFilters(result, filters)
  }, [properties, tab, kind, search, filters])

  const activeFilterCount = countActiveFilters(filters)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <h1>Listings</h1>
          <p style={{ color: 'var(--color-secondary)' }}>Browse all Pathway properties.</p>
        </div>
        <input
          type="text"
          placeholder="Search listings..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: '10px 14px',
            borderRadius: 10,
            border: '1.5px solid var(--color-beige)',
            minWidth: 220,
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {([
          { label: 'Properties / Buildings', value: 'property' },
          { label: 'Condos', value: 'condo' },
        ] as const).map((k) => (
          <button
            key={k.value}
            onClick={() => setKind(k.value)}
            className="btn"
            style={{
              background: kind === k.value ? 'var(--color-primary)' : 'var(--color-beige)',
              color: kind === k.value ? 'var(--color-ivory)' : 'var(--color-charcoal)',
            }}
          >
            {k.label}
          </button>
        ))}
      </div>

      {kind === 'property' && (
      <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className="btn"
              style={{
                background: tab === t.value ? 'var(--color-primary)' : 'var(--color-beige)',
                color: tab === t.value ? 'var(--color-ivory)' : 'var(--color-charcoal)',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-outline"
            onClick={() => setShowFilters((s) => !s)}
            style={showFilters ? { background: 'var(--color-beige)' } : undefined}
          >
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </button>
          <div style={{ display: 'flex', borderRadius: 999, background: 'var(--color-beige)', padding: 3 }}>
            <button
              onClick={() => setView('cards')}
              className="btn"
              style={{
                background: view === 'cards' ? '#fff' : 'transparent',
                color: 'var(--color-charcoal)',
                boxShadow: view === 'cards' ? 'var(--shadow-soft)' : 'none',
                padding: '8px 16px',
              }}
            >
              Cards
            </button>
            <button
              onClick={() => setView('table')}
              className="btn"
              style={{
                background: view === 'table' ? '#fff' : 'transparent',
                color: 'var(--color-charcoal)',
                boxShadow: view === 'table' ? 'var(--shadow-soft)' : 'none',
                padding: '8px 16px',
              }}
            >
              Table
            </button>
          </div>
        </div>
      </div>

      {showFilters && (
        <PropertyFilters filters={filters} onChange={setFilters} municipalities={municipalities} activeCount={activeFilterCount} />
      )}

      {loading ? (
        <p style={{ color: 'var(--color-secondary)' }}>Loading listings...</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: 'var(--color-secondary)' }}>No listings match here.</p>
      ) : view === 'table' ? (
        <PropertyTable properties={filtered} agentsById={agentsById} isAdmin={!!agent?.is_admin} onSelect={setSelected} />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))',
            gap: 22,
          }}
        >
          {filtered.map((p) => (
            <PropertyCard key={p.id} property={p} onClick={() => setSelected(p)} />
          ))}
        </div>
      )}
      </>
      )}

      {kind === 'condo' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <p style={{ color: 'var(--color-secondary)', margin: 0 }}>
              {condoProjects.length} condo {condoProjects.length === 1 ? 'project' : 'projects'}
            </p>
            {agent?.is_admin && (
              <button className="btn btn-primary" onClick={() => navigate('/admin/condo/new')}>
                New condo project
              </button>
            )}
          </div>
          {condoProjects.length === 0 ? (
            <p style={{ color: 'var(--color-secondary)' }}>No condo projects yet.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))', gap: 18 }}>
              {condoProjects.map((cp) => (
                <div
                  key={cp.id}
                  className="card"
                  style={{ padding: 20, cursor: agent?.is_admin ? 'pointer' : 'default' }}
                  onClick={() => agent?.is_admin && navigate(`/admin/condo/${cp.id}`)}
                >
                  {cp.photos && cp.photos.length > 0 && (
                    <img
                      src={cp.photos[0]}
                      alt=""
                      style={{ width: '100%', height: 150, objectFit: 'cover', borderRadius: 8, marginBottom: 12 }}
                    />
                  )}
                  <p style={{ fontWeight: 600, marginBottom: 4 }}>{cp.name}</p>
                  <p style={{ fontSize: '0.82rem', color: 'var(--color-secondary)', margin: 0 }}>
                    {[cp.municipality, cp.completion_status].filter(Boolean).join(' - ')}
                  </p>
                  <p style={{ fontSize: '0.82rem', color: 'var(--color-secondary)', marginTop: 6, marginBottom: 0 }}>
                    {cp.show_on_website ? 'On website' : 'Hidden'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {selected && (
        <PropertyDetailModal property={selected} agentsById={agentsById} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
