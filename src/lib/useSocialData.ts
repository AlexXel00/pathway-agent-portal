import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useAuth } from '../context/AuthContext'
import type { Agent, ContentBlock, ContentCategory, ContentPost, ContentStatus } from './types'
import { DEFAULT_BLOCK_ANCHOR, PLATFORMS, blockEnd, blockStartFor, type PlatformKey } from './contentCalendar'

// A property or condo project that a post can promote. Both live in different tables but
// look the same in every picker, so they share this small shape.
export interface ListingOption {
  id: string
  name: string
  municipality: string | null
  listing_status: string | null
}

export interface SocialLookups {
  anchor: string
  categories: ContentCategory[]
  categoriesById: Record<string, ContentCategory>
  properties: ListingOption[]
  propertiesById: Record<string, ListingOption>
  condos: ListingOption[]
  condosById: Record<string, ListingOption>
  editors: Agent[]
  agentsById: Record<string, Agent>
}

function byId<T extends { id: string }>(rows: T[]): Record<string, T> {
  return Object.fromEntries(rows.map((r) => [r.id, r]))
}

export function useSocialAccess() {
  const { agent } = useAuth()
  const role = agent?.social_role ?? null
  return {
    canView: role === 'editor' || role === 'viewer',
    canEdit: role === 'editor',
    isHeadAdmin: !!agent?.is_head_admin,
  }
}

// Everything the calendar needs besides the posts themselves: categories, the listings a
// post can promote, the team, and the block rhythm. Loaded once per page.
export function useSocialLookups() {
  const [data, setData] = useState<SocialLookups | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [settings, categories, properties, condos, agents] = await Promise.all([
      supabase.from('content_settings').select('value').eq('key', 'block_anchor_monday').maybeSingle(),
      supabase.from('content_categories').select('*').order('sort_order', { ascending: true }),
      supabase.from('properties_for_agents').select('id, name, municipality, listing_status').order('name'),
      supabase.from('condo_projects').select('id, name, municipality, listing_status').order('name'),
      supabase.from('agents').select('*').order('name'),
    ])
    const firstError = [settings, categories, properties, condos, agents].find((r) => r.error)?.error
    if (firstError) {
      setError(firstError.message)
      return
    }
    const cats = (categories.data ?? []) as ContentCategory[]
    const props = (properties.data ?? []) as ListingOption[]
    const condoRows = (condos.data ?? []) as ListingOption[]
    const agentRows = (agents.data ?? []) as Agent[]
    setError(null)
    setData({
      anchor: settings.data?.value ?? DEFAULT_BLOCK_ANCHOR,
      categories: cats,
      categoriesById: byId(cats),
      properties: props,
      propertiesById: byId(props),
      condos: condoRows,
      condosById: byId(condoRows),
      editors: agentRows.filter((a) => a.social_role === 'editor'),
      agentsById: byId(agentRows),
    })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { lookups: data, error, reload: load }
}

// Posts (with their media links) between two dates, plus every block plan touching them.
export function useContentRange(from: string | null, to: string | null, anchor: string | null) {
  const [posts, setPosts] = useState<ContentPost[]>([])
  const [blocks, setBlocks] = useState<ContentBlock[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!from || !to || !anchor) return
    setLoading(true)
    // Production days sit just before their block, so look one block past the range too.
    const firstBlock = blockStartFor(from, anchor)
    const lastBlock = blockStartFor(blockEnd(to), anchor)
    const [postRes, blockRes] = await Promise.all([
      supabase
        .from('content_posts')
        .select('*, content_media(*)')
        .gte('post_date', from)
        .lte('post_date', to)
        .order('post_date', { ascending: true })
        .order('post_time', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true }),
      supabase.from('content_blocks').select('*').gte('start_date', firstBlock).lte('start_date', lastBlock),
    ])
    setLoading(false)
    if (postRes.error || blockRes.error) {
      setError((postRes.error ?? blockRes.error)?.message ?? 'Could not load the calendar.')
      return
    }
    setError(null)
    setPosts(
      ((postRes.data ?? []) as ContentPost[]).map((p) => ({
        ...p,
        content_media: [...(p.content_media ?? [])].sort((a, b) => a.sort_order - b.sort_order),
      }))
    )
    setBlocks((blockRes.data ?? []) as ContentBlock[])
  }, [from, to, anchor])

  useEffect(() => {
    load()
  }, [load])

  return { posts, blocks, loading, error, reload: load }
}

