import { useEffect, useRef, useState, type ChangeEvent, type PointerEvent as ReactPointerEvent } from 'react'
import {
  computeGeometry,
  formatMeters,
  labelPositions,
  normalizeShape,
  parseTechnicalDescription,
  polygonArea,
  type DrawnLotShape,
} from '../lib/lotShape'
import { formatNumber } from '../lib/format'

// Drawing area in screen units. Points are kept in these units while drawing and converted to
// meters (using the lengths that were typed in) when the listing is saved.
const W = 800
const H = 500
const PAD = 70

type Pt = { x: number; y: number }

export interface LotShapeResult {
  shape: DrawnLotShape | null
  error: string | null
}

// "12.5", "1,234.50" and the German style "12,5" all work.
function parseLength(input: string): number {
  const t = input.trim().replace(/\s|m$/gi, '')
  if (!t) return NaN
  const normalized = /^\d+,\d{1,2}$/.test(t) ? t.replace(',', '.') : t.replace(/,/g, '')
  const n = Number(normalized)
  return n > 0 ? n : NaN
}

// Places points given in meters (y = north) into the drawing area, centred and as large as fits.
function fitToCanvas(points: Pt[]): Pt[] {
  const raw = points.map((p) => ({ x: p.x, y: -p.y }))
  const minX = Math.min(...raw.map((p) => p.x))
  const maxX = Math.max(...raw.map((p) => p.x))
  const minY = Math.min(...raw.map((p) => p.y))
  const maxY = Math.max(...raw.map((p) => p.y))
  const w = Math.max(maxX - minX, 1e-6)
  const h = Math.max(maxY - minY, 1e-6)
  const scale = Math.min((W - PAD * 2) / w, (H - PAD * 2) / h)
  const offX = (W - w * scale) / 2
  const offY = (H - h * scale) / 2
  return raw.map((p) => ({ x: offX + (p.x - minX) * scale, y: offY + (p.y - minY) * scale }))
}

function sideLength(pts: Pt[], i: number) {
  const a = pts[i]
  const b = pts[(i + 1) % pts.length]
  return Math.hypot(b.x - a.x, b.y - a.y)
}

interface Props {
  // Whatever is stored in properties.lot_shape (any format) - only read once when the form opens.
  initial: unknown
  onChange: (result: LotShapeResult) => void
  isPublic: boolean
  onPublicChange: (value: boolean) => void
  lotSizeSqm: number | null
}

