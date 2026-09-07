import { COMMON_TAGS } from '../lib/constants'
import type { PropertyType } from '../lib/types'

const TYPES: PropertyType[] = ['Commercial', 'Residential', 'Apartment/Condo', 'Agricultural', 'A&D', 'Other']

export interface FilterState {
  type: PropertyType | 'All'
  municipality: string | 'All'
  minPrice: string
  maxPrice: string
  minSize: string
  maxSize: string
  tags: string[]
}

export const EMPTY_FILTERS: FilterState = {
  type: 'All',
  municipality: 'All',
  minPrice: '',
  maxPrice: '',
  minSize: '',
  maxSize: '',
  tags: [],
}

interface Props {
  filters: FilterState
  onChange: (filters: FilterState) => void
  municipalities: string[]
  activeCount: number
}

export default function PropertyFilters({ filters, onChange, municipalities, activeCount }: Props) {
  function update<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    onChange({ ...filters, [key]: value })
  }

  function toggleTag(tag: string) {
    const has = filters.tags.includes(tag)
    update('tags', has ? filters.tags.filter((t) => t !== tag) : [...filters.tags, tag])
  }

  return (
    <div className="card" style={{ padding: '18px 20px', marginBottom: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h3 style={{ fontSize: '0.95rem', margin: 0 }}>Filters</h3>
        {activeCount > 0 && (
          <button className="btn btn-ghost" style={{ fontSize: '0.8rem' }} onClick={() => onChange(EMPTY_FILTERS)}>
            Clear all ({activeCount})
          </button>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 14,
          marginBottom: 14,
        }}
      >
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="filterType">Type</label>
          <select id="filterType" value={filters.type} onChange={(e) => update('type', e.target.value as FilterState['type'])}>
            <option value="All">All types</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="filterLocation">Location</label>
          <select id="filterLocation" value={filters.municipality} onChange={(e) => update('municipality', e.target.value)}>
            <option value="All">All locations</option>
            {municipalities.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="minPrice">Price (PHP)</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              id="minPrice"
              type="number"
              min="0"
              placeholder="Min"
              value={filters.minPrice}
              onChange={(e) => update('minPrice', e.target.value)}
            />
            <input
              type="number"
              min="0"
              placeholder="Max"
              value={filters.maxPrice}
              onChange={(e) => update('maxPrice', e.target.value)}
            />
          </div>
        </div>

        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="minSize">Lot size (sqm)</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              id="minSize"
              type="number"
              min="0"
              placeholder="Min"
              value={filters.minSize}
              onChange={(e) => update('minSize', e.target.value)}
            />
            <input
              type="number"
              min="0"
              placeholder="Max"
              value={filters.maxSize}
              onChange={(e) => update('maxSize', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div>
        <label
          style={{
            display: 'block',
            fontSize: '0.8rem',
            fontWeight: 600,
            color: 'var(--color-secondary)',
            marginBottom: 8,
            textTransform: 'uppercase',
            letterSpacing: '0.03em',
          }}
        >
          Highlights
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {COMMON_TAGS.map((tag) => {
            const active = filters.tags.includes(tag)
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className="badge"
                style={{
                  cursor: 'pointer',
                  border: 'none',
                  background: active ? 'var(--color-primary)' : 'var(--color-beige)',
                  color: active ? 'var(--color-ivory)' : 'var(--color-charcoal)',
                }}
              >
                {tag}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function countActiveFilters(f: FilterState): number {
  let count = 0
  if (f.type !== 'All') count++
  if (f.municipality !== 'All') count++
  if (f.minPrice) count++
  if (f.maxPrice) count++
  if (f.minSize) count++
  if (f.maxSize) count++
  count += f.tags.length
  return count
}

export function applyFilters<T extends { type: PropertyType | null; municipality: string | null; price_total_php: number | null; lot_size_sqm: number | null; tags: string[] }>(
  properties: T[],
  f: FilterState
): T[] {
  return properties.filter((p) => {
    if (f.type !== 'All' && p.type !== f.type) return false
    if (f.municipality !== 'All' && p.municipality !== f.municipality) return false
    if (f.minPrice && (p.price_total_php ?? 0) < Number(f.minPrice)) return false
    if (f.maxPrice && (p.price_total_php ?? Infinity) > Number(f.maxPrice)) return false
    if (f.minSize && (p.lot_size_sqm ?? 0) < Number(f.minSize)) return false
    if (f.maxSize && (p.lot_size_sqm ?? Infinity) > Number(f.maxSize)) return false
    if (f.tags.length > 0 && !f.tags.every((t) => p.tags.includes(t))) return false
    return true
  })
}
