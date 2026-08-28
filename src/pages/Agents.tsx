import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { AgentStats } from '../lib/types'
import { formatPhp } from '../lib/format'

export default function Agents() {
  const [stats, setStats] = useState<AgentStats[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('agent_stats')
        .select('*')
        .order('total_sales_count', { ascending: false })
      setStats(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const maxSales = Math.max(1, ...stats.map((s) => s.total_sales_count))

  return (
    <div>
      <h1>Agents Leaderboard</h1>
      <p style={{ color: 'var(--color-secondary)', marginBottom: 28 }}>Ranked by number of closed sales.</p>

      {loading ? (
        <p style={{ color: 'var(--color-secondary)' }}>Loading...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {stats.map((s, i) => (
            <div key={s.agent_id} className="card" style={{ padding: '18px 22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      background: i === 0 ? 'var(--color-primary)' : 'var(--color-beige)',
                      color: i === 0 ? 'var(--color-ivory)' : 'var(--color-charcoal)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                    }}
                  >
                    {i + 1}
                  </span>
                  <strong>{s.name}</strong>
                  {s.is_admin && <span className="badge badge-neutral">Admin</span>}
                </div>
                <div style={{ display: 'flex', gap: 20, fontSize: '0.85rem', color: 'var(--color-secondary)' }}>
                  <span>{s.total_sales_count} sales</span>
                  <span>{formatPhp(s.total_sale_value_php)}</span>
                  <span>{formatPhp(s.total_commission_php)} commission</span>
                </div>
              </div>
              <div style={{ height: 8, borderRadius: 999, background: 'var(--color-beige)', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${(s.total_sales_count / maxSales) * 100}%`,
                    background: 'var(--color-primary)',
                    borderRadius: 999,
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: '0.78rem', color: 'var(--color-secondary)' }}>
                <span>{s.advertised_count} advertised</span>
                <span>{s.potential_buyer_count} potential buyers</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
