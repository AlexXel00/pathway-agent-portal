import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { ContentCategory } from '../lib/types'
import { formatBlockRange, formatWeekdayDayMonth, isMonday } from '../lib/contentCalendar'
import { useSocialLookups } from '../lib/useSocialData'

type Requires = ContentCategory['requires_object']

interface Draft {
  id: string | null
  name: string
  color: string
  requires_object: Requires
  is_active: boolean
  sort_order: number
}

function toDraft(c: ContentCategory): Draft {
  return {
    id: c.id,
    name: c.name,
    color: c.color,
    requires_object: c.requires_object,
    is_active: c.is_active,
    sort_order: c.sort_order,
  }
}

export default function SocialSettings() {
  const { lookups, error: lookupError, reload } = useSocialLookups()
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [anchor, setAnchor] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!lookups) return
    setDrafts(lookups.categories.map(toDraft))
    setAnchor(lookups.anchor)
  }, [lookups])

  function update(index: number, patch: Partial<Draft>) {
    setDrafts((list) => list.map((d, i) => (i === index ? { ...d, ...patch } : d)))
  }

  async function saveCategories() {
    setError(null)
    setMessage(null)
    const named = drafts.filter((d) => d.name.trim())
    const names = named.map((d) => d.name.trim().toLowerCase())
    if (new Set(names).size !== names.length) {
      setError('Two categories have the same name.')
      return
    }
    setSaving(true)
    for (const [i, d] of named.entries()) {
      const payload = {
        name: d.name.trim(),
        color: d.color,
        requires_object: d.requires_object,
        is_active: d.is_active,
        sort_order: i + 1,
      }
      const res = d.id
        ? await supabase.from('content_categories').update(payload).eq('id', d.id)
        : await supabase.from('content_categories').insert(payload)
      if (res.error) {
        setSaving(false)
        setError(`${d.name}: ${res.error.message}`)
        return
      }
    }
    setSaving(false)
    setMessage('Categories saved.')
    reload()
  }

  async function saveAnchor() {
    setError(null)
    setMessage(null)
    if (!anchor || !isMonday(anchor)) {
      setError('The first block has to start on a Monday.')
      return
    }
    setSaving(true)
    const { error: saveError } = await supabase
      .from('content_settings')
      .upsert({ key: 'block_anchor_monday', value: anchor }, { onConflict: 'key' })
    setSaving(false)
    if (saveError) {
      setError(saveError.message)
      return
    }
    setMessage('Block rhythm saved.')
    reload()
  }

  if (lookupError) return <p style={{ color: 'var(--color-danger)' }}>{lookupError}</p>
  if (!lookups) return <p style={{ color: 'var(--color-secondary)' }}>Loading...</p>

  return (
    <div style={{ maxWidth: 820 }}>
      <Link to="/social" className="btn btn-ghost" style={{ marginBottom: 12 }}>
        Back to calendar
      </Link>
      <h1>Calendar settings</h1>
      <p style={{ color: 'var(--color-secondary)', marginBottom: 24 }}>Only the head admin can change these.</p>

      {error && <p style={{ color: 'var(--color-danger)' }}>{error}</p>}
      {message && <p style={{ color: 'var(--color-success)' }}>{message}</p>}

      <div className="card" style={{ padding: '22px 26px', marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.15rem' }}>Categories</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-secondary)' }}>
          A category can require a property or a condo project, so every post in it shows which listing it promotes.
          Hide a category instead of deleting it, so older posts keep their label.
        </p>
        <div style={{ display: 'grid', gap: 10 }}>
          {drafts.map((d, i) => (
            <div
              key={d.id ?? `new-${i}`}
              style={{
                display: 'grid',
                gridTemplateColumns: '44px minmax(0, 2fr) minmax(0, 1.4fr) auto',
                gap: 10,
                alignItems: 'center',
              }}
            >
              <input
                type="color"
                value={d.color}
                aria-label="Colour"
                onChange={(e) => update(i, { color: e.target.value })}
                style={{ width: 44, height: 38, border: 'none', background: 'none', padding: 0 }}
              />
              <div className="field" style={{ margin: 0 }}>
                <input type="text" value={d.name} aria-label="Name" onChange={(e) => update(i, { name: e.target.value })} />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <select
                  value={d.requires_object ?? ''}
                  aria-label="Requires"
                  onChange={(e) => update(i, { requires_object: (e.target.value || null) as Requires })}
                >
                  <option value="">Listing optional</option>
                  <option value="property">Requires a property</option>
                  <option value="condo">Requires a condo project</option>
                </select>
              </div>
              <label className="checkbox-row" style={{ whiteSpace: 'nowrap' }}>
                <input type="checkbox" checked={d.is_active} onChange={(e) => update(i, { is_active: e.target.checked })} />
                Shown
              </label>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() =>
              setDrafts((list) => [
                ...list,
                { id: null, name: '', color: '#8d7764', requires_object: null, is_active: true, sort_order: list.length + 1 },
              ])
            }
          >
            + Add category
          </button>
          <button type="button" className="btn btn-primary" onClick={saveCategories} disabled={saving}>
            {saving ? 'Saving...' : 'Save categories'}
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: '22px 26px' }}>
        <h2 style={{ fontSize: '1.15rem' }}>Block rhythm</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-secondary)' }}>
          Pick any Monday on which a block starts. All other blocks follow every two weeks from there. Changing it later
          moves every block, so existing block plans would no longer line up.
        </p>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="ss-anchor">A block starts on</label>
            <input id="ss-anchor" type="date" value={anchor} onChange={(e) => setAnchor(e.target.value)} />
          </div>
          <button type="button" className="btn btn-primary" onClick={saveAnchor} disabled={saving}>
            Save rhythm
          </button>
        </div>
        {anchor && (
          <p style={{ fontSize: '0.85rem', marginTop: 12, marginBottom: 0 }}>
            {isMonday(anchor)
              ? `First block: ${formatBlockRange(anchor)}`
              : `${formatWeekdayDayMonth(anchor)} is not a Monday.`}
          </p>
        )}
      </div>
    </div>
  )
}