export default function LotShapeEditor({ initial, onChange, isPublic, onPublicChange, lotSizeSqm }: Props) {
  const start = normalizeShape(initial)
  const [pts, setPts] = useState<Pt[]>(() => (start ? fitToCanvas(start.points) : []))
  const [closed, setClosed] = useState(Boolean(start))
  const [lengthInputs, setLengthInputs] = useState<string[]>(() =>
    start ? start.lengths.map((l) => String(Math.round(l * 100) / 100)) : [],
  )
  const [north, setNorth] = useState(start?.north ?? false)
  const [background, setBackground] = useState<string | null>(null)
  const [rectW, setRectW] = useState('')
  const [rectD, setRectD] = useState('')
  const [showPaste, setShowPaste] = useState(false)
  const [pasted, setPasted] = useState('')
  const [pasteMessage, setPasteMessage] = useState<string | null>(null)

  const svgRef = useRef<SVGSVGElement>(null)
  const dragIndex = useRef<number | null>(null)
  const justDragged = useRef(false)

  // Lengths: typed values win; empty sides are calculated from the drawing, using the
  // average scale of the sides that were typed in.
  const typed = closed ? pts.map((_, i) => parseLength(lengthInputs[i] ?? '')) : []
  const ratios = typed
    .map((t, i) => (t > 0 ? t / (sideLength(pts, i) || 1) : NaN))
    .filter((r) => Number.isFinite(r))
  const ratio = ratios.length > 0 ? ratios.reduce((s, r) => s + r, 0) / ratios.length : null
  const finalLengths = closed ? pts.map((_, i) => (typed[i] > 0 ? typed[i] : ratio ? sideLength(pts, i) * ratio : NaN)) : []
  const notToScale = ratios.length > 1 && Math.max(...ratios) / Math.min(...ratios) > 1.05
  const areaSqm = closed && ratio ? polygonArea(pts) * ratio * ratio : null

  useEffect(() => {
    let result: LotShapeResult
    if (pts.length === 0) result = { shape: null, error: null }
    else if (!closed) result = { shape: null, error: 'Lot shape: please finish the drawing (click corner 1 again) or click "Start over".' }
    else if (!ratio) result = { shape: null, error: 'Lot shape: please enter the length of at least one side.' }
    else {
      const p0 = pts[0]
      result = {
        shape: {
          points: pts.map((p) => [
            Math.round((p.x - p0.x) * ratio * 100) / 100,
            Math.round(-(p.y - p0.y) * ratio * 100) / 100,
          ]),
          lengths: finalLengths.map((l) => Math.round(l * 100) / 100),
          north,
        },
        error: null,
      }
    }
    onChange(result)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pts, closed, lengthInputs, north])

  function toSvgPoint(e: { clientX: number; clientY: number }): Pt | null {
    const svg = svgRef.current
    const ctm = svg?.getScreenCTM()
    if (!svg || !ctm) return null
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse())
    return { x: Math.min(W, Math.max(0, p.x)), y: Math.min(H, Math.max(0, p.y)) }
  }

  function handleCanvasClick(e: React.MouseEvent) {
    if (closed || justDragged.current) {
      justDragged.current = false
      return
    }
    const p = toSvgPoint(e)
    if (p) setPts((prev) => [...prev, p])
  }

  function handleCornerDown(e: ReactPointerEvent, index: number) {
    e.stopPropagation()
    if (!closed && index === 0 && pts.length >= 3) {
      setClosed(true)
      setLengthInputs(pts.map(() => ''))
      return
    }
    dragIndex.current = index
    justDragged.current = false
    svgRef.current?.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: ReactPointerEvent) {
    if (dragIndex.current === null) return
    const p = toSvgPoint(e)
    if (!p) return
    const index = dragIndex.current
    justDragged.current = true
    setPts((prev) => prev.map((q, i) => (i === index ? p : q)))
  }

  function handlePointerUp() {
    dragIndex.current = null
    // The click that follows the end of a drag must not add a new corner.
    setTimeout(() => {
      justDragged.current = false
    }, 0)
  }

  function removeCorner(index: number) {
    if (!closed || pts.length <= 3) return
    setPts((prev) => prev.filter((_, i) => i !== index))
    // The two sides at this corner become one: its length is unknown, so it is cleared.
    setLengthInputs((prev) => {
      const next = prev.filter((_, i) => i !== index)
      const merged = (index - 1 + next.length) % next.length
      next[merged] = ''
      return next
    })
  }

  function startOver() {
    setPts([])
    setClosed(false)
    setLengthInputs([])
    setNorth(false)
  }

  function createRectangle() {
    const w = parseLength(rectW)
    const d = parseLength(rectD)
    if (!(w > 0) || !(d > 0)) return
    setPts(fitToCanvas([{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: -d }, { x: 0, y: -d }]))
    setClosed(true)
    setLengthInputs([String(w), String(d), String(w), String(d)])
    setNorth(false)
  }

  function readTechnicalDescription() {
    const sides = parseTechnicalDescription(pasted)
    const geo = computeGeometry(sides)
    if (!geo) {
      setPasteMessage('No boundaries found in this text. Please draw the shape instead.')
      return
    }
    setPts(fitToCanvas(geo.points))
    setClosed(true)
    setLengthInputs(sides.map((s) => String(s.dist)))
    setNorth(true)
    setPasteMessage(`${sides.length} sides read. The shape is drawn above, please compare it with the title once.`)
  }

  function handleBackground(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    // The plan is only shown here while drawing. It is not uploaded or saved anywhere.
    if (background) URL.revokeObjectURL(background)
    setBackground(URL.createObjectURL(file))
    e.target.value = ''
  }

  const labels = closed && pts.length >= 3 ? labelPositions(pts, 16) : null
  const help = pts.length === 0
    ? 'Click in the box to set the first corner, then click the other corners one after another around the lot.'
    : !closed
      ? pts.length >= 3
        ? 'Click corner 1 again to close the shape.'
        : 'Keep clicking the corners of the lot.'
      : 'Done. Drag a corner to move it, double-click a corner to delete it.'

  return (
    <div className="field" style={{ borderLeft: '2px solid var(--color-beige)', paddingLeft: 14 }}>
      <label>Lot shape (optional)</label>
      <p style={{ fontSize: '0.85rem', color: 'var(--color-secondary)', marginTop: 0 }}>
        Shows the shape of the lot with the length of every boundary on the listing, without the location. Draw it
        below and type in the lengths you know. Tip: load a photo of the lot plan as background and click along its
        corners, then the shape is exact.
      </p>

      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 12 }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 600, paddingBottom: 9 }}>Rectangular lot?</span>
        <input type="text" inputMode="decimal" placeholder="Width (m)" value={rectW} onChange={(e) => setRectW(e.target.value)} style={{ width: 110 }} />
        <input type="text" inputMode="decimal" placeholder="Depth (m)" value={rectD} onChange={(e) => setRectD(e.target.value)} style={{ width: 110 }} />
        <button type="button" className="btn btn-outline" onClick={createRectangle} disabled={!(parseLength(rectW) > 0 && parseLength(rectD) > 0)}>
          Create
        </button>
      </div>

      <p style={{ fontSize: '0.85rem', margin: '0 0 6px', color: 'var(--color-charcoal)' }}>{help}</p>
      <div style={{ border: '1px solid var(--color-beige)', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: '100%', display: 'block', touchAction: 'none', cursor: closed ? 'default' : 'crosshair', userSelect: 'none' }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <defs>
            <pattern id="lot-grid" width="25" height="25" patternUnits="userSpaceOnUse">
              <path d="M 25 0 L 0 0 0 25" fill="none" stroke="#efe9df" strokeWidth="1" />
            </pattern>
          </defs>
          <rect x={0} y={0} width={W} height={H} fill="url(#lot-grid)" />
          {background && (
            <image href={background} x={0} y={0} width={W} height={H} preserveAspectRatio="xMidYMid meet" opacity={0.75} style={{ pointerEvents: 'none' }} />
          )}
          <rect x={0} y={0} width={W} height={H} fill="transparent" onClick={handleCanvasClick} />

          {pts.length >= 2 &&
            (closed ? (
              <polygon
                points={pts.map((p) => `${p.x},${p.y}`).join(' ')}
                fill="rgba(182,161,128,0.22)"
                stroke="#7e6454"
                strokeWidth={2}
                strokeLinejoin="round"
                style={{ pointerEvents: 'none' }}
              />
            ) : (
              <polyline
                points={pts.map((p) => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke="#7e6454"
                strokeWidth={2}
                strokeDasharray="6 4"
                style={{ pointerEvents: 'none' }}
              />
            ))}

          {labels &&
            labels.sides.map((l, i) => (
              <text
                key={`l${i}`}
                x={l.x}
                y={l.y}
                transform={`rotate(${l.angle.toFixed(1)} ${l.x.toFixed(1)} ${l.y.toFixed(1)})`}
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ fontFamily: 'var(--font-body)', fontSize: 15, fill: typed[i] > 0 ? '#2a2a2a' : '#8d7764', pointerEvents: 'none' }}
              >
                {finalLengths[i] > 0 ? formatMeters(finalLengths[i]) : '? m'}
              </text>
            ))}

          {pts.map((p, i) => (
            <g key={i}>
              <circle
                cx={p.x}
                cy={p.y}
                r={!closed && i === 0 && pts.length >= 3 ? 11 : 8}
                fill={!closed && i === 0 && pts.length >= 3 ? '#b6a180' : '#7e6454'}
                stroke="#fff"
                strokeWidth={2}
                style={{ cursor: closed ? 'grab' : i === 0 && pts.length >= 3 ? 'pointer' : 'grab' }}
                onPointerDown={(e) => handleCornerDown(e, i)}
                onDoubleClick={() => removeCorner(i)}
              />
              <text
                x={labels ? labels.corners[i].x : p.x + 14}
                y={labels ? labels.corners[i].y : p.y - 14}
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, fill: '#b6a180', pointerEvents: 'none' }}
              >
                {i + 1}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '8px 0 14px', alignItems: 'center' }}>
        {!closed && pts.length > 0 && (
          <button type="button" className="btn btn-ghost" onClick={() => setPts((prev) => prev.slice(0, -1))}>
            Undo last corner
          </button>
        )}
        {pts.length > 0 && (
          <button type="button" className="btn btn-ghost" onClick={startOver}>
            Start over
          </button>
        )}
        <label className="btn btn-ghost" style={{ cursor: 'pointer', margin: 0, textTransform: 'none', letterSpacing: 0, fontSize: 'inherit' }}>
          {background ? 'Change lot plan background' : 'Load lot plan as background'}
          <input type="file" accept="image/*" onChange={handleBackground} style={{ display: 'none' }} />
        </label>
        {background && (
          <button type="button" className="btn btn-ghost" onClick={() => setBackground(null)}>
            Remove background
          </button>
        )}
      </div>

      {closed && (
        <>
          <p style={{ fontSize: '0.85rem', margin: '0 0 8px' }}>
            Type in the lengths you know. Empty sides are calculated from the drawing (shown in grey).
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, marginBottom: 12 }}>
            {pts.map((_, i) => (
              <div key={i}>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--color-secondary)', marginBottom: 4 }}>
                  Side {i + 1}-{i + 2 > pts.length ? 1 : i + 2} (m)
                </div>
                <input
                  type="text"
                  inputMode="decimal"
                  value={lengthInputs[i] ?? ''}
                  placeholder={finalLengths[i] > 0 ? `${finalLengths[i].toFixed(2)} (calc.)` : 'm'}
                  onChange={(e) => {
                    const value = e.target.value
                    setLengthInputs((prev) => pts.map((__, j) => (j === i ? value : prev[j] ?? '')))
                  }}
                />
              </div>
            ))}
          </div>

          {areaSqm !== null && (
            <p style={{ fontSize: '0.8rem', color: 'var(--color-secondary)', margin: '0 0 6px' }}>
              Area from the drawing: approx. {formatNumber(Math.round(areaSqm))} sqm
              {lotSizeSqm ? ` (lot size on listing: ${formatNumber(lotSizeSqm)} sqm)` : ''}
            </p>
          )}
          {notToScale && (
            <p style={{ fontSize: '0.8rem', color: 'var(--color-secondary)', margin: '0 0 6px' }}>
              Note: the drawing is not exactly to scale with the lengths you typed. The website shows your lengths on
              the drawn shape. For an exact shape, trace it over the lot plan.
            </p>
          )}

          <label className="checkbox-row" style={{ marginTop: 6 }}>
            <input type="checkbox" checked={north} onChange={(e) => setNorth(e.target.checked)} />
            The top of the drawing is north (shows a north arrow)
          </label>
          <label className="checkbox-row" style={{ marginTop: 6 }}>
            <input type="checkbox" checked={isPublic} onChange={(e) => onPublicChange(e.target.checked)} />
            Show lot shape on the public website
          </label>
        </>
      )}

      <div style={{ marginTop: 14 }}>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => setShowPaste((v) => !v)}
          style={{ padding: '2px 0', textDecoration: 'underline' }}
        >
          {showPaste ? 'Hide' : 'Optional: fill in from the technical description of the title'}
        </button>
        {showPaste && (
          <div style={{ marginTop: 8 }}>
            <textarea
              rows={4}
              placeholder={'Paste the text from the title, e.g. "... thence S. 12 deg. 34\' E., 25.00 m. to point 2; ..."'}
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
            />
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-outline" onClick={readTechnicalDescription} disabled={!pasted.trim()}>
                Draw from text
              </button>
              {pasteMessage && <span style={{ fontSize: '0.8rem', color: 'var(--color-secondary)' }}>{pasteMessage}</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
