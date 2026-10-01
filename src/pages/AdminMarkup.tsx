import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

interface MarkupRow {
  id: string
  internal_code: string | null
  name: string | null
  municipality: string | null
  listing_status: string | null
  selling_price: number | null
  owner_price: number | null
  markup_amount: number | null
  markup_pct: number | null
}

export default function AdminMarkup() {
  const { agent } = useAuth()
  const navigate = useNavigate()
  const [rows, setRows] = useState<MarkupRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (agent && !agent.can_view_markup) {
      navigate('/listings')
      return
    }
    supabase
      .from('markup_report')
      .select('*')
      .then(({ data }) => {
        const list = (data as MarkupRow[]) ?? []
        list.sort((a, b) => (b.markup_pct ?? 0) - (a.markup_pct ?? 0))
        setRows(list)
        setLoading(false)
      })
  }, [agent, navigate])

  if (!agent?.can_view_markup) return <p style={{ color: 'var(--color-secondary)' }}>Not authorised.</p>

  const peso = (n: number | null) => (n == null ? '-' : 'PHP ' + Number(n).toLocaleString())

  return (
    <div>
      <h1>Markup</h1>
      <p style={{ color: 'var(--color-secondary)', marginBottom: 20 }}>
        Confidential - visible only to markup-authorised users. Owner price vs. our selling price and the markup on top.
        Enter the owner price per listing in the listing editor.
      </p>

      {loading ? (
        <p style={{ color: 'var(--color-secondary)' }}>Loading...</p>
      ) : rows.length === 0 ? (
        <p style={{ color: 'var(--color-secondary)' }}>
          No owner prices entered yet. Open a listing in the editor and fill in the confidential owner price.
        </p>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--color-secondary)', borderBottom: '1px solid var(--color-beige)' }}>
                <th style={{ padding: '10px 12px' }}>Listing</th>
                <th style={{ padding: '10px 12px' }}>Location</th>
                <th style={{ padding: '10px 12px' }}>Status</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Owner price</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Our price</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Markup</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Markup %</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  style={{ borderBottom: '1px solid var(--color-beige)', cursor: 'pointer' }}
                  onClick={() => navigate(`/admin/edit-listing/${r.id}`)}
                >
                  <td style={{ padding: '10px 12px' }}>
                    {r.name || r.internal_code || '(unnamed)'}
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--color-secondary)' }}>{r.municipality || '-'}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--color-secondary)' }}>{r.listing_status || '-'}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>{peso(r.owner_price)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>{peso(r.selling_price)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>{peso(r.markup_amount)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>
                    {r.markup_pct == null ? '-' : `${r.markup_pct}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
