import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Agent, ListingStatus, Property } from '../lib/types'
import PropertyCard from '../components/PropertyCard'
import PropertyDetailModal from '../components/PropertyDetailModal'

const TABS: { label: string; value: ListingStatus | 'All' }[] = [
  { label: 'Active', value: 'Active' },
  { label: 'Sold', value: 'Sold' },
  { label: 'All', value: 'All' },
]

export default function Listings() {
  const [properties, setProperties] = useState<Property[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<ListingStatus | 'All'>('Active')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Property | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [{ data: props }, { data: ags }] = await Promise.all([
        supabase.from('properties').select('*').order('created_at', { ascending: false }),
        supabase.from('agents').select('*'),
      ])
      setProperties(props ?? [])
      setAgents(ags ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const agentsById = useMemo(() => {
    const map: Record<string, Agent> = {}
    agents.forEach((a) => (map[a.id] = a))
    return map
  }, [agents])

  const filtered = properties.filter((p) => {
    if (tab !== 'All' && p.listing_status !== tab) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return (
        p.name.toLowerCase().includes(q) ||
        (p.municipality ?? '').toLowerCase().includes(q) ||
        (p.barangay ?? '').toLowerCase().includes(q) ||
        (p.internal_code ?? '').toLowerCase().includes(q)
      )
    }
    return true
  })

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

      <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
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

      {loading ? (
        <p style={{ color: 'var(--color-secondary)' }}>Loading listings...</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: 'var(--color-secondary)' }}>No listings here yet.</p>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 22,
          }}
        >
          {filtered.map((p) => (
            <PropertyCard key={p.id} property={p} onClick={() => setSelected(p)} />
          ))}
        </div>
      )}

      {selected && (
        <PropertyDetailModal property={selected} agentsById={agentsById} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
