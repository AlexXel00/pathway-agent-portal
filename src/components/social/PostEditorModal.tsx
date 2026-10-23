import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type {
  ContentMediaKind,
  ContentMediaSource,
  ContentMediaType,
  ContentPost,
  ContentStatus,
} from '../../lib/types'
import {
  PLATFORMS,
  STATUS_OPTIONS,
  THUMBNAIL_BUCKET,
  formatWeekdayDayMonth,
  shrinkImage,
  thumbnailUrl,
  type PlatformKey,
} from '../../lib/contentCalendar'
import type { SocialLookups } from '../../lib/useSocialData'

interface Props {
  post: ContentPost | null
  defaultDate: string
  lookups: SocialLookups
  canEdit: boolean
  onClose: () => void
  onSaved: () => void
}

interface MediaDraft {
  key: string
  url: string
  kind: ContentMediaKind
  source: ContentMediaSource
  label: string
}

const MEDIA_SOURCES: ContentMediaSource[] = ['Canva', 'CapCut', 'Google Drive', 'Other']

function guessSource(url: string): ContentMediaSource | null {
  const u = url.toLowerCase()
  if (u.includes('canva.')) return 'Canva'
  if (u.includes('capcut.')) return 'CapCut'
  if (u.includes('drive.google.') || u.includes('docs.google.')) return 'Google Drive'
  return null
}

type PlatformFlags = Record<PlatformKey, boolean>

// Mirrors the database rule so the status updates as soon as a box is ticked: once every
// selected platform is ticked as posted the post counts as posted, and un-ticking one
// moves it back to ready.
function syncedStatus(current: ContentStatus, on: PlatformFlags, posted: PlatformFlags): ContentStatus {
  const selected = PLATFORMS.filter((p) => on[p.key])
  if (selected.length === 0) return current
  const allPosted = selected.every((p) => posted[p.key])
  if (allPosted) return 'posted'
  if (current === 'posted') return 'ready'
  return current
}

let draftCounter = 0
function newKey() {
  draftCounter += 1
  return `m${draftCounter}`
}