export interface BlockStats {
  total: number
  readyOrPosted: number
  byStatus: Record<ContentStatus, number>
  perPlatform: Record<PlatformKey, number>
}

export function computeBlockStats(posts: ContentPost[]): BlockStats {
  const byStatus: Record<ContentStatus, number> = { idea: 0, in_progress: 0, ready: 0, posted: 0 }
  const perPlatform: Record<PlatformKey, number> = { facebook: 0, instagram: 0, tiktok: 0 }
  for (const p of posts) {
    byStatus[p.status] += 1
    for (const pl of PLATFORMS) {
      if (p[`on_${pl.key}`]) perPlatform[pl.key] += 1
    }
  }
  return {
    total: posts.length,
    readyOrPosted: byStatus.ready + byStatus.posted,
    byStatus,
    perPlatform,
  }
}

export function listingName(
  post: Pick<ContentPost, 'property_id' | 'condo_project_id'>,
  lookups: SocialLookups
): string | null {
  if (post.property_id) return lookups.propertiesById[post.property_id]?.name ?? 'Unknown property'
  if (post.condo_project_id) return lookups.condosById[post.condo_project_id]?.name ?? 'Unknown condo'
  return null
}

// ---- quick entries typed straight into a day ----

const PLATFORM_WORDS: Record<'facebook' | 'instagram' | 'tiktok', RegExp> = {
  facebook: /\b(fb|facebook)\b/i,
  instagram: /\b(ig|insta|instagram)\b/i,
  tiktok: /\b(tt|tiktok|tik tok)\b/i,
}

function findListing(text: string, options: ListingOption[]): ListingOption | null {
  const lower = text.toLowerCase()
  let best: ListingOption | null = null
  for (const o of options) {
    const name = o.name.trim().toLowerCase()
    if (name.length >= 3 && lower.includes(name) && (!best || name.length > best.name.length)) best = o
  }
  return best
}

// Turns a line like "Post for Hilltop Land insta and fb" into a post: platforms and the
// promoted listing are picked up from the words, everything else can be added later.
export function quickEntryPayload(text: string, date: string, lookups: SocialLookups) {
  const title = text.trim()
  const property = findListing(title, lookups.properties.filter((p) => p.listing_status !== 'Sold'))
  const condo = property ? null : findListing(title, lookups.condos)
  const needs = property ? 'property' : condo ? 'condo' : null
  const category = needs ? lookups.categories.find((c) => c.is_active && c.requires_object === needs) : undefined
  const video = /\b(video|reel|reels)\b/i.test(title)
  const photo = /\b(photo|photos|picture|pic|carousel)\b/i.test(title)
  return {
    post_date: date,
    title,
    on_facebook: PLATFORM_WORDS.facebook.test(title),
    on_instagram: PLATFORM_WORDS.instagram.test(title),
    on_tiktok: PLATFORM_WORDS.tiktok.test(title),
    property_id: category && property ? property.id : null,
    condo_project_id: category && condo ? condo.id : null,
    category_id: category?.id ?? null,
    media_type: video && photo ? 'both' : video ? 'video' : 'photo',
    status: 'idea',
  }
}

// Ticking a post off marks it as posted on every platform it was planned for; un-ticking
// clears those ticks again so the database does not flip it straight back to posted.
export async function setPostDone(post: ContentPost, done: boolean) {
  const patch = done
    ? { status: 'posted' }
    : { status: 'ready', posted_facebook: false, posted_instagram: false, posted_tiktok: false }
  return supabase.from('content_posts').update(patch).eq('id', post.id)
}
