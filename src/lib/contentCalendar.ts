// Date and block helpers for the social media content calendar.
//
// All calendar dates are plain 'YYYY-MM-DD' strings (the same format Postgres uses for
// `date` columns). They are turned into Date objects at local noon only when needed, so a
// time zone or daylight saving shift can never move a post onto the neighbouring day.

import { supabase } from './supabase'
import type { ContentPost, ContentStatus } from './types'

export const THUMBNAIL_BUCKET = 'content-thumbnails'

// Fallback if the settings row cannot be read. The real value lives in content_settings.
export const DEFAULT_BLOCK_ANCHOR = '2026-10-26'
export const BLOCK_LENGTH_DAYS = 14

export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export type PlatformKey = 'facebook' | 'instagram' | 'tiktok'

export const PLATFORMS: { key: PlatformKey; short: string; label: string }[] = [
  { key: 'facebook', short: 'FB', label: 'Facebook' },
  { key: 'instagram', short: 'IG', label: 'Instagram' },
  { key: 'tiktok', short: 'TT', label: 'TikTok' },
]

export const STATUS_OPTIONS: { value: ContentStatus; label: string; color: string }[] = [
  { value: 'idea', label: 'Idea', color: '#b6a180' },
  { value: 'in_progress', label: 'In progress', color: '#c28a3e' },
  { value: 'ready', label: 'Ready', color: '#4f7a8a' },
  { value: 'posted', label: 'Posted', color: '#4f7a5c' },
]

export function statusMeta(status: ContentStatus) {
  return STATUS_OPTIONS.find((s) => s.value === status) ?? STATUS_OPTIONS[0]
}

export function isOnPlatform(post: ContentPost, key: PlatformKey): boolean {
  return post[`on_${key}`]
}

export function isPostedOn(post: ContentPost, key: PlatformKey): boolean {
  return post[`posted_${key}`]
}

// ---- plain date strings ----

export function parseISODate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, m - 1, d, 12)
}

export function toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function todayISO(): string {
  return toISODate(new Date())
}

export function addDays(value: string, days: number): string {
  const date = parseISODate(value)
  date.setDate(date.getDate() + days)
  return toISODate(date)
}

// Whole days from a to b (positive when b is later).
export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number)
  const [by, bm, bd] = b.split('-').map(Number)
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000)
}

// 0 = Monday ... 6 = Sunday
export function weekdayIndex(value: string): number {
  return (parseISODate(value).getDay() + 6) % 7
}

export function startOfWeek(value: string): string {
  return addDays(value, -weekdayIndex(value))
}

export function isMonday(value: string): boolean {
  return weekdayIndex(value) === 0
}

// ---- blocks ----

// The Monday that starts the two-week block containing `value`.
export function blockStartFor(value: string, anchor: string): string {
  const offset = daysBetween(anchor, value)
  const blocks = Math.floor(offset / BLOCK_LENGTH_DAYS)
  return addDays(anchor, blocks * BLOCK_LENGTH_DAYS)
}

export function blockEnd(start: string): string {
  return addDays(start, BLOCK_LENGTH_DAYS - 1)
}

export function blockDays(start: string): string[] {
  return Array.from({ length: BLOCK_LENGTH_DAYS }, (_, i) => addDays(start, i))
}

// Used to give neighbouring blocks alternating background tints in the month view.
export function blockParity(start: string, anchor: string): number {
  const n = Math.round(daysBetween(anchor, start) / BLOCK_LENGTH_DAYS)
  return ((n % 2) + 2) % 2
}

// ---- month grid ----

// Every day shown in the month view: full Monday-to-Sunday weeks covering the month.
export function monthGridDays(year: number, month0: number): string[] {
  const first = toISODate(new Date(year, month0, 1, 12))
  const last = toISODate(new Date(year, month0 + 1, 0, 12))
  const start = startOfWeek(first)
  const end = addDays(startOfWeek(last), 6)
  const total = daysBetween(start, end) + 1
  return Array.from({ length: total }, (_, i) => addDays(start, i))
}

export function monthKey(value: string): string {
  return value.slice(0, 7)
}

// ---- formatting ----

export function formatDayMonth(value: string): string {
  const d = parseISODate(value)
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`
}

export function formatWeekdayDayMonth(value: string): string {
  return `${WEEKDAY_LABELS[weekdayIndex(value)]} ${formatDayMonth(value)}`
}

export function formatMonthYear(year: number, month0: number): string {
  return `${MONTH_LONG[month0]} ${year}`
}

export function formatBlockRange(start: string): string {
  return `${formatDayMonth(start)} - ${formatDayMonth(blockEnd(start))}`
}

export function formatTime(value: string | null): string {
  return value ? value.slice(0, 5) : ''
}

// ---- storage ----

export function thumbnailUrl(path: string | null): string | null {
  if (!path) return null
  return supabase.storage.from(THUMBNAIL_BUCKET).getPublicUrl(path).data.publicUrl
}

// Shrinks a picked image to at most `maxSize` pixels on its longest side and re-encodes it
// as JPEG, so previews stay well under the bucket's 500 KB limit and the free storage quota.
export async function shrinkImage(file: File, maxSize = 720, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not prepare the image.')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not convert the image.'))),
      'image/jpeg',
      quality
    )
  })
}