export default function PostEditorModal({ post, defaultDate, lookups, canEdit, onClose, onSaved }: Props) {
  const isNew = !post
  const [postDate, setPostDate] = useState(post?.post_date ?? defaultDate)
  const [postTime, setPostTime] = useState(post?.post_time?.slice(0, 5) ?? '')
  const [title, setTitle] = useState(post?.title ?? '')
  const [caption, setCaption] = useState(post?.caption ?? '')
  const [categoryId, setCategoryId] = useState(post?.category_id ?? '')
  const [objectValue, setObjectValue] = useState(
    post?.property_id ? `p:${post.property_id}` : post?.condo_project_id ? `c:${post.condo_project_id}` : ''
  )
  const [mediaType, setMediaType] = useState<ContentMediaType>(post?.media_type ?? 'photo')
  const [on, setOn] = useState<PlatformFlags>({
    facebook: post?.on_facebook ?? false,
    instagram: post?.on_instagram ?? true,
    tiktok: post?.on_tiktok ?? false,
  })
  const [posted, setPosted] = useState<PlatformFlags>({
    facebook: post?.posted_facebook ?? false,
    instagram: post?.posted_instagram ?? false,
    tiktok: post?.posted_tiktok ?? false,
  })
  const [status, setStatus] = useState<ContentStatus>(post?.status ?? 'idea')
  const [assignedTo, setAssignedTo] = useState(post?.assigned_to ?? '')
  const [neededPhotos, setNeededPhotos] = useState(post?.needed_photos ?? 0)
  const [neededVideos, setNeededVideos] = useState(post?.needed_videos ?? 0)
  const [shotNotes, setShotNotes] = useState(post?.shot_notes ?? '')
  const [media, setMedia] = useState<MediaDraft[]>(
    (post?.content_media ?? []).map((m) => ({
      key: newKey(),
      url: m.url,
      kind: m.kind,
      source: m.source,
      label: m.label ?? '',
    }))
  )
  const [thumbFile, setThumbFile] = useState<Blob | null>(null)
  const [thumbPreview, setThumbPreview] = useState<string | null>(thumbnailUrl(post?.thumbnail_path ?? null))
  const [removeThumb, setRemoveThumb] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const category = categoryId ? lookups.categoriesById[categoryId] : null
  const requires = category?.requires_object ?? null
  const activeCategories = lookups.categories.filter((c) => c.is_active || c.id === post?.category_id)

  // When the category demands a specific kind of listing, drop a selection of the other kind.
  useEffect(() => {
    if (requires === 'property' && objectValue.startsWith('c:')) setObjectValue('')
    if (requires === 'condo' && objectValue.startsWith('p:')) setObjectValue('')
  }, [requires, objectValue])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Free the temporary preview created for a freshly picked image.
  useEffect(() => {
    return () => {
      if (thumbPreview?.startsWith('blob:')) URL.revokeObjectURL(thumbPreview)
    }
  }, [thumbPreview])

  const activeProperties = useMemo(
    () => lookups.properties.filter((p) => p.listing_status !== 'Sold' || objectValue === `p:${p.id}`),
    [lookups.properties, objectValue]
  )
  const activeCondos = useMemo(
    () => lookups.condos.filter((c) => c.listing_status !== 'Sold' || objectValue === `c:${c.id}`),
    [lookups.condos, objectValue]
  )

  function togglePlatform(key: PlatformKey) {
    const nextOn = { ...on, [key]: !on[key] }
    const nextPosted = nextOn[key] ? posted : { ...posted, [key]: false }
    setOn(nextOn)
    setPosted(nextPosted)
    setStatus((s) => syncedStatus(s, nextOn, nextPosted))
  }

  function togglePosted(key: PlatformKey) {
    const nextPosted = { ...posted, [key]: !posted[key] }
    setPosted(nextPosted)
    setStatus((s) => syncedStatus(s, on, nextPosted))
  }

  function changeStatus(next: ContentStatus) {
    // Picking "Posted" by hand ticks every selected platform, like the database does.
    if (next === 'posted') {
      setPosted({ facebook: on.facebook, instagram: on.instagram, tiktok: on.tiktok })
    }
    setStatus(next)
  }

  function updateMedia(key: string, patch: Partial<MediaDraft>) {
    setMedia((list) => list.map((m) => (m.key === key ? { ...m, ...patch } : m)))
  }

  async function pickThumbnail(file: File | undefined) {
    if (!file) return
    setError(null)
    try {
      const blob = await shrinkImage(file)
      setThumbFile(blob)
      setRemoveThumb(false)
      setThumbPreview(URL.createObjectURL(blob))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that image.')
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!canEdit) return
    setError(null)

    if (!title.trim()) {
      setError('Please give the post a title.')
      return
    }
    if (requires === 'property' && !objectValue.startsWith('p:')) {
      setError('This category needs a property. Please pick the listing being promoted.')
      return
    }
    if (requires === 'condo' && !objectValue.startsWith('c:')) {
      setError('This category needs a condo project. Please pick the one being promoted.')
      return
    }
    const cleanMedia = media.filter((m) => m.url.trim())
    const badLink = cleanMedia.find((m) => !/^https?:\/\//i.test(m.url.trim()))
    if (badLink) {
      setError(`This link does not look right: ${badLink.url}. Links must start with https://`)
      return
    }

    setSaving(true)
    const payload = {
      post_date: postDate,
      post_time: postTime || null,
      title: title.trim(),
      caption: caption.trim() || null,
      category_id: categoryId || null,
      property_id: objectValue.startsWith('p:') ? objectValue.slice(2) : null,
      condo_project_id: objectValue.startsWith('c:') ? objectValue.slice(2) : null,
      media_type: mediaType,
      on_facebook: on.facebook,
      on_instagram: on.instagram,
      on_tiktok: on.tiktok,
      posted_facebook: posted.facebook,
      posted_instagram: posted.instagram,
      posted_tiktok: posted.tiktok,
      status,
      assigned_to: assignedTo || null,
      needed_photos: Math.max(0, Number(neededPhotos) || 0),
      needed_videos: Math.max(0, Number(neededVideos) || 0),
      shot_notes: shotNotes.trim() || null,
    }

    const result = isNew
      ? await supabase.from('content_posts').insert(payload).select().single()
      : await supabase.from('content_posts').update(payload).eq('id', post!.id).select().single()

    if (result.error || !result.data) {
      setSaving(false)
      setError(result.error?.message ?? 'Could not save the post.')
      return
    }
    const postId = result.data.id as string
    const oldThumb = post?.thumbnail_path ?? null

    // Preview image
    if (thumbFile) {
      const path = `${postId}/${Date.now()}.jpg`
      const up = await supabase.storage
        .from(THUMBNAIL_BUCKET)
        .upload(path, thumbFile, { contentType: 'image/jpeg', upsert: false })
      if (up.error) {
        setSaving(false)
        setError(`The post was saved, but the preview image could not be uploaded: ${up.error.message}`)
        return
      }
      await supabase.from('content_posts').update({ thumbnail_path: path }).eq('id', postId)
      if (oldThumb) await supabase.storage.from(THUMBNAIL_BUCKET).remove([oldThumb])
    } else if (removeThumb && oldThumb) {
      await supabase.from('content_posts').update({ thumbnail_path: null }).eq('id', postId)
      await supabase.storage.from(THUMBNAIL_BUCKET).remove([oldThumb])
    }

    // Media links: the list is short, so replace it as a whole.
    const del = await supabase.from('content_media').delete().eq('post_id', postId)
    if (!del.error && cleanMedia.length > 0) {
      const ins = await supabase.from('content_media').insert(
        cleanMedia.map((m, i) => ({
          post_id: postId,
          url: m.url.trim(),
          kind: m.kind,
          source: m.source,
          label: m.label.trim() || null,
          sort_order: i,
        }))
      )
      if (ins.error) {
        setSaving(false)
        setError(`The post was saved, but the media links could not be saved: ${ins.error.message}`)
        return
      }
    }

    setSaving(false)
    onSaved()
  }

  async function remove() {
    if (!post || !canEdit) return
    if (!window.confirm(`Delete "${post.title}"? This cannot be undone.`)) return
    setSaving(true)
    const { error: delError } = await supabase.from('content_posts').delete().eq('id', post.id)
    if (delError) {
      setSaving(false)
      setError(delError.message)
      return
    }
    if (post.thumbnail_path) await supabase.storage.from(THUMBNAIL_BUCKET).remove([post.thumbnail_path])
    setSaving(false)
    onSaved()
  }

  const selectedPlatforms = PLATFORMS.filter((p) => on[p.key])

  return (
    <div className="sc-modal-backdrop" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={save}
        className="card"
        style={{ maxWidth: 760, width: '100%', padding: '24px 28px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', marginBottom: 2 }}>
              {isNew ? 'New post' : canEdit ? 'Edit post' : post?.title}
            </h2>
            <p style={{ color: 'var(--color-secondary)', fontSize: '0.85rem', margin: 0 }}>
              {formatWeekdayDayMonth(postDate)}
            </p>
          </div>
          <button type="button" className="btn btn-ghost" onClick={onClose} aria-label="Close">
            Close
          </button>
        </div>

        <fieldset disabled={!canEdit || saving} style={{ border: 'none', padding: 0, margin: '18px 0 0' }}>
          <div className="form-grid-2">
            <div className="field">
              <label htmlFor="sc-title">Title</label>
              <input
                id="sc-title"
                type="text"
                required
                value={title}
                placeholder="e.g. Drone tour Long Beach"
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="form-grid-2" style={{ gap: 12 }}>
              <div className="field">
                <label htmlFor="sc-date">Date</label>
                <input id="sc-date" type="date" required value={postDate} onChange={(e) => setPostDate(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="sc-time">Time (optional)</label>
                <input
                  id="sc-time"
                  type="time"
                  value={postTime}
                  onChange={(e) => setPostTime(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: '1.5px solid var(--color-beige)',
                    background: 'var(--color-ivory)',
                  }}
                />
              </div>
            </div>
          </div>

          <div className="form-grid-2">
            <div className="field">
              <label htmlFor="sc-category">Category</label>
              <select id="sc-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">No category</option>
                {activeCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="sc-object">
                {requires === 'property'
                  ? 'Property promoted (required)'
                  : requires === 'condo'
                    ? 'Condo project promoted (required)'
                    : 'Listing promoted (optional)'}
              </label>
              <select id="sc-object" value={objectValue} onChange={(e) => setObjectValue(e.target.value)}>
                <option value="">{requires ? 'Please choose...' : 'None'}</option>
                {requires !== 'condo' && (
                  <optgroup label="Properties">
                    {activeProperties.map((p) => (
                      <option key={p.id} value={`p:${p.id}`}>
                        {p.name}
                        {p.municipality ? ` (${p.municipality})` : ''}
                      </option>
                    ))}
                  </optgroup>
                )}
                {requires !== 'property' && (
                  <optgroup label="Condo projects">
                    {activeCondos.map((c) => (
                      <option key={c.id} value={`c:${c.id}`}>
                        {c.name}
                        {c.municipality ? ` (${c.municipality})` : ''}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
          </div>

          <div className="field">
            <label>Platforms</label>
            <div className="sc-toggle-row">
              {PLATFORMS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  className={`sc-toggle${on[p.key] ? ' on' : ''}`}
                  aria-pressed={on[p.key]}
                  onClick={() => togglePlatform(p.key)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-grid-2">
            <div className="field">
              <label>Media type</label>
              <div className="sc-toggle-row">
                {(
                  [
                    ['photo', 'Photo'],
                    ['video', 'Video'],
                    ['both', 'Both'],
                  ] as [ContentMediaType, string][]
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={`sc-toggle${mediaType === value ? ' on' : ''}`}
                    aria-pressed={mediaType === value}
                    onClick={() => setMediaType(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-grid-2" style={{ gap: 12 }}>
              <div className="field">
                <label htmlFor="sc-status">Status</label>
                <select id="sc-status" value={status} onChange={(e) => changeStatus(e.target.value as ContentStatus)}>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="sc-assigned">Responsible</label>
                <select id="sc-assigned" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
                  <option value="">Nobody yet</option>
                  {lookups.editors.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {selectedPlatforms.length > 0 && (
            <div className="field">
              <label>Posted on</label>
              <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
                {selectedPlatforms.map((p) => (
                  <label key={p.key} className="sc-check">
                    <input type="checkbox" checked={posted[p.key]} onChange={() => togglePosted(p.key)} />
                    {p.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="field">
            <label htmlFor="sc-caption">Caption</label>
            <textarea id="sc-caption" rows={4} value={caption} onChange={(e) => setCaption(e.target.value)} />
          </div>

          <h3 style={{ fontSize: '1rem', margin: '8px 0 10px' }}>Media links</h3>
          {media.length === 0 && (
            <p style={{ fontSize: '0.85rem', color: 'var(--color-secondary)' }}>
              No links yet. Add the finished export from Canva, CapCut or Google Drive.
            </p>
          )}
          {media.map((m) => (
            <div key={m.key} className="sc-media-row">
              <div className="field" style={{ margin: 0 }}>
                <input
                  type="url"
                  placeholder="https://..."
                  value={m.url}
                  aria-label="Link"
                  onChange={(e) => {
                    const url = e.target.value
                    const guessed = guessSource(url)
                    updateMedia(m.key, guessed ? { url, source: guessed } : { url })
                  }}
                />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <select
                  value={m.kind}
                  aria-label="Photo or video"
                  onChange={(e) => updateMedia(m.key, { kind: e.target.value as ContentMediaKind })}
                >
                  <option value="photo">Photo</option>
                  <option value="video">Video</option>
                </select>
              </div>
              <div className="field" style={{ margin: 0 }}>
                <select
                  value={m.source}
                  aria-label="Source"
                  onChange={(e) => updateMedia(m.key, { source: e.target.value as ContentMediaSource })}
                >
                  {MEDIA_SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {/^https?:\/\//i.test(m.url) && (
                  <a href={m.url} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ padding: '6px 8px' }}>
                    Open
                  </a>
                )}
                {canEdit && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ padding: '6px 8px' }}
                    onClick={() => setMedia((list) => list.filter((x) => x.key !== m.key))}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
          {canEdit && (
            <button
              type="button"
              className="btn btn-outline"
              style={{ fontSize: '0.82rem', padding: '7px 16px', marginBottom: 18 }}
              onClick={() =>
                setMedia((list) => [
                  ...list,
                  { key: newKey(), url: '', kind: mediaType === 'video' ? 'video' : 'photo', source: 'Other', label: '' },
                ])
              }
            >
              + Add link
            </button>
          )}

          <div className="field">
            <label>Preview image (optional)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              {thumbPreview && !removeThumb ? (
                <img
                  src={thumbPreview}
                  alt=""
                  style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 8, background: 'var(--color-beige)' }}
                />
              ) : (
                <div
                  style={{
                    width: 120,
                    height: 90,
                    borderRadius: 8,
                    background: 'var(--color-beige)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.72rem',
                    color: 'var(--color-secondary)',
                  }}
                >
                  No preview
                </div>
              )}
              {canEdit && (
                <>
                  <label
                    className="btn btn-outline"
                    style={{
                      display: 'inline-flex',
                      fontSize: '0.82rem',
                      padding: '7px 16px',
                      margin: 0,
                      textTransform: 'none',
                      letterSpacing: 0,
                      color: 'var(--color-primary)',
                      cursor: 'pointer',
                    }}
                  >
                    Choose image
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => pickThumbnail(e.target.files?.[0])}
                    />
                  </label>
                  {thumbPreview && !removeThumb && (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => {
                        setThumbFile(null)
                        setRemoveThumb(true)
                      }}
                    >
                      Remove
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          <h3 style={{ fontSize: '1rem', margin: '8px 0 10px' }}>For the production day</h3>
          <div className="form-grid-2">
            <div className="form-grid-2" style={{ gap: 12 }}>
              <div className="field">
                <label htmlFor="sc-photos">Photos needed</label>
                <input
                  id="sc-photos"
                  type="number"
                  min={0}
                  value={neededPhotos}
                  onChange={(e) => setNeededPhotos(Number(e.target.value))}
                />
              </div>
              <div className="field">
                <label htmlFor="sc-videos">Videos needed</label>
                <input
                  id="sc-videos"
                  type="number"
                  min={0}
                  value={neededVideos}
                  onChange={(e) => setNeededVideos(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="sc-shots">Shot notes</label>
              <input
                id="sc-shots"
                type="text"
                placeholder="e.g. drone at sunrise, walk to the beach"
                value={shotNotes}
                onChange={(e) => setShotNotes(e.target.value)}
              />
            </div>
          </div>
        </fieldset>

        {error && <p style={{ color: 'var(--color-danger)', fontSize: '0.85rem' }}>{error}</p>}

        {canEdit && (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
            {!isNew ? (
              <button type="button" className="btn btn-ghost" style={{ color: 'var(--color-danger)' }} onClick={remove} disabled={saving}>
                Delete post
              </button>
            ) : (
              <span />
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn btn-outline" onClick={onClose} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : isNew ? 'Create post' : 'Save changes'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
