import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import type { ContentPost } from '../lib/types'
import { blockEnd, blockStartFor, formatBlockRange, formatWeekdayDayMonth, statusMeta } from '../lib/contentCalendar'
import { useContentRange, useSocialLookups } from '../lib/useSocialData'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

interface Group {
  key: string
  name: string
  place: string | null
  posts: ContentPost[]
  photos: number
  videos: number
}

// Ticked shots are a personal checklist for the production day, kept in this browser only.
function loadDone(start: string): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(`sc-shotlist-${start}`) ?? '{}')
  } catch {
    return {}
  }
}

function saveDone(start: string, done: Record<string, boolean>) {
  try {
    localStorage.setItem(`sc-shotlist-${start}`, JSON.stringify(done))
  } catch {
    // storage unavailable (private window) - the list still works, it just will not be remembered
  }
}

export default function SocialShotlist() {
  const { start: startParam } = useParams()
  const { lookups, error: lookupError } = useSocialLookups()
  const anchor = lookups?.anchor ?? null
  const valid = !!startParam && ISO_DATE.test(startParam)
  const start = valid && anchor ? blockStartFor(startParam!, anchor) : null
  const { posts, loading, error } = useContentRange(start, start ? blockEnd(start) : null, anchor)
  const [done, setDone] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (start) setDone(loadDone(start))
  }, [start])

  const groups = useMemo<Group[]>(() => {
    if (!lookups) return []
    const map = new Map<string, Group>()
    // Posts that are already out need no more shooting.
    for (const p of posts.filter((x) => x.status !== 'posted')) {
      let key = 'none'
      let name = 'Without a listing'
      let place: string | null = 'Office, team, Palawan and general shots'
      if (p.property_id) {
        const prop = lookups.propertiesById[p.property_id]
        key = `p:${p.property_id}`
        name = prop?.name ?? 'Unknown property'
        place = prop?.municipality ?? null
      } else if (p.condo_project_id) {
        const condo = lookups.condosById[p.condo_project_id]
        key = `c:${p.condo_project_id}`
        name = condo?.name ?? 'Unknown condo'
        place = condo?.municipality ?? null
      }
      const g = map.get(key) ?? { key, name, place, posts: [], photos: 0, videos: 0 }
      g.posts.push(p)
      g.photos += p.needed_photos
      g.videos += p.needed_videos
      map.set(key, g)
    }
    // Listings first (sorted by place so one trip covers neighbouring spots), general shots last.
    return [...map.values()].sort((a, b) => {
      if (a.key === 'none') return 1
      if (b.key === 'none') return -1
      return (a.place ?? '').localeCompare(b.place ?? '') || a.name.localeCompare(b.name)
    })
  }, [posts, lookups])

  if (lookupError) return <p style={{ color: 'var(--color-danger)' }}>{lookupError}</p>
  if (!lookups || !anchor) return <p style={{ color: 'var(--color-secondary)' }}>Loading...</p>
  if (!valid) return <Navigate to="/social" replace />
  if (start !== startParam) return <Navigate to={`/social/block/${start}/shotlist`} replace />

  function toggle(id: string) {
    const next = { ...done, [id]: !done[id] }
    setDone(next)
    saveDone(start!, next)
  }

  const totalPhotos = groups.reduce((s, g) => s + g.photos, 0)
  const totalVideos = groups.reduce((s, g) => s + g.videos, 0)

  return (
    <div>
      <div className="sc-toolbar no-print" style={{ justifyContent: 'space-between' }}>
        <Link to={`/social/block/${start}`} className="btn btn-outline">
          Back to block
        </Link>
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>
          Print
        </button>
      </div>

      <h1 style={{ marginTop: 8 }}>Shotlist {formatBlockRange(start!)}</h1>
      <p style={{ color: 'var(--color-secondary)', marginBottom: 22 }}>
        {loading
          ? 'Loading...'
          : `${totalPhotos} photo${totalPhotos === 1 ? '' : 's'} and ${totalVideos} video${totalVideos === 1 ? '' : 's'} to shoot at ${groups.length} location${groups.length === 1 ? '' : 's'}. Posts already posted are left out.`}
      </p>

      {error && <p style={{ color: 'var(--color-danger)' }}>{error}</p>}
      {!loading && groups.length === 0 && (
        <p style={{ color: 'var(--color-secondary)' }}>Nothing to shoot yet. Plan the posts in the block first.</p>
      )}

      <div style={{ display: 'grid', gap: 16 }}>
        {groups.map((g) => (
          <div key={g.key} className="card" style={{ padding: '18px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'baseline' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', marginBottom: 2 }}>{g.name}</h2>
                {g.place && <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-secondary)' }}>{g.place}</p>}
              </div>
              <strong style={{ fontSize: '0.9rem' }}>
                {g.photos} photo{g.photos === 1 ? '' : 's'}, {g.videos} video{g.videos === 1 ? '' : 's'}
              </strong>
            </div>
            <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
              {g.posts.map((p) => {
                const assigned = p.assigned_to ? lookups.agentsById[p.assigned_to] : null
                const isDone = !!done[p.id]
                return (
                  <label
                    key={p.id}
                    style={{
                      display: 'flex',
                      gap: 12,
                      alignItems: 'flex-start',
                      padding: '10px 12px',
                      borderRadius: 10,
                      background: 'var(--color-ivory)',
                      cursor: 'pointer',
                      opacity: isDone ? 0.55 : 1,
                    }}
                  >
                    <input type="checkbox" checked={isDone} onChange={() => toggle(p.id)} style={{ marginTop: 3 }} />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontWeight: 600, textDecoration: isDone ? 'line-through' : 'none' }}>
                        {p.title}
                      </span>
                      <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-secondary)' }}>
                        For {formatWeekdayDayMonth(p.post_date)}
                        {' / '}
                        {p.needed_photos} photo{p.needed_photos === 1 ? '' : 's'}, {p.needed_videos} video
                        {p.needed_videos === 1 ? '' : 's'}
                        {' / '}
                        {statusMeta(p.status).label}
                        {assigned ? ` / ${assigned.name}` : ''}
                      </span>
                      {p.shot_notes && <span style={{ display: 'block', fontSize: '0.85rem', marginTop: 4 }}>{p.shot_notes}</span>}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
