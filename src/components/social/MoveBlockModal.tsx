import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import {
  addDays,
  daysBetween,
  formatBlockRange,
  formatWeekdayDayMonth,
  startOfWeek,
} from '../../lib/contentCalendar'

interface Props {
  blockStart: string
  onClose: () => void
  onMoved: (newStart: string) => void
}

// Moves this block and every later one (posts, plans, production days) to a new Monday,
// e.g. when the launch date changes. The database does it in one step, all or nothing.
export default function MoveBlockModal({ blockStart, onClose, onMoved }: Props) {
  const [target, setTarget] = useState(addDays(blockStart, 7))
  const [counts, setCounts] = useState<{ posts: number; blocks: number } | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const newStart = startOfWeek(target)
  const offset = daysBetween(blockStart, newStart)
  const weeks = Math.abs(offset) / 7

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [posts, blocks] = await Promise.all([
        supabase.from('content_posts').select('id', { count: 'exact', head: true }).gte('post_date', blockStart),
        supabase.from('content_blocks').select('id', { count: 'exact', head: true }).gte('start_date', blockStart),
      ])
      if (!cancelled) setCounts({ posts: posts.count ?? 0, blocks: blocks.count ?? 0 })
    }
    load()
    return () => {
      cancelled = true
    }
  }, [blockStart])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function move() {
    setSaving(true)
    setError(null)
    const { error: moveError } = await supabase.rpc('shift_content_blocks', { p_from: blockStart, p_to: newStart })
    setSaving(false)
    if (moveError) {
      setError(moveError.message)
      return
    }
    onMoved(newStart)
  }

  const quick: [string, number][] = [
    ['1 week earlier', -7],
    ['1 week later', 7],
    ['2 weeks later', 14],
    ['4 weeks later', 28],
  ]

  return (
    <div className="sc-modal-backdrop" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="card" style={{ maxWidth: 560, width: '100%', padding: '24px 28px' }}>
        <h2 style={{ fontSize: '1.3rem' }}>Move block</h2>
        <p style={{ fontSize: '0.88rem', color: 'var(--color-secondary)' }}>
          This block and all later blocks move together, with their posts, plans and production days. The two-week
          rhythm then starts from the new date. Earlier blocks stay where they are.
        </p>

        <div className="sc-toggle-row" style={{ marginBottom: 14 }}>
          {quick.map(([label, days]) => (
            <button
              key={label}
              type="button"
              className={`sc-toggle${offset === days ? ' on' : ''}`}
              onClick={() => setTarget(addDays(blockStart, days))}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="field">
          <label htmlFor="mb-date">New start (any day picks the Monday of that week)</label>
          <input id="mb-date" type="date" value={target} onChange={(e) => e.target.value && setTarget(e.target.value)} />
        </div>

        <div className="sc-stat" style={{ marginBottom: 16 }}>
          <div className="sc-stat-label">Result</div>
          <div style={{ fontSize: '0.9rem', marginTop: 6, lineHeight: 1.6 }}>
            {offset === 0 ? (
              'Pick a different week.'
            ) : (
              <>
                <div>
                  {formatBlockRange(blockStart)} becomes <strong>{formatBlockRange(newStart)}</strong>
                </div>
                <div>
                  Moves {weeks} week{weeks === 1 ? '' : 's'} {offset > 0 ? 'later' : 'earlier'}, starting{' '}
                  {formatWeekdayDayMonth(newStart)}
                </div>
                {counts && (
                  <div style={{ color: 'var(--color-secondary)' }}>
                    {counts.posts} post{counts.posts === 1 ? '' : 's'} and {counts.blocks} block plan
                    {counts.blocks === 1 ? '' : 's'} move along
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {error && <p style={{ color: 'var(--color-danger)', fontSize: '0.85rem' }}>{error}</p>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={move} disabled={saving || offset === 0}>
            {saving ? 'Moving...' : 'Move block'}
          </button>
        </div>
      </div>
    </div>
  )
}
