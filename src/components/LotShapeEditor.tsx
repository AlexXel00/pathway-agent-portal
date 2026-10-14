import { useState } from 'react'
import {
  computeGeometry,
  formatBearing,
  parseBearing,
  parseTechnicalDescription,
  type LotShape,
  type LotSide,
} from '../lib/lotShape'
import { formatNumber } from '../lib/format'
import LotShapeDrawing from './LotShapeDrawing'

export interface LotSideRow {
  bearing: string
  dist: string
}

export function rowsFromShape(shape: LotShape | null | undefined): LotSideRow[] {
  if (!shape || !Array.isArray(shape.sides)) return []
  return shape.sides.map((s) => ({ bearing: formatBearing(s), dist: String(s.dist) }))
}

// Turns the form rows into what we store. Returns an error message instead when a filled-in row
// cannot be read, so a typo never silently changes the shape.
export function shapeFromRows(rows: LotSideRow[]): { shape: LotShape | null; error: string | null } {
  const filled = rows.filter((r) => r.bearing.trim() || r.dist.trim())
  if (filled.length === 0) return { shape: null, error: null }
  const sides: LotSide[] = []
  for (let i = 0; i < filled.length; i++) {
    const bearing = parseBearing(filled[i].bearing)
    const dist = Number(filled[i].dist.replace(/,/g, ''))
    if (!bearing || !(dist > 0)) {
      return { shape: null, error: `Lot shape: side ${i + 1} is not complete or the bearing cannot be read.` }
    }
    sides.push({ ...bearing, dist })
  }
  if (sides.length < 3) return { shape: null, error: 'Lot shape: a lot needs at least 3 sides.' }
  return { shape: { sides }, error: null }
}

interface Props {
  rows: LotSideRow[]
  onRowsChange: (rows: LotSideRow[]) => void
  isPublic: boolean
  onPublicChange: (value: boolean) => void
  lotSizeSqm: number | null
}

export default function LotShapeEditor({ rows, onRowsChange, isPublic, onPublicChange, lotSizeSqm }: Props) {
  const [pasted, setPasted] = useState('')
  const [readMessage, setReadMessage] = useState<string | null>(null)

  function readFromText() {
    const sides = parseTechnicalDescription(pasted)
    if (sides.length < 3) {
      setReadMessage(
        'No boundaries found. Please check the text, or type the sides in below (bearing and distance as on the title).',
      )
      return
    }
    onRowsChange(sides.map((s) => ({ bearing: formatBearing(s), dist: String(s.dist) })))
    setReadMessage(`${sides.length} sides read from the text. Please compare them with the title once.`)
  }

  function updateRow(index: number, patch: Partial<LotSideRow>) {
    onRowsChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }

  const { shape } = shapeFromRows(rows)
  const geo = shape ? computeGeometry(shape.sides) : null
  const closureError = geo ? geo.closureErrorM : 0
  const closureWarning = closureError > 0.5
  const areaDiff = geo && lotSizeSqm ? Math.abs(geo.areaSqm - lotSizeSqm) / lotSizeSqm : 0

  return (
    <div className="field" style={{ borderLeft: '2px solid var(--color-beige)', paddingLeft: 14 }}>
      <label>Lot shape (optional)</label>
      <p style={{ fontSize: '0.85rem', color: 'var(--color-secondary)', marginTop: 0 }}>
        Draws the exact shape of the lot with the length of every boundary, without showing the location. Paste the
        technical description from the title (TCT / OCT or survey plan) and click "Read boundaries", or type each side
        in by hand: bearing (e.g. N 45 30 E) and distance in meters.
      </p>

      <textarea
        rows={4}
        placeholder={'e.g. Beginning at a point marked "1" on plan, being N. 45 deg. 31\' E., 1,234.56 m. from BLLM No. 1; thence S. 12 deg. 34\' E., 25.00 m. to point 2; ...'}
        value={pasted}
        onChange={(e) => setPasted(e.target.value)}
      />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '8px 0 14px', flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-outline" onClick={readFromText} disabled={!pasted.trim()}>
          Read boundaries
        </button>
        {readMessage && <span style={{ fontSize: '0.8rem', color: 'var(--color-secondary)' }}>{readMessage}</span>}
      </div>

      {rows.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr 110px 32px', gap: 8, fontSize: '0.72rem', color: 'var(--color-secondary)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            <span>Line</span>
            <span>Bearing</span>
            <span>Distance (m)</span>
            <span />
          </div>
          {rows.map((row, i) => {
            const bearingBad = row.bearing.trim() !== '' && !parseBearing(row.bearing)
            return (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '44px 1fr 110px 32px', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--color-secondary)' }}>
                  {i + 1}-{i + 2 > rows.length ? 1 : i + 2}
                </span>
                <input
                  type="text"
                  placeholder="N 45 30 E"
                  value={row.bearing}
                  onChange={(e) => updateRow(i, { bearing: e.target.value })}
                  style={bearingBad ? { borderColor: 'var(--color-danger)' } : undefined}
                />
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="25.00"
                  value={row.dist}
                  onChange={(e) => updateRow(i, { dist: e.target.value })}
                />
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => onRowsChange(rows.filter((_, j) => j !== i))}
                  style={{ padding: '2px 8px' }}
                  aria-label={`Remove side ${i + 1}`}
                >
                  x
                </button>
              </div>
            )
          })}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button type="button" className="btn btn-ghost" onClick={() => onRowsChange([...rows, { bearing: '', dist: '' }])}>
          Add side
        </button>
        {rows.length > 0 && (
          <button type="button" className="btn btn-ghost" onClick={() => onRowsChange([])}>
            Remove shape
          </button>
        )}
      </div>

      {shape && (
        <>
          <LotShapeDrawing sides={shape.sides} lotSizeSqm={lotSizeSqm} />
          {closureWarning && (
            <p style={{ color: 'var(--color-danger)', fontSize: '0.82rem', marginTop: 8 }}>
              The boundary does not close: the last side ends {formatNumber(Math.round(closureError * 100) / 100)} m away
              from corner 1. Please check the bearings and distances against the title.
            </p>
          )}
          {!closureWarning && areaDiff > 0.03 && (
            <p style={{ color: 'var(--color-danger)', fontSize: '0.82rem', marginTop: 8 }}>
              The area from the shape differs from the lot size by {Math.round(areaDiff * 100)}%. Please check the sides or
              the lot size.
            </p>
          )}
          <label className="checkbox-row" style={{ marginTop: 12 }}>
            <input type="checkbox" checked={isPublic} onChange={(e) => onPublicChange(e.target.checked)} />
            Show lot shape on the public website
          </label>
        </>
      )}
    </div>
  )
}
