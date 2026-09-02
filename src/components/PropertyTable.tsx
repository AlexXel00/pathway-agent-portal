import type { Property } from '../lib/types'
import { formatPhp, formatNumber } from '../lib/format'

interface Props {
  properties: Property[]
  onSelect: (property: Property) => void
}

export default function PropertyTable({ properties, onSelect }: Props) {
  const sorted = [...properties].sort((a, b) =>
    (a.internal_code ?? '').localeCompare(b.internal_code ?? '', undefined, { numeric: true, sensitivity: 'base' })
  )

  return (
    <div className="card" style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
        <thead>
          <tr style={{ background: 'var(--color-ivory)', textAlign: 'left' }}>
            <Th>Internal code</Th>
            <Th>Name</Th>
            <Th>Location</Th>
            <Th>Type</Th>
            <Th>Lot size</Th>
            <Th>Price</Th>
            <Th>Status</Th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => (
            <tr
              key={p.id}
              onClick={() => onSelect(p)}
              style={{ borderTop: '1px solid var(--color-beige)', cursor: 'pointer' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-ivory)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <Td>{p.internal_code || '-'}</Td>
              <Td>
                <strong>{p.name}</strong>
              </Td>
              <Td>{[p.barangay, p.municipality].filter(Boolean).join(', ') || '-'}</Td>
              <Td>{p.type ?? '-'}</Td>
              <Td>{p.lot_size_sqm ? `${formatNumber(p.lot_size_sqm)} sqm` : '-'}</Td>
              <Td>{formatPhp(p.price_total_php)}</Td>
              <Td>
                <span
                  className={`badge ${p.listing_status === 'Active' ? 'badge-active' : p.listing_status === 'Sold' ? 'badge-sold' : 'badge-neutral'}`}
                >
                  {p.listing_status}
                </span>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
      {sorted.length === 0 && (
        <p style={{ padding: 20, color: 'var(--color-secondary)' }}>No listings match the current filters.</p>
      )}
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th style={{ padding: '10px 14px', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--color-secondary)' }}>
      {children}
    </th>
  )
}

function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: '12px 14px' }}>{children}</td>
}
