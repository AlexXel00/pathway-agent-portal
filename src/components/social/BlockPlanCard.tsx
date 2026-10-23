import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { ContentBlock, ContentPost } from '../../lib/types'
import {
  PLATFORMS,
  STATUS_OPTIONS,
  addDays,
  formatBlockRange,
  formatWeekdayDayMonth,
  type PlatformKey,
} from '../../lib/contentCalendar'
import { computeBlockStats, type SocialLookups } from '../../lib/useSocialData'

interface Props {
  blockStart: string
  block: ContentBlock | null
  posts: ContentPost[]
  lookups: SocialLookups
  canEdit: boolean
  onSaved: () => void
}

export function StatusBar({ posts }: { posts: ContentPost[] }) {
  const stats = computeBlockStats(posts)
  if (stats.total === 0) return <div className="sc-progress" />
  return (
    <div className="sc-progress" title={STATUS_OPTIONS.map((s) => `${s.label}: ${stats.byStatus[s.value]}`).join(', ')}>
      {STATUS_OPTIONS.map((s) =>
        stats.byStatus[s.value] > 0 ? (
          <div key={s.value} style={{ width: `${(stats.byStatus[s.value] / stats.total) * 100}%`, background: s.color }} />
        ) : null
      )}
    </div>
  )
}

function targetOf(block: ContentBlock | null, key: PlatformKey): number {
  if (!block) return 0
  return block[`target_${key}`]
}

