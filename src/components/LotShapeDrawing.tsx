import { layoutDrawing, polygonArea, type NormalizedLotShape } from '../lib/lotShape'
import { formatNumber } from '../lib/format'

interface Props {
  shape: NormalizedLotShape
  // Lot size as entered on the listing, shown next to the area computed from the shape.
  lotSizeSqm?: number | null
  showStats?: boolean
}

// Draws the lot shape with the length of every boundary. No map, no real location.
export default function LotShapeDrawing({ shape, lotSizeSqm, showStats = true }: Props) {
  const drawing = layoutDrawing(shape)
  const area = polygonArea(shape.points)
  const perimeter = shape.lengths.reduce((s, l) => s + l, 0)

  return (
    <div>
      <div style={{ background: 'var(--color-ivory)', border: '1px solid var(--color-beige)', borderRadius: 12, padding: 8 }}>
        <svg
          viewBox={`0 0 ${drawing.width.toFixed(1)} ${drawing.height.toFixed(1)}`}
          style={{ width: '100%', maxHeight: 420, display: 'block' }}
          role="img"
          aria-label="Lot shape with boundary lengths"
        >
          <polygon
            points={drawing.points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
            fill="rgba(182,161,128,0.16)"
            stroke="#7e6454"
            strokeWidth={1.4}
            strokeLinejoin="round"
          />
          {drawing.points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={2.6} fill="#7e6454" />
          ))}
          {drawing.sideLabels.map((l, i) => (
            <text
              key={`s${i}`}
              x={l.x}
              y={l.y}
              transform={`rotate(${l.angle.toFixed(1)} ${l.x.toFixed(1)} ${l.y.toFixed(1)})`}
              textAnchor="middle"
              dominantBaseline="middle"
              style={{ fontFamily: 'var(--font-body)', fontSize: 13, fill: '#2a2a2a' }}
            >
              {l.text}
            </text>
          ))}
          {drawing.cornerLabels.map((c, i) => (
            <text
              key={`c${i}`}
              x={c.x}
              y={c.y}
              textAnchor="middle"
              dominantBaseline="middle"
              style={{ fontFamily: 'var(--font-body)', fontSize: 11, fill: '#b6a180' }}
            >
              {c.text}
            </text>
          ))}
          {drawing.north && (
            <g transform={`translate(${drawing.north.x} ${drawing.north.y})`}>
              <path d="M0 0 L5 16 L0 12 L-5 16 Z" fill="#7e6454" />
              <text x={0} y={28} textAnchor="middle" style={{ fontFamily: 'var(--font-body)', fontSize: 9, fill: '#7e6454' }}>
                N
              </text>
            </g>
          )}
        </svg>
      </div>
      {showStats && (
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--color-secondary)', marginTop: 8 }}>
          <span>Area from shape: approx. {formatNumber(Math.round(area))} sqm</span>
          {lotSizeSqm ? <span>Lot size on listing: {formatNumber(lotSizeSqm)} sqm</span> : null}
          <span>Perimeter: {formatNumber(Math.round(perimeter * 10) / 10)} m</span>
        </div>
      )}
    </div>
  )
}
