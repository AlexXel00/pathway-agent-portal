import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { MarketingMaterial } from '../lib/types'

export default function MarketingMaterialPage() {
  const { agent } = useAuth()
  const [items, setItems] = useState<MarketingMaterial[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [url, setUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('marketing_materials').select('*').order('created_at', { ascending: false })
    setItems(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function addMaterial(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    const { error } = await supabase
      .from('marketing_materials')
      .insert({ title, description: description || null, url, created_by: agent?.id ?? null })
    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    setTitle('')
    setDescription('')
    setUrl('')
    load()
  }

  async function removeMaterial(id: string) {
    await supabase.from('marketing_materials').delete().eq('id', id)
    load()
  }

  return (
    <div>
      <h1>Marketing Material</h1>
      <p style={{ color: 'var(--color-secondary)', marginBottom: 28 }}>
        General company marketing resources - photos, videos, brand assets, and templates for outside use.
      </p>

      {agent?.is_admin && (
        <form onSubmit={addMaterial} className="card" style={{ padding: '22px 26px', marginBottom: 28, maxWidth: 560 }}>
          <h3 style={{ fontSize: '1rem' }}>Add material</h3>
          <div className="field">
            <label htmlFor="title">Title</label>
            <input id="title" type="text" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="description">Description (optional)</label>
            <input id="description" type="text" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="url">Link (Google Drive, etc.)</label>
            <input id="url" type="url" required placeholder="https://drive.google.com/..." value={url} onChange={(e) => setUrl(e.target.value)} />
          </div>
          {error && <p style={{ color: 'var(--color-danger)', fontSize: '0.85rem' }}>{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Adding...' : 'Add material'}
          </button>
        </form>
      )}

      {loading ? (
        <p style={{ color: 'var(--color-secondary)' }}>Loading...</p>
      ) : items.length === 0 ? (
        <p style={{ color: 'var(--color-secondary)' }}>No marketing material has been added yet.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          {items.map((item) => (
            <div key={item.id} className="card" style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <h3 style={{ fontSize: '1rem', marginBottom: 0 }}>{item.title}</h3>
              {item.description && (
                <p style={{ fontSize: '0.88rem', color: 'var(--color-secondary)', margin: 0 }}>{item.description}</p>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                <a href={item.url} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ fontSize: '0.85rem' }}>
                  Open / Download
                </a>
                {agent?.is_admin && (
                  <button type="button" className="btn btn-ghost" onClick={() => removeMaterial(item.id)}>
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
