import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import type { ContentPost } from '../../lib/types'
import {
  BLOCK_LENGTH_DAYS,
  PLATFORMS,
  addDays,
  blockEnd,
  blockStartFor,
  daysBetween,
  formatBlockRange,
  formatWeekdayDayMonth,
  todayISO,
} from '../../lib/contentCalendar'
import { computeBlockStats, useContentRange } from '../../lib/useSocialData'
import { StatusBar } from './BlockPlanCard'

interface Props {
  anchor: string
  // Bumped by the page whenever posts change, so the banner refreshes with the calendar.
  refreshKey: number
}

function inBlock(posts: ContentPost[], start: string) {
  const end = blockEnd(start)
  return posts.filter((p) => p.post_date >= start && p.post_date <= end)
}

// Always answers one question first: are we prepared for the next two weeks?
export default function ReadinessBanner({ anchor, refreshKey }: Props) {
  const today = todayISO()
  const currentStart = blockStartFor(today, anchor)
  const nextStart = addDays(currentStart, BLOCK_LENGTH_DAYS)
  const { posts, blocks, loading, reload } = useContentRange(currentStart, blockEnd(nextStart), anchor)

  useEffect(() => {
    if (refreshKey > 0) reload()
  }, [refreshKey, reload])

  const nextPosts = inBlock(posts, nextStart)
  const currentPosts = inBlock(posts, currentStart)
  const nextBlock = blocks.find((b) => b.start_date === nextStart) ?? null
  const nextStats = computeBlockStats(nextPosts)
  const currentStats = computeBlockStats(currentPosts)
  const productionDays = [nextBlock?.production_day_1, nextBlock?.production_day_2].filter(Boolean) as string[]
  const daysUntil = daysBetween(today, nextStart)

  const missingGoals = PLATFORMS.map((p) => {
    const goal = nextBlock ? nextBlock[`target_${p.key}`] : 0
    return { ...p, goal, missing: Math.max(0, goal - nextStats.perPlatform[p.key]) }
  }).filter((p) => p.missing > 0)

  const allReady = nextStats.total > 0 && nextStats.readyOrPosted === nextStats.total && missingGoals.length === 0

  return (
    <div
      className="card"
      style={{
        padding: '22px 26px',
        marginBottom: 24,
        borderLeft: `5px solid ${allReady ? 'var(--color-success)' : 'var(--color-accent)'}`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <p className="sc-stat-label" style={{ marginBottom: 4 }}>
            Next block, starts in {daysUntil} day{daysUntil === 1 ? '' : 's'}
          </p>
          <h2 style={{ fontSize: '1.35rem', marginBottom: 6 }}>{formatBlockRange(nextStart)}</h2>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-secondary)' }}>
            {nextBlock?.focus ? `${nextBlock.focus}. ` : ''}
            Production:{' '}
            {productionDays.length > 0 ? productionDays.map(formatWeekdayDayMonth).join(' and ') : 'not scheduled yet'}
          </p>
        </div>
        <Link to={`/social/block/${nextStart}`} className="btn btn-primary">
          Open next block
        </Link>
      </div>

      {loading ? (
        <p style={{ color: 'var(--color-secondary)', marginTop: 16, marginBottom: 0 }}>Loading...</p>
      ) : (
        <div style={{ marginTop: 18, display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', gap: 12, flexWrap: 'wrap' }}>
            <strong>
              {nextStats.total === 0
                ? 'Nothing planned yet'
                : `${nextStats.readyOrPosted} of ${nextStats.total} posts ready`}
            </strong>
            <span style={{ color: allReady ? 'var(--color-success)' : 'var(--color-secondary)' }}>
              {allReady
                ? 'All set for the next two weeks'
                : missingGoals.length > 0
                  ? `Still missing: ${missingGoals.map((g) => `${g.missing} ${g.short}`).join(', ')}`
                  : nextStats.total > 0
                    ? `${nextStats.total - nextStats.readyOrPosted} not ready yet`
                    : 'Set goals and plan the posts'}
            </span>
          </div>
          <StatusBar posts={nextPosts} />
          <p style={{ fontSize: '0.8rem', color: 'var(--color-secondary)', margin: '4px 0 0' }}>
            Running now ({formatBlockRange(currentStart)}): {currentStats.byStatus.posted} of {currentStats.total} posted.{' '}
            <Link to={`/social/block/${currentStart}`}>Open current block</Link>
          </p>
        </div>
      )}
    </div>
  )
}
