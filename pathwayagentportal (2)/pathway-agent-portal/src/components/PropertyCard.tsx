import type { Property } from '../lib/types'
import { formatPhp, formatNumber } from '../lib/format'

interface Props {
  property: Property
  onClick: () => void
}

export default function PropertyCard({ property, onClick }: Props) {
  const cover = property.photos?.[0]

  return (
    <button
      onClick={onClick}
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        textAlign: 'left',
        overflow: 'hidden',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-3px)'
        e.currentTarget.style.boxShadow = 'var(--shadow-card)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'none'
        e.currentTarget.style.boxShadow = 'var(--shadow-soft)'
      }}
    >
      <div
        style={{
          height: 190,
          background: cover
            ? `center / cover no-repeat url(${cover})`
            : 'linear-gradient(135deg, var(--color-beige), var(--color-accent))',
          position: 'relative',
        }}
      >
        <span
          className={`badge ${property.listing_status === 'Active' ? 'badge-active' : property.listing_status === 'Sold' ? 'badge-sold' : 'badge-neutral'}`}
          style={{ position: 'absolute', top: 12, left: 12 }}
        >
          {property.listing_status}
        </span>
      </div>
      <div style={{ padding: '16px 18px 20px' }}>
        <h3 style={{ fontSize: '1.08rem', marginBottom: 4 }}>{property.name}</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-secondary)', marginBottom: 10 }}>
          {[property.barangay, property.municipality].filter(Boolean).join(', ') || 'Location tba'}
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--color-primary)' }}>
              {formatPhp(property.price_total_php)}
            </div>
            {property.lot_size_sqm && (
              <div style={{ fontSize: '0.78rem', color: 'var(--color-secondary)' }}>
                {formatNumber(property.lot_size_sqm)} sqm
              </div>
            )}
          </div>
          {property.type && <span className="badge badge-neutral">{property.type}</span>}
        </div>
      </div>
    </button>
  )
}
