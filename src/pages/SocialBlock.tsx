import { useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
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
import { useContentRange, useSocialAccess, useSocialLookups } from '../lib/useSocialData'
import { PostCard } from '../components/social/PostChip'
import PostEditorModal from '../components/social/PostEditorModal'
import BlockPlanCard from '../components/social/BlockPlanCard'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export default function SocialBlock() {
  const { start: startParam } = useParams()
  const { lookups, error: lookupError } = useSocialLookups()
  const { canEdit } = useSocialAccess()
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
                <PostCard key={p.id} post={p} lookups={lookups} onOpen={(post) => setEditor({ post, date: post.post_date })} />
              ))}
              {canEdit && (
                <button type="button" className="sc-add no-print" onClick={() => setEditor({ post: null, date: day })}>
                  + Add post
                </button>
              )}
            </div>
          )
        })}
      </div>

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
