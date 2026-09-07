import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { CompanyCategory, CompanyInfo as CompanyInfoRow } from '../lib/types'

const CATEGORIES: CompanyCategory[] = ['Our Values', 'Our Services', 'FAQ', 'Marketing Guide']

const CATEGORY_TAGLINES: Record<CompanyCategory, string> = {
  'Our Values': 'What we stand for, and how we work with clients and each other.',
  'Our Services': 'Everything Pathway offers, from first search to move-in.',
  FAQ: 'The questions clients ask most, answered.',
  'Marketing Guide': 'Colors, type, and logo usage for on-brand materials.',
}

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
  const [openFaq, setOpenFaq] = useState<string | null>(null)

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
      <div
        className="card"
        style={{
          padding: '40px 36px',
          marginBottom: 28,
          background: 'linear-gradient(135deg, var(--color-primary) 0%, #5c4a3d 100%)',
          color: 'var(--color-ivory)',
          border: 'none',
          boxShadow: 'var(--shadow-card)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: -60,
            right: -60,
            width: 220,
            height: 220,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
          }}
        />
        <div
          aria-hidden
          style={{
            position: 'absolute',
            bottom: -80,
            right: 80,
            width: 160,
            height: 160,
            borderRadius: '50%',
            border: '1.5px solid rgba(255,255,255,0.14)',
          }}
        />
        <p
          style={{
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            fontSize: '0.75rem',
            color: 'var(--color-accent)',
            marginBottom: 10,
            fontWeight: 600,
          }}
        >
          Pathway Real Estate
        </p>
        <h1 style={{ color: 'var(--color-ivory)', fontSize: '2rem', maxWidth: 520, position: 'relative' }}>
          We help you all the way
        </h1>
        <p style={{ color: 'rgba(255,250,240,0.82)', maxWidth: 480, marginBottom: 0, position: 'relative' }}>
          Everything you and your team need to know about our values, services, client FAQ, and brand - in one
          place.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
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

      <p style={{ color: 'var(--color-secondary)', marginTop: -18, marginBottom: 26, fontSize: '0.92rem' }}>
        {CATEGORY_TAGLINES[tab]}
      </p>

      {loading ? (
        <p style={{ color: 'var(--color-secondary)' }}>Loading...</p>
      ) : tab === 'FAQ' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 760 }}>
          {visible.map((item, i) => {
            const open = openFaq === item.id
            return (
              <div key={item.id} className="card" style={{ overflow: 'hidden' }}>
                <button
                  type="button"
                  onClick={() => setOpenFaq(open ? null : item.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    padding: '18px 22px',
                    background: 'transparent',
                    border: 'none',
                    textAlign: 'left',
                  }}
                >
                  <span
                    style={{
                      flexShrink: 0,
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      background: 'var(--color-beige)',
                      color: 'var(--color-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                    }}
                  >
                    {i + 1}
                  </span>
                  <span style={{ flex: 1, fontWeight: 600, fontSize: '0.96rem' }}>{item.title}</span>
                  <span
                    style={{
                      flexShrink: 0,
                      color: 'var(--color-secondary)',
                      fontSize: '1.2rem',
                      lineHeight: 1,
                      transform: open ? 'rotate(45deg)' : 'none',
                      transition: 'transform 0.15s ease',
                    }}
                  >
                    +
                  </span>
                </button>
                {open && (
                  <p
                    style={{
                      padding: '0 22px 20px 64px',
                      margin: 0,
                      fontSize: '0.92rem',
                      color: 'var(--color-secondary)',
                      whiteSpace: 'pre-line',
                    }}
                  >
                    {item.body}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      ) : tab === 'Our Values' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 760 }}>
          {visible.map((item, i) => (
            <div key={item.id} className="card" style={{ padding: '22px 26px', display: 'flex', gap: 20 }}>
              <span
                style={{
                  flexShrink: 0,
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: 'var(--color-primary)',
                  color: 'var(--color-ivory)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 700,
                  fontSize: '1.1rem',
                }}
              >
                {i + 1}
              </span>
              <div>
                <h3 style={{ fontSize: '1.05rem', marginBottom: 6 }}>{item.title}</h3>
                <p style={{ fontSize: '0.92rem', color: 'var(--color-secondary)', whiteSpace: 'pre-line', marginBottom: 0 }}>
                  {item.body}
                </p>
              </div>
            </div>
          ))}
        </div>
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
