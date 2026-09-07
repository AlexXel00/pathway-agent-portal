export function formatPhp(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-'
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-'
  return new Intl.NumberFormat('en-PH').format(value)
}

// Agent initials/"kürzel": first two letters of the first name plus the first letter of
// the last name (e.g. "Alexander Riedl" -> "AlR"). Falls back to the first three letters
// of the name for a single-word name.
export function getAgentInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 3)
  const first = parts[0]
  const last = parts[parts.length - 1]
  return `${first.slice(0, 2)}${last.slice(0, 1)}`
}
