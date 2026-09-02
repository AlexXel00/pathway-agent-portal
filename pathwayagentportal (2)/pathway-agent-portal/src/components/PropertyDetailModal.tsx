import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Agent, AgentActivity, Property } from '../lib/types'
import { formatPhp, formatNumber } from '../lib/format'

interface Props {
  property: Property
  agentsById: Record<string, Agent>
  onClose: () => void
}

export default function PropertyDetailModal({ property, agentsById, onClose }: Props) {
  const { agent } = useAuth()
  const [activity, setActivity] = useState<AgentActivity | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [advertised, setAdvertised] = useState(false)
  const [advertisedWhere, setAdvertisedWhere] = useState('')
  const [hasPotentialBuyer, setHasPotentialBuyer] = useState(false)
  const [wasShown, setWasShown] = useState(false)
  const [activeImg, setActiveImg] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!agent) return
      setLoading(true)
      const { data } = await supabase
        .from('agent_activity')
        .select('*')
        .eq('property_id', property.id)
        .eq('agent_id', agent.id)
        .maybeSingle()
      if (cancelled) return
      setActivity(data ?? null)
      setAdvertised(data?.advertised ?? false)
      setAdvertisedWhere(data?.advertised_where ?? '')
      setHasPotentialBuyer(data?.has_potential_buyer ?? false)
      setWasShown(data?.was_shown ?? false)
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [property.id, agent])

  async function save() {
    if (!agent) return
    setSaving(true)
    const payload = {
      property_id: property.id,
      agent_id: agent.id,
      advertised,
      advertised_where: advertised ? advertisedWhere : null,
      has_potential_buyer: hasPotentialBuyer,
      was_shown: wasShown,
      updated_at: new Date().toISOString(),
    }
    const { data, error } = await supabase
      .from('agent_activity')
      .upsert(payload, { onConflict: 'property_id,agent_id' })
      .select()
      .single()
    setSaving(false)
    if (!error) setActivity(data)
  }

  const listingAgent = property.listing_agent_id ? agentsById[property.listing_agent_id] : null
  const closingAgent = property.closing_agent_id ? agentsById[property.closing_agent_id] : null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(42,42,42,0.55)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '32px 16px',
        overflowY: 'auto',
        zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card"
        style={{ maxWidth: 860, width: '100%', overflow: 'hidden' }}
      >
        {property.photos?.length > 0 && (
          <div>
            <div
              style={{
                height: 340,
                background: `center / cover no-repeat url(${property.photos[activeImg]})`,
              }}
            />
            {property.photos.length > 1 && (
              <div style={{ display: 'flex', gap: 8, padding: '10px 16px', overflowX: 'auto' }}>
                {property.photos.map((url, i) => (
                  <button
                    key={url}
                    onClick={() => setActiveImg(i)}
                    style={{
                      width: 56,
                      height: 56,
                      flexShrink: 0,
                      borderRadius: 8,
                      border: i === activeImg ? '2px solid var(--color-primary)' : '2px solid transparent',
                      background: `center / cover no-repeat url(${url})`,
                      padding: 0,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ padding: '24px 28px 32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div>
              <span
                className={`badge ${property.listing_status === 'Active' ? 'badge-active' : property.listing_status === 'Sold' ? 'badge-sold' : 'badge-neutral'}`}
              >
                {property.listing_status}
              </span>
              <h2 style={{ marginTop: 10 }}>{property.name}</h2>
              <p style={{ color: 'var(--color-secondary)' }}>
                {[property.barangay, property.municipality].filter(Boolean).join(', ')}
                {property.internal_code ? ` - ${property.internal_code}` : ''}
              </p>
            </div>
            <button className="btn btn-ghost" onClick={onClose}>
              Close
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: 14,
              margin: '18px 0',
              padding: '16px',
              background: 'var(--color-ivory)',
              borderRadius: 12,
            }}
          >
            <Stat label="Price" value={formatPhp(property.price_total_php)} />
            <Stat
              label="Price / sqm"
              value={property.price_per_sqm_php ? formatPhp(property.price_per_sqm_php) : '-'}
            />
            <Stat label="Lot size" value={property.lot_size_sqm ? `${formatNumber(property.lot_size_sqm)} sqm` : '-'} />
            <Stat label="Type" value={property.type ?? '-'} />
            <Stat label="Approx. commission" value={formatPhp(property.approx_commission_php)} />
            <Stat label="Title status" value={property.title_status ?? '-'} />
          </div>

          {property.has_structure && (
            <p style={{ fontSize: '0.9rem' }}>
              <strong>Structure:</strong> {property.structure_type ?? '-'}
              {property.structure_size_sqm ? ` - ${formatNumber(property.structure_size_sqm)} sqm` : ''}
            </p>
          )}

          {property.tags?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '4px 0 14px' }}>
              {property.tags.map((tag) => (
                <span key={tag} className="badge badge-neutral">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {property.special_selling_point && (
            <p style={{ fontSize: '0.9rem' }}>
              <strong>Highlights:</strong> {property.special_selling_point}
            </p>
          )}

          {property.description && (
            <p style={{ fontSize: '0.92rem', whiteSpace: 'pre-line' }}>{property.description}</p>
          )}

          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: '0.88rem', margin: '14px 0' }}>
            <span>
              <strong>Listing agent:</strong> {listingAgent?.name ?? property.owner_contact_name ?? '-'}
            </span>
            {property.has_other_broker && (
              <span>
                <strong>Other broker:</strong> {property.other_broker_name}
                {property.other_broker_contact ? ` (${property.other_broker_contact})` : ''}
              </span>
            )}
            {property.listing_status === 'Sold' && closingAgent && (
              <span>
                <strong>Closed by:</strong> {closingAgent.name}
              </span>
            )}
            {property.map_url && (
              <a href={property.map_url} target="_blank" rel="noreferrer">
                View on map
              </a>
            )}
            {property.videos?.map((v, i) => (
              <a key={v} href={v} target="_blank" rel="noreferrer">
                Video {i + 1}
              </a>
            ))}
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--color-beige)', margin: '22px 0' }} />

          <h3 style={{ fontSize: '1rem' }}>My activity on this listing</h3>
          {loading ? (
            <p style={{ color: 'var(--color-secondary)' }}>Loading...</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label className="checkbox-row">
                <input type="checkbox" checked={advertised} onChange={(e) => setAdvertised(e.target.checked)} />
                I advertised this listing
              </label>
              {advertised && (
                <div className="field" style={{ marginLeft: 24, marginBottom: 0 }}>
                  <label htmlFor="where">Where?</label>
                  <input
                    id="where"
                    type="text"
                    placeholder="e.g. Facebook, Instagram, personal network"
                    value={advertisedWhere}
                    onChange={(e) => setAdvertisedWhere(e.target.value)}
                  />
                </div>
              )}
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={hasPotentialBuyer}
                  onChange={(e) => setHasPotentialBuyer(e.target.checked)}
                />
                I have a potential buyer
              </label>
              <label className="checkbox-row">
                <input type="checkbox" checked={wasShown} onChange={(e) => setWasShown(e.target.checked)} />
                I showed this listing
              </label>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
                <button className="btn btn-primary" onClick={save} disabled={saving}>
                  {saving ? 'Saving...' : 'Save my activity'}
                </button>
                {activity && (
                  <span style={{ fontSize: '0.78rem', color: 'var(--color-secondary)' }}>
                    Last updated {new Date(activity.updated_at).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--color-secondary)' }}>
        {label}
      </div>
      <div style={{ fontWeight: 600 }}>{value}</div>
    </div>
  )
}
