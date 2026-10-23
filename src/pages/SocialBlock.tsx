import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import type { ContentPost } from '../lib/types'
import {
  BLOCK_LENGTH_DAYS,
  WEEKDAY_LABELS,
  addDays,
  blockDays,
  blockEnd,
  blockStartFor,
  formatBlockRange,
  formatDayMonth,
  monthKey,
  parseISODate,
  todayISO,
} from '../lib/contentCalendar'
import { supabase } from '../lib/supabase'
import {
  quickEntryPayload,
  setPostDone,
  useContentRange,
  useSocialAccess,
  useSocialLookups,
  type SocialLookups,
} from '../lib/useSocialData'
import { PostCard } from '../components/social/PostChip'
import PostEditorModal from '../components/social/PostEditorModal'
import BlockPlanCard from '../components/social/BlockPlanCard'
import MoveBlockModal from '../components/social/MoveBlockModal'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

// Type a line and press Enter: the post is created right away on that day.
function QuickAdd({ date, lookups, onAdded }: { date: string; lookups: SocialLookups; onAdded: () => void }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (!text.trim() || busy) return
    setBusy(true)
    setError(null)
    const { error: insertError } = await supabase.from('content_posts').insert(quickEntryPayload(text, date, lookups))
    setBusy(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    setText('')
    onAdded()
  }

  return (
    <div className="no-print" style={{ marginTop: 'auto' }}>
      <input
        className="sc-quick"
        type="text"
        value={text}
        disabled={busy}
        placeholder="Write a post, press Enter"
        aria-label="Quick post for this day"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            submit()
          }
          if (e.key === 'Escape') setText('')
        }}
      />
      {error && <p style={{ color: 'var(--color-danger)', fontSize: '0.7rem', margin: '4px 0 0' }}>{error}</p>}
    </div>
  )
}

export default function SocialBlock() {
  const { start: startParam } = useParams()
  const navigate = useNavigate()
  const { lookups, error: lookupError, reload: reloadLookups } = useSocialLookups()
  const { canEdit } = useSocialAccess()
  const [moving, setMoving] = useState(false)
  // null = closed, { post: null } = a new post on `date`
  const [editor, setEditor] = useState<{ post: ContentPost | null; date: string } | null>(null)

  const anchor = lookups?.anchor ?? null
  const valid = !!startParam && ISO_DATE.test(startParam)
  const start = valid && anchor ? blockStartFor(startParam!, anchor) : null
  const { posts, blocks, loading, error, reload } = useContentRange(start, start ? blockEnd(start) : null, anchor)

  const days = useMemo(() => (start ? blockDays(start) : []), [start])
  const postsByDay = useMemo(() => {
    const map: Record<string, ContentPost[]> = {}
    for (const p of posts) (map[p.post_date] ??= []).push(p)
    return map
  }, [posts])

  if (lookupError) return <p style={{ color: 'var(--color-danger)' }}>{lookupError}</p>
  if (!lookups || !anchor) return <p style={{ color: 'var(--color-secondary)' }}>Loading...</p>
  if (!valid) return <Navigate to={`/social/block/${blockStartFor(todayISO(), anchor)}`} replace />
  // Any date inside a block opens that block; keep the address on its Monday.
  if (start !== startParam) return <Navigate to={`/social/block/${start}`} replace />

  const block = blocks.find((b) => b.start_date === start) ?? null
  const productionFor: Record<string, string> = {}
  for (const b of blocks) {
    if (b.production_day_1) productionFor[b.production_day_1] = b.start_date
    if (b.production_day_2) productionFor[b.production_day_2] = b.start_date
  }
  const today = todayISO()

  function afterSave() {
    setEditor(null)
    reload()
  }

  async function toggleDone(post: ContentPost, done: boolean) {
    await setPostDone(post, done)
    reload()
  }

  async function afterMove(newStart: string) {
    setMoving(false)
    // The rhythm changed, so load it again before opening the block at its new place.
    await reloadLookups()
    navigate(`/social/block/${newStart}`)
  }

  return (
    <div>
      <div className="sc-toolbar no-print" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link to={`/social/block/${addDays(start!, -BLOCK_LENGTH_DAYS)}`} className="btn btn-outline">
            Previous block
          </Link>
          <Link to={`/social/block/${addDays(start!, BLOCK_LENGTH_DAYS)}`} className="btn btn-outline">
            Next block
          </Link>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {canEdit && (
            <button type="button" className="btn btn-outline" onClick={() => setMoving(true)}>
              Move block
            </button>
          )}
          <Link to={`/social/block/${start}/shotlist`} className="btn btn-outline">
            Shotlist
          </Link>
          <Link to={`/social?m=${monthKey(start!)}`} className="btn btn-ghost">
            Month view
          </Link>
        </div>
      </div>

      <h1 style={{ marginTop: 8 }}>
        Block {formatBlockRange(start!)} {parseISODate(blockEnd(start!)).getFullYear()}
      </h1>
      <p style={{ color: 'var(--color-secondary)', marginBottom: 20 }}>
        {loading ? 'Loading...' : `${posts.length} post${posts.length === 1 ? '' : 's'} planned`}
      </p>

      {error && <p style={{ color: 'var(--color-danger)' }}>{error}</p>}

      <BlockPlanCard
        blockStart={start!}
        block={block}
        posts={posts}
        lookups={lookups}
        canEdit={canEdit}
        onSaved={reload}
      />

      <div className="sc-grid sc-grid-large">
        {WEEKDAY_LABELS.map((w) => (
          <div key={w} className="sc-weekday">
            {w}
          </div>
        ))}
        {days.map((day, i) => {
          const dayPosts = postsByDay[day] ?? []
          const classes = [
            'sc-day',
            i >= 7 ? 'block-b' : '',
            day === today ? 'today' : '',
            productionFor[day] ? 'production' : '',
          ]
            .filter(Boolean)
            .join(' ')
          return (
            <div key={day} className={classes}>
              <div className="sc-day-head">
                <span>
                  <span className="sc-day-weekday">{WEEKDAY_LABELS[i % 7]} </span>
                  {formatDayMonth(day)}
                </span>
                {productionFor[day] && (
                  <span className="sc-tag sc-tag-production" title={`Production for the block from ${formatDayMonth(productionFor[day])}`}>
                    Production
                  </span>
                )}
              </div>
              {dayPosts.map((p) => (
                <PostCard
                  key={p.id}
                  post={p}
                  lookups={lookups}
                  canEdit={canEdit}
                  onToggleDone={toggleDone}
                  onOpen={(post) => setEditor({ post, date: post.post_date })}
                />
              ))}
              {canEdit && (
                <>
                  <QuickAdd date={day} lookups={lookups} onAdded={reload} />
                  <button
                    type="button"
                    className="btn btn-ghost no-print"
                    style={{ fontSize: '0.72rem', padding: '2px 6px', alignSelf: 'flex-start' }}
                    onClick={() => setEditor({ post: null, date: day })}
                  >
                    + With details
                  </button>
                </>
              )}
            </div>
          )
        })}
      </div>

      {moving && <MoveBlockModal blockStart={start!} onClose={() => setMoving(false)} onMoved={afterMove} />}

      {editor && (
        <PostEditorModal
          post={editor.post}
          defaultDate={editor.date}
          lookups={lookups}
          canEdit={canEdit}
          onClose={() => setEditor(null)}
          onSaved={afterSave}
        />
      )}
    </div>
  )
}
