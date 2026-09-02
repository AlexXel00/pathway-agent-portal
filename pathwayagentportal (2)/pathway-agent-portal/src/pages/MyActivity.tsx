import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { AgentActivity, AgentStats, Property } from '../lib/types'
import { formatPhp } from '../lib/format'

export default function MyActivity() {
  const { agent } = useAuth()
  const [stats, setStats] = useState<AgentStats | null>(null)
  const [activities, setActivities] = useState<(AgentActivity & { property: Property | null })[]>([])
  const [listedProperties, setListedProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!agent) return
    async function load() {
      setLoading(true)
      const [{ data: s }, { data: acts }, { data: listed }] = await Promise.all([
        supabase.from('agent_stats').select('*').eq('agent_id', agent!.id).maybeSingle(),
        supabase
          .from('agent_activity')
          .select('*, property:properties(*)')
          .eq('agent_id', agent!.id)
          .order('updated_at', { ascending: false }),
        supabase.from('properties').select('*').eq('listing_agent_id', agent!.id),
      ])
      setStats(s ?? null)
      setActivities((acts as unknown as (AgentActivity & { property: Property | null })[]) ?? [])
      setListedProperties(listed ?? [])
      setLoading(false)
    }
    load()
  }, [agent])

  if (loading || !stats) {
    return <p style={{ color: 'var(--color-secondary)' }}>Loading your activity...</p>
  }

  return (
    <div>
      <h1>My Activity</h1>
      <p style={{ color: 'var(--color-secondary)', marginBottom: 24 }}>Overview of your performance at Pathway.</p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 16,
          marginBottom: 32,
        }}
      >
        <StatCard label="Closed sales" value={String(stats.total_sales_count)} />
        <StatCard label="Total sale value" value={formatPhp(stats.total_sale_value_php)} />
        <StatCard label="Commission earned" value={formatPhp(stats.total_commission_php)} />
        <StatCard label="Advertised listings" value={String(stats.advertised_count)} />
        <StatCard label="Potential buyers" value={String(stats.potential_buyer_count)} />
      </div>

      {listedProperties.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <h3>Listings where I'm the listing agent</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {listedProperties.map((p) => (
              <div key={p.id} className="card" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between' }}>
                <span>{p.name}</span>
                <span className={`badge ${p.listing_status === 'Active' ? 'badge-active' : p.listing_status === 'Sold' ? 'badge-sold' : 'badge-neutral'}`}>
                  {p.listing_status}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3>My activity log</h3>
        {activities.length === 0 ? (
          <p style={{ color: 'var(--color-secondary)' }}>You haven't logged activity on any listing yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {activities.map((a) => (
              <div key={a.id} className="card" style={{ padding: '14px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <strong>{a.property?.name ?? 'Unknown listing'}</strong>
                  <span style={{ fontSize: '0.78rem', color: 'var(--color-secondary)' }}>
                    {new Date(a.updated_at).toLocaleDateString()}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap', fontSize: '0.82rem' }}>
                  {a.advertised && <span className="badge badge-neutral">Advertised{a.advertised_where ? ` - ${a.advertised_where}` : ''}</span>}
                  {a.has_potential_buyer && <span className="badge badge-neutral">Potential buyer</span>}
                  {a.was_shown && <span className="badge badge-neutral">Shown</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card" style={{ padding: '18px 20px' }}>
      <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--color-secondary)', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: '1.4rem', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>{value}</div>
    </div>
  )
}
