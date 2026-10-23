import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import type { ContentPost } from '../lib/types'
import {
  WEEKDAY_LABELS,
  blockParity,
  blockStartFor,
  formatDayMonth,
  formatMonthYear,
  monthGridDays,
  monthKey,
  parseISODate,
  todayISO,
} from '../lib/contentCalendar'
import { useContentRange, useSocialAccess, useSocialLookups } from '../lib/useSocialData'
import { PostChip } from '../components/social/PostChip'
import PostEditorModal from '../components/social/PostEditorModal'
import ReadinessBanner from '../components/social/ReadinessBanner'

const MAX_CHIPS = 4

export default function SocialCalendar() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { lookups, error: lookupError } = useSocialLookups()
  const { canEdit, isHeadAdmin } = useSocialAccess()
  const [openPost, setOpenPost] = useState<ContentPost | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const today = todayISO()
  const requested = params.get('m')
  const month = requested && /^\d{4}-\d{2}$/.test(requested) ? requested : monthKey(today)
  const [year, monthNumber] = month.split('-').map(Number)
  const month0 = monthNumber - 1

  const days = useMemo(() => monthGridDays(year, month0), [year, month0])
  const anchor = lookups?.anchor ?? null
  const { posts, blocks, loading, error, reload } = useContentRange(days[0], days[days.length - 1], anchor)

  const postsByDay = useMemo(() => {
    const map: Record<string, ContentPost[]> = {}
    for (const p of posts) (map[p.post_date] ??= []).push(p)
    return map
  }, [posts])

  // Production days belong to the block they prepare, which usually starts a few days later.
  const productionFor = useMemo(() => {
    const map: Record<string, string> = {}
    for (const b of blocks) {
      if (b.production_day_1) map[b.production_day_1] = b.start_date
      if (b.production_day_2) map[b.production_day_2] = b.start_date
    }
    return map
  }, [blocks])

  function shiftMonth(delta: number) {
    const d = new Date(year, month0 + delta, 1, 12)
    setParams({ m: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` })
  }

  function afterSave() {
    setOpenPost(null)
    reload()
    setRefreshKey((k) => k + 1)
  }

  if (lookupError) return <p style={{ color: 'var(--color-danger)' }}>{lookupError}</p>
  if (!lookups || !anchor) return <p style={{ color: 'var(--color-secondary)' }}>Loading...</p>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div>
          <h1>Social Media Calendar</h1>
          <p style={{ color: 'var(--color-secondary)', marginBottom: 24 }}>
            Planned in two-week blocks. Click a day to open its block and plan the posts.
          </p>
        </div>
        {isHeadAdmin && (
          <Link to="/social/settings" className="btn btn-ghost">
            Categories and settings
          </Link>
        )}
      </div>

      <ReadinessBanner anchor={anchor} refreshKey={refreshKey} />

      <div className="sc-toolbar">
        <button type="button" className="btn btn-outline" onClick={() => shiftMonth(-1)} aria-label="Previous month">
          Prev
        </button>
        <h2 style={{ fontSize: '1.4rem', margin: '0 6px', minWidth: 190, textAlign: 'center' }}>
          {formatMonthYear(year, month0)}
        </h2>
        <button type="button" className="btn btn-outline" onClick={() => shiftMonth(1)} aria-label="Next month">
          Next
        </button>
        {month !== monthKey(today) && (
          <button type="button" className="btn btn-ghost" onClick={() => setParams({})}>
            Today
          </button>
        )}
        {loading && <span style={{ fontSize: '0.82rem', color: 'var(--color-secondary)' }}>Loading...</span>}
      </div>

      {error && <p style={{ color: 'var(--color-danger)' }}>{error}</p>}

      <div className="sc-grid sc-grid-month">
        {WEEKDAY_LABELS.map((w) => (
          <div key={w} className="sc-weekday">
            {w}
          </div>
        ))}
        {days.map((day) => {
          const start = blockStartFor(day, anchor)
          const dayPosts = postsByDay[day] ?? []
          const inMonth = parseISODate(day).getMonth() === month0
          const classes = [
            'sc-day',
            blockParity(start, anchor) === 1 ? 'block-b' : '',
            inMonth ? '' : 'outside',
            day === today ? 'today' : '',
            productionFor[day] ? 'production' : '',
          ]
            .filter(Boolean)
            .join(' ')
          const dayNumber = parseISODate(day).getDate()
          return (
            <div
              key={day}
              className={classes}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/social/block/${start}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') navigate(`/social/block/${start}`)
              }}
              title={`Open the block ${formatDayMonth(start)}`}
            >
              <div className="sc-day-head">
                <span>{dayNumber === 1 ? formatDayMonth(day) : dayNumber}</span>
                {day === start && <span className="sc-tag sc-tag-block">Block</span>}
              </div>
              {productionFor[day] && (
                <span className="sc-tag sc-tag-production" title={`Production for the block from ${formatDayMonth(productionFor[day])}`}>
                  Production
                </span>
              )}
              {dayPosts.slice(0, MAX_CHIPS).map((p) => (
                <PostChip key={p.id} post={p} lookups={lookups} onOpen={setOpenPost} />
              ))}
              {dayPosts.length > MAX_CHIPS && <span className="sc-more">+{dayPosts.length - MAX_CHIPS} more</span>}
            </div>
          )
        })}
      </div>

      <div className="sc-legend">
        {lookups.categories
          .filter((c) => c.is_active)
          .map((c) => (
            <span key={c.id}>
              <span className="sc-dot" style={{ background: c.color, borderRadius: 3, width: 12, height: 12 }} />
              {c.name}
            </span>
          ))}
      </div>

      {openPost && (
        <PostEditorModal
          post={openPost}
          defaultDate={openPost.post_date}
          lookups={lookups}
          canEdit={canEdit}
          onClose={() => setOpenPost(null)}
          onSaved={afterSave}
        />
      )}
    </div>
  )
}