export default function BlockPlanCard({ blockStart, block, posts, lookups, canEdit, onSaved }: Props) {
  const [editing, setEditing] = useState(false)
  const [focus, setFocus] = useState('')
  const [notes, setNotes] = useState('')
  const [prod1, setProd1] = useState('')
  const [prod2, setProd2] = useState('')
  const [targets, setTargets] = useState<Record<PlatformKey, number>>({ facebook: 0, instagram: 0, tiktok: 0 })
  const [propertyIds, setPropertyIds] = useState<string[]>([])
  const [condoIds, setCondoIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const stats = computeBlockStats(posts)

  function startEditing() {
    setFocus(block?.focus ?? '')
    setNotes(block?.notes ?? '')
    // Suggest the Thursday and Friday before the block when nothing is set yet.
    setProd1(block?.production_day_1 ?? (block ? '' : addDays(blockStart, -4)))
    setProd2(block?.production_day_2 ?? (block ? '' : addDays(blockStart, -3)))
    setTargets({
      facebook: block?.target_facebook ?? 0,
      instagram: block?.target_instagram ?? 0,
      tiktok: block?.target_tiktok ?? 0,
    })
    setPropertyIds(block?.property_ids ?? [])
    setCondoIds(block?.condo_project_ids ?? [])
    setError(null)
    setEditing(true)
  }

  // Leave edit mode when switching to another block.
  useEffect(() => {
    setEditing(false)
  }, [blockStart])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const payload = {
      start_date: blockStart,
      focus: focus.trim() || null,
      notes: notes.trim() || null,
      production_day_1: prod1 || null,
      production_day_2: prod2 || null,
      target_facebook: Math.max(0, Number(targets.facebook) || 0),
      target_instagram: Math.max(0, Number(targets.instagram) || 0),
      target_tiktok: Math.max(0, Number(targets.tiktok) || 0),
      property_ids: propertyIds,
      condo_project_ids: condoIds,
    }
    const { error: saveError } = await supabase.from('content_blocks').upsert(payload, { onConflict: 'start_date' })
    setSaving(false)
    if (saveError) {
      setError(saveError.message)
      return
    }
    setEditing(false)
    onSaved()
  }

  function toggle(list: string[], id: string, set: (v: string[]) => void) {
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id])
  }

  const featured = [
    ...(block?.property_ids ?? []).map((id) => ({
      id,
      name: lookups.propertiesById[id]?.name ?? 'Unknown property',
      count: posts.filter((p) => p.property_id === id).length,
    })),
    ...(block?.condo_project_ids ?? []).map((id) => ({
      id,
      name: lookups.condosById[id]?.name ?? 'Unknown condo',
      count: posts.filter((p) => p.condo_project_id === id).length,
    })),
  ]
  const productionDays = [block?.production_day_1, block?.production_day_2].filter(Boolean) as string[]

  if (editing) {
    return (
      <form onSubmit={save} className="card" style={{ padding: '22px 26px', marginBottom: 22 }}>
        <h2 style={{ fontSize: '1.2rem' }}>Plan for {formatBlockRange(blockStart)}</h2>
        <div className="field">
          <label htmlFor="bp-focus">Focus of this block</label>
          <input
            id="bp-focus"
            type="text"
            placeholder="e.g. Push Long Beach Resort, introduce the team"
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
          />
        </div>
        <div className="form-grid-2">
          <div className="form-grid-2" style={{ gap: 12 }}>
            <div className="field">
              <label htmlFor="bp-p1">Production day 1</label>
              <input id="bp-p1" type="date" value={prod1} onChange={(e) => setProd1(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="bp-p2">Production day 2</label>
              <input id="bp-p2" type="date" value={prod2} onChange={(e) => setProd2(e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
            {PLATFORMS.map((p) => (
              <div className="field" key={p.key}>
                <label htmlFor={`bp-t-${p.key}`}>Goal {p.short}</label>
                <input
                  id={`bp-t-${p.key}`}
                  type="number"
                  min={0}
                  value={targets[p.key]}
                  onChange={(e) => setTargets((t) => ({ ...t, [p.key]: Number(e.target.value) }))}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Listings to promote in this block</label>
          <div
            style={{
              maxHeight: 200,
              overflowY: 'auto',
              border: '1.5px solid var(--color-beige)',
              borderRadius: 10,
              padding: '10px 12px',
              background: 'var(--color-ivory)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(240px, 100%), 1fr))',
              gap: 6,
            }}
          >
            {lookups.properties
              .filter((p) => p.listing_status !== 'Sold' || propertyIds.includes(p.id))
              .map((p) => (
                <label key={p.id} className="sc-check">
                  <input type="checkbox" checked={propertyIds.includes(p.id)} onChange={() => toggle(propertyIds, p.id, setPropertyIds)} />
                  {p.name}
                </label>
              ))}
            {lookups.condos.map((c) => (
              <label key={c.id} className="sc-check">
                <input type="checkbox" checked={condoIds.includes(c.id)} onChange={() => toggle(condoIds, c.id, setCondoIds)} />
                {c.name} (Condo)
              </label>
            ))}
          </div>
        </div>

        <div className="field">
          <label htmlFor="bp-notes">Notes (ideas, who films what, shooting dates)</label>
          <textarea id="bp-notes" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {error && <p style={{ color: 'var(--color-danger)', fontSize: '0.85rem' }}>{error}</p>}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-outline" onClick={() => setEditing(false)} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save plan'}
          </button>
        </div>
      </form>
    )
  }

  return (
    <div className="card" style={{ padding: '22px 26px', marginBottom: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <p className="sc-stat-label" style={{ marginBottom: 4 }}>
            Plan for these two weeks
          </p>
          <h2 style={{ fontSize: '1.2rem', marginBottom: 0 }}>
            {block?.focus || <span style={{ color: 'var(--color-secondary)', fontWeight: 500 }}>No focus set yet</span>}
          </h2>
        </div>
        {canEdit && (
          <button type="button" className="btn btn-outline no-print" onClick={startEditing}>
            {block ? 'Edit plan' : 'Plan this block'}
          </button>
        )}
      </div>

      <div className="sc-stat-grid" style={{ marginTop: 18 }}>
        <div className="sc-stat">
          <div className="sc-stat-label">Ready</div>
          <div className="sc-stat-value">
            {stats.readyOrPosted} / {stats.total}
          </div>
          <div style={{ marginTop: 8 }}>
            <StatusBar posts={posts} />
          </div>
        </div>
        {PLATFORMS.map((p) => {
          const goal = targetOf(block, p.key)
          const have = stats.perPlatform[p.key]
          const short = goal > 0 && have < goal
          return (
            <div className="sc-stat" key={p.key}>
              <div className="sc-stat-label">{p.label}</div>
              <div className="sc-stat-value" style={{ color: short ? '#8a5c1e' : undefined }}>
                {have}
                {goal > 0 ? ` / ${goal}` : ''}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-secondary)' }}>
                {goal > 0 ? (short ? `${goal - have} still missing` : 'Goal reached') : 'No goal set'}
              </div>
            </div>
          )
        })}
        <div className="sc-stat">
          <div className="sc-stat-label">Production</div>
          <div style={{ fontSize: '0.88rem', marginTop: 6, lineHeight: 1.5 }}>
            {productionDays.length > 0 ? productionDays.map((d) => <div key={d}>{formatWeekdayDayMonth(d)}</div>) : 'Not scheduled'}
          </div>
        </div>
      </div>

      {featured.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <p className="sc-stat-label" style={{ marginBottom: 8 }}>
            Listings to promote
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {featured.map((f) => (
              <span key={f.id} className={`badge ${f.count > 0 ? 'badge-active' : 'badge-neutral'}`}>
                {f.name}: {f.count === 0 ? 'no post yet' : `${f.count} post${f.count === 1 ? '' : 's'}`}
              </span>
            ))}
          </div>
        </div>
      )}

      {block?.notes && (
        <p style={{ marginTop: 18, marginBottom: 0, whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>{block.notes}</p>
      )}
    </div>
  )
}
