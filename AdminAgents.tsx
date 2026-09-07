import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Agent } from '../lib/types'

export default function AdminAgents() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('agents').select('*').order('created_at', { ascending: true })
    setAgents(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function addAgent(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    const { error } = await supabase.from('agents').insert({ name, email, phone: phone || null, is_admin: false })
    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    setName('')
    setEmail('')
    setPhone('')
    load()
  }

  async function toggleAdmin(agent: Agent) {
    await supabase.from('agents').update({ is_admin: !agent.is_admin }).eq('id', agent.id)
    load()
  }

  return (
    <div>
      <h1>Manage Agents</h1>
      <p style={{ color: 'var(--color-secondary)', marginBottom: 24 }}>
        Add a new agent here first with their email - they can then create their own login with that same email
        on the sign-up screen.
      </p>

      <form onSubmit={addAgent} className="card" style={{ padding: '22px 26px', marginBottom: 28, maxWidth: 520 }}>
        <h3 style={{ fontSize: '1rem' }}>Add agent</h3>
        <div className="field">
          <label htmlFor="name">Name</label>
          <input id="name" type="text" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="phone">Phone (optional)</label>
          <input id="phone" type="text" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        {error && <p style={{ color: 'var(--color-danger)', fontSize: '0.85rem' }}>{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Adding...' : 'Add agent'}
        </button>
      </form>

      <h3 style={{ fontSize: '1rem' }}>All agents</h3>
      {loading ? (
        <p style={{ color: 'var(--color-secondary)' }}>Loading...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {agents.map((a) => (
            <div key={a.id} className="card" style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <strong>{a.name}</strong>
                <div style={{ fontSize: '0.82rem', color: 'var(--color-secondary)' }}>
                  {a.email ?? 'no email yet'} {a.phone ? `- ${a.phone}` : ''}
                </div>
                <div style={{ fontSize: '0.76rem', color: a.user_id ? 'var(--color-success)' : 'var(--color-secondary)' }}>
                  {a.user_id ? 'Account linked' : 'Waiting for sign-up'}
                </div>
              </div>
              <label className="checkbox-row">
                <input type="checkbox" checked={a.is_admin} onChange={() => toggleAdmin(a)} />
                Admin
              </label>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
