import type { ContentPost } from '../../lib/types'
import { PLATFORMS, formatTime, statusMeta, thumbnailUrl } from '../../lib/contentCalendar'
import { listingName, type SocialLookups } from '../../lib/useSocialData'

interface Props {
  post: ContentPost
  lookups: SocialLookups
  onOpen: (post: ContentPost) => void
}

function categoryColor(post: ContentPost, lookups: SocialLookups): string {
  return (post.category_id && lookups.categoriesById[post.category_id]?.color) || 'var(--color-accent)'
}

export function PlatformBadges({ post }: { post: ContentPost }) {
  const selected = PLATFORMS.filter((p) => post[`on_${p.key}`])
  if (selected.length === 0) return null
  return (
    <span className="sc-plats">
      {selected.map((p) => {
        const posted = post[`posted_${p.key}`]
        return (
          <span
            key={p.key}
            className={`sc-plat${posted ? ' posted' : ''}`}
            title={`${p.label}${posted ? ' - posted' : ''}`}
          >
            {p.short}
          </span>
        )
      })}
    </span>
  )
}

// Compact one-line entry for the month view.
export function PostChip({ post, lookups, onOpen }: Props) {
  const status = statusMeta(post.status)
  return (
    <button
      type="button"
      className="sc-chip"
      style={{ ['--sc-cat' as string]: categoryColor(post, lookups) }}
      title={`${post.title} (${status.label})`}
      onClick={(e) => {
        e.stopPropagation()
        onOpen(post)
      }}
    >
      <span className="sc-dot" style={{ background: status.color }} />
      <span className="sc-chip-title">{post.title}</span>
      <PlatformBadges post={post} />
    </button>
  )
}

// Larger card for the two-week working view, with preview image and details.
export function PostCard({ post, lookups, onOpen }: Props) {
  const status = statusMeta(post.status)
  const thumb = thumbnailUrl(post.thumbnail_path)
  const category = post.category_id ? lookups.categoriesById[post.category_id] : null
  const listing = listingName(post, lookups)
  const assigned = post.assigned_to ? lookups.agentsById[post.assigned_to] : null
  const mediaCount = post.content_media?.length ?? 0

  return (
    <button
      type="button"
      className="sc-card"
      style={{ ['--sc-cat' as string]: categoryColor(post, lookups) }}
      onClick={() => onOpen(post)}
    >
      {thumb && <img className="sc-card-thumb" src={thumb} alt="" loading="lazy" />}
      <span className="sc-card-title">
        {post.post_time && <span style={{ color: 'var(--color-secondary)' }}>{formatTime(post.post_time)} </span>}
        {post.title}
      </span>
      {(category || listing) && (
        <span style={{ fontSize: '0.68rem', color: 'var(--color-secondary)', lineHeight: 1.35 }}>
          {category?.name}
          {category && listing ? ' / ' : ''}
          {listing}
        </span>
      )}
      <span className="sc-card-meta">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span className="sc-dot" style={{ background: status.color }} />
          {status.label}
        </span>
        <PlatformBadges post={post} />
      </span>
      <span className="sc-card-meta">
        <span>
          {post.media_type === 'both' ? 'Photo + Video' : post.media_type === 'video' ? 'Video' : 'Photo'}
          {mediaCount > 0 ? ` / ${mediaCount} link${mediaCount === 1 ? '' : 's'}` : ' / no links yet'}
        </span>
        {assigned && <span>{assigned.name.split(' ')[0]}</span>}
      </span>
    </button>
  )
}
