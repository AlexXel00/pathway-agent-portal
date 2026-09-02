import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { CompanyCategory, CompanyInfo as CompanyInfoRow } from '../lib/types'

const CATEGORIES: CompanyCategory[] = ['Our Values', 'Our Services', 'FAQ', 'Marketing Guide']

const BRAND_SWATCHES: { label: string; hex: string }[] = [
  { label: 'Primary Brown', hex: '#7e6454' },
  { label: 'Secondary Brown', hex: '#8d7764' },
  { label: 'Tan / Accent', hex: '#b6a180' },
  { label: 'Light Beige', hex: '#e4ded3' },
  { label: 'Ivory / Background', hex: '#fffaf0' },
  { label: 'Charcoal / Text', hex: '#2a2a2a' },
]

export default function CompanyInfo() {
  const [items, setItems] = useState<CompanyInfoRow[]>([])
  const [tab, setTab] = useState<CompanyCategory>('Our Values')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase.from('company_info').select('*').order('sort_order', { ascending: true })
      setItems(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const visible = items.filter((i) => i.category === tab)

  return (
    <div>
      <h1>Company Info</h1>
      <p style={{ color: 'var(--color-secondary)', marginBottom: 24 }}>
        Values, services, buyer FAQ, and our brand guide.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 26, flexWrap: 'wrap' }}>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setTab(c)}
            className="btn"
            style={{
              background: tab === c ? 'var(--color-primary)' : 'var(--color-beige)',
              color: tab === c ? 'var(--color-ivory)' : 'var(--color-charcoal)',
            }}
          >
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: 'var(--color-secondary)' }}>Loading...</p>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 20,
          }}
        >
          {visible.map((item) => (
            <div key={item.id} className="card" style={{ padding: '22px 24px' }}>
              {item.image_url && (
                <img
                  src={item.image_url}
                  alt={item.title}
                  style={{ width: '100%', borderRadius: 10, marginBottom: 14, maxHeight: 160, objectFit: 'contain', background: 'var(--color-ivory)' }}
                />
              )}
              <h3 style={{ fontSize: '1.05rem' }}>{item.title}</h3>
              {item.title === 'Brand Colors' ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
                  {BRAND_SWATCHES.map((s) => (
                    <div key={s.hex} style={{ textAlign: 'center', width: 78 }}>
                      <div
                        style={{
                          width: 60,
                          height: 60,
                          borderRadius: 10,
                          background: s.hex,
                          border: '1px solid rgba(0,0,0,0.08)',
                          margin: '0 auto 6px',
                        }}
                      />
                      <div style={{ fontSize: '0.68rem', color: 'var(--color-secondary)' }}>{s.label}</div>
                      <div style={{ fontSize: '0.68rem', fontFamily: 'monospace' }}>{s.hex}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '0.92rem', whiteSpace: 'pre-line' }}>{item.body}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
