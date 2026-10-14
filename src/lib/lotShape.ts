// Lot shape from the technical description of a land title.
// Each side of the lot is stored as a survey bearing (e.g. N 45 deg 30' E) plus a distance in meters,
// exactly as written on the title. From this we can draw the exact shape with the length of every
// boundary, without needing the real location.

export interface LotSide {
  ns: 'N' | 'S'
  deg: number
  min: number
  sec: number
  ew: 'E' | 'W'
  dist: number
}

export interface LotShape {
  sides: LotSide[]
}

export interface LotGeometry {
  // Corner points in meters, x = east, y = north. One point per side, starting at corner 1.
  points: { x: number; y: number }[]
  areaSqm: number
  perimeterM: number
  // Distance between where the last side ends and corner 1. Close to 0 for a correct description.
  closureErrorM: number
}

// Turns a bearing typed by hand into its parts. Accepts e.g. "N 45 30 E", "N. 45 deg. 30' E.",
// "N45-30E", "S 12°05'30\" W", "Due North".
export function parseBearing(input: string): Omit<LotSide, 'dist'> | null {
  let s = input.toUpperCase().trim()
  if (!s) return null
  const due = s.match(/^DUE\s+(NORTH|SOUTH|EAST|WEST|N|S|E|W)\.?$/)
  if (due) {
    const d = due[1][0]
    if (d === 'N') return { ns: 'N', deg: 0, min: 0, sec: 0, ew: 'E' }
    if (d === 'S') return { ns: 'S', deg: 0, min: 0, sec: 0, ew: 'E' }
    if (d === 'E') return { ns: 'N', deg: 90, min: 0, sec: 0, ew: 'E' }
    return { ns: 'N', deg: 90, min: 0, sec: 0, ew: 'W' }
  }
  s = s
    .replace(/([NSEW])\./g, '$1 ')
    .replace(/DEG\.?|DEGREES?|MIN\.?|MINUTES?|SEC\.?|SECONDS?/g, ' ')
    .replace(/[°'’′"″\-,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const m = s.match(/^([NS])\s*(\d+(?:\.\d+)?)(?:\s+(\d+(?:\.\d+)?))?(?:\s+(\d+(?:\.\d+)?))?\s*([EW])$/)
  if (!m) return null
  const deg = Number(m[2])
  const min = m[3] ? Number(m[3]) : 0
  const sec = m[4] ? Number(m[4]) : 0
  if (deg > 90 || min >= 60 || sec >= 60) return null
  return { ns: m[1] as 'N' | 'S', deg, min, sec, ew: m[5] as 'E' | 'W' }
}

export function formatBearing(side: Omit<LotSide, 'dist'>): string {
  const sec = side.sec ? ` ${side.sec}"` : ''
  return `${side.ns} ${side.deg}° ${String(side.min).padStart(2, '0')}'${sec} ${side.ew}`
}

// Reads all boundary lines out of a pasted technical description, e.g.
// "Beginning at a point marked "1" on plan, being N. 45 deg. 31' E., 1,234.56 m. from BLLM No. 1;
//  thence S. 12 deg. 34' E., 25.00 m. to point 2; thence ..."
// The first line ("... from BLLM ...") is only the tie line to the survey monument, not a side of the
// lot, so every line followed by "from" is skipped.
export function parseTechnicalDescription(text: string): LotSide[] {
  const re =
    /(DUE\s+(?:NORTH|SOUTH|EAST|WEST|N|S|E|W)\.?|[NS]\.?\s*\d+(?:\.\d+)?\s*(?:DEG(?:REES?)?\.?|°|-|\s)\s*(?:\d+(?:\.\d+)?\s*(?:MIN(?:UTES?)?\.?|'|’|′|-)?\s*)?(?:\d+(?:\.\d+)?\s*(?:SEC(?:ONDS?)?\.?|"|″)\s*)?[EW]\.?)\s*,?\s*(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)\s*(?:METERS?|MTS?\.?|M\.?)(?![A-Z])/gi
  const sides: LotSide[] = []
  let match: RegExpExecArray | null
  while ((match = re.exec(text)) !== null) {
    const after = text.slice(re.lastIndex, re.lastIndex + 40)
    const untilBreak = after.split(/;|THENCE/i)[0]
    if (/\bFROM\b/i.test(untilBreak)) continue
    const bearing = parseBearing(match[1])
    const dist = Number(match[2].replace(/,/g, ''))
    if (bearing && dist > 0) sides.push({ ...bearing, dist })
  }
  return sides
}

function azimuthRad(side: Omit<LotSide, 'dist'>): number {
  const a = side.deg + side.min / 60 + side.sec / 3600
  let az: number
  if (side.ns === 'N' && side.ew === 'E') az = a
  else if (side.ns === 'S' && side.ew === 'E') az = 180 - a
  else if (side.ns === 'S' && side.ew === 'W') az = 180 + a
  else az = 360 - a
  return (az * Math.PI) / 180
}

export function computeGeometry(sides: LotSide[]): LotGeometry | null {
  if (sides.length < 3) return null
  const points: { x: number; y: number }[] = []
  let x = 0
  let y = 0
  let perimeter = 0
  for (const side of sides) {
    points.push({ x, y })
    const az = azimuthRad(side)
    x += side.dist * Math.sin(az)
    y += side.dist * Math.cos(az)
    perimeter += side.dist
  }
  let twiceArea = 0
  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    const q = points[(i + 1) % points.length]
    twiceArea += p.x * q.y - q.x * p.y
  }
  return {
    points,
    areaSqm: Math.abs(twiceArea) / 2,
    perimeterM: perimeter,
    closureErrorM: Math.hypot(x, y),
  }
}

export function isLotShape(value: unknown): value is LotShape {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as LotShape).sides) &&
    (value as LotShape).sides.length >= 3
  )
}

export interface LotDrawing {
  width: number
  height: number
  polygon: string
  sideLabels: { x: number; y: number; angle: number; text: string }[]
  cornerLabels: { x: number; y: number; text: string }[]
  north: { x: number; y: number }
}

export function formatMeters(value: number): string {
  return `${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m`
}

// Fits the lot into a drawing area and works out where each length and corner number goes:
// lengths sit just outside their side, turned along it and always readable from below.
export function layoutDrawing(sides: LotSide[], maxW = 360, maxH = 260, pad = 50): LotDrawing | null {
  const geo = computeGeometry(sides)
  if (!geo) return null
  const raw = geo.points.map((p) => ({ x: p.x, y: -p.y }))
  const minX = Math.min(...raw.map((p) => p.x))
  const maxX = Math.max(...raw.map((p) => p.x))
  const minY = Math.min(...raw.map((p) => p.y))
  const maxY = Math.max(...raw.map((p) => p.y))
  const w = Math.max(maxX - minX, 1e-6)
  const h = Math.max(maxY - minY, 1e-6)
  const scale = Math.min(maxW / w, maxH / h)
  const pts = raw.map((p) => ({ x: pad + (p.x - minX) * scale, y: pad + (p.y - minY) * scale }))

  let twice = 0
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % pts.length]
    twice += a.x * b.y - b.x * a.y
  }
  const orient = twice >= 0 ? 1 : -1
  const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length
  const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length

  const sideLabels = pts.map((a, i) => {
    const b = pts[(i + 1) % pts.length]
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len = Math.hypot(dx, dy) || 1
    const nx = (orient * dy) / len
    const ny = (orient * -dx) / len
    let angle = (Math.atan2(dy, dx) * 180) / Math.PI
    if (angle > 89) angle -= 180
    if (angle < -90) angle += 180
    return {
      x: (a.x + b.x) / 2 + nx * 14,
      y: (a.y + b.y) / 2 + ny * 14,
      angle,
      text: formatMeters(sides[i].dist),
    }
  })

  const cornerLabels = pts.map((p, i) => {
    const vx = p.x - cx
    const vy = p.y - cy
    const vl = Math.hypot(vx, vy) || 1
    return { x: p.x + (vx / vl) * 15, y: p.y + (vy / vl) * 15, text: String(i + 1) }
  })

  const width = w * scale + pad * 2
  const height = h * scale + pad * 2
  return {
    width,
    height,
    polygon: pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '),
    sideLabels,
    cornerLabels,
    north: { x: width - 22, y: 14 },
  }
}
