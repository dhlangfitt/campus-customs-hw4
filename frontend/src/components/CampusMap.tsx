/**
 * A model of the campus, seen from above at an angle — city blocks, quads,
 * courtyards and towers, drawn as extruded isometric solids.
 *
 * Built procedurally rather than hand-plotted: a small layout table describes
 * the blocks, and the geometry is generated from it, so the map can be made
 * denser or re-proportioned without redrawing hundreds of polygons. Every
 * surface reads a CSS custom property, so the whole model relights when the
 * theme changes.
 */

const K = 23 // world unit → pixels
const ORIGIN = { x: 1170, y: 120 }

/** Standard 2:1 isometric projection. */
function iso(x: number, y: number, z = 0): [number, number] {
  return [ORIGIN.x + (x - y) * 0.866 * K, ORIGIN.y + (x + y) * 0.5 * K - z * K]
}

const pts = (list: [number, number][]) => list.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(' ')

/** A deterministic shuffle so the map is identical on every render. */
function rand(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

interface Building {
  x: number
  y: number
  w: number
  d: number
  h: number
  /** A pitched roof reads as collegiate; flat reads as modern. */
  pitched?: boolean
  tower?: boolean
}

interface Block {
  x: number
  y: number
  w: number
  d: number
  green?: boolean
  buildings: Building[]
  trees?: [number, number][]
}

/** Four blocks across, three down, with streets between them. */
const BLOCKS: Block[] = [
  // --- row 1 -------------------------------------------------------------
  {
    x: 0, y: 0, w: 15, d: 12,
    buildings: [
      { x: 0, y: 0, w: 15, d: 2.4, h: 3.2, pitched: true },
      { x: 0, y: 9.6, w: 15, d: 2.4, h: 3.2, pitched: true },
      { x: 0, y: 2.4, w: 2.4, d: 7.2, h: 3, pitched: true },
      { x: 12.6, y: 2.4, w: 2.4, d: 7.2, h: 3, pitched: true },
      { x: 6, y: 4.6, w: 3, d: 3, h: 9, tower: true },
    ],
    trees: [[4, 6], [11, 6], [7.5, 2.8]],
  },
  {
    x: 19, y: 0, w: 13, d: 12, green: true,
    buildings: [{ x: 0, y: 0, w: 13, d: 2, h: 2.6, pitched: true }],
    trees: [[3, 5], [6, 7.5], [9.5, 5.5], [11, 9], [2, 9.5], [7, 10.5]],
  },
  {
    x: 36, y: 0, w: 14, d: 12,
    buildings: [
      { x: 0, y: 0, w: 6, d: 12, h: 4, pitched: true },
      { x: 8, y: 0, w: 6, d: 5, h: 3.4, pitched: true },
      { x: 8, y: 7, w: 6, d: 5, h: 3.4 },
    ],
    trees: [[7, 6]],
  },
  // --- row 2 -------------------------------------------------------------
  {
    x: 0, y: 16, w: 15, d: 13,
    buildings: [
      { x: 0, y: 0, w: 15, d: 2.6, h: 3.6, pitched: true },
      { x: 0, y: 2.6, w: 2.6, d: 8, h: 3.4, pitched: true },
      { x: 12.4, y: 2.6, w: 2.6, d: 8, h: 3.4, pitched: true },
      { x: 0, y: 10.6, w: 15, d: 2.4, h: 3.4, pitched: true },
    ],
    trees: [[5, 6], [10, 7]],
  },
  {
    x: 19, y: 16, w: 13, d: 13,
    buildings: [
      { x: 0, y: 0, w: 13, d: 3, h: 3.2, pitched: true },
      { x: 4, y: 5, w: 5, d: 5, h: 6.5 },
    ],
    trees: [[1.5, 6], [11, 6], [1.5, 11], [11, 11], [6.5, 12]],
  },
  {
    x: 36, y: 16, w: 14, d: 13, green: true,
    buildings: [{ x: 10, y: 10, w: 4, d: 3, h: 2.6, pitched: true }],
    trees: [[2, 3], [5, 6], [8, 3.5], [3, 9], [7, 11], [11, 5]],
  },
  // --- row 3 -------------------------------------------------------------
  {
    x: 0, y: 33, w: 15, d: 12,
    buildings: [
      { x: 0, y: 0, w: 7, d: 12, h: 3.8, pitched: true },
      { x: 9, y: 0, w: 6, d: 12, h: 3.2, pitched: true },
    ],
  },
  {
    x: 19, y: 33, w: 13, d: 12,
    buildings: [
      { x: 0, y: 0, w: 13, d: 2.4, h: 3, pitched: true },
      { x: 0, y: 9.6, w: 13, d: 2.4, h: 3, pitched: true },
      { x: 5, y: 4, w: 3.5, d: 3.5, h: 7.5, tower: true },
    ],
    trees: [[2, 6], [11, 6]],
  },
  {
    x: 36, y: 33, w: 14, d: 12,
    buildings: [
      { x: 0, y: 0, w: 14, d: 4, h: 3.4, pitched: true },
      { x: 0, y: 6, w: 14, d: 6, h: 2.8 },
    ],
    trees: [[7, 5]],
  },
]

export default function CampusMap() {
  return (
    <svg
      className="campus__svg"
      viewBox="0 0 2400 1340"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Paint texture, kept gentle so the map stays readable. */}
        <filter id="map-oil" x="-4%" y="-4%" width="108%" height="108%">
          <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="2" seed="11" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="3" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <radialGradient id="map-vignette" cx="0.5" cy="0.45" r="0.72">
          <stop offset="0%" stopColor="var(--paint-road)" stopOpacity="0" />
          <stop offset="70%" stopColor="var(--paint-road)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--ink)" stopOpacity="0.92" />
        </radialGradient>
        <radialGradient id="map-lamp" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="var(--glow)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="var(--glow)" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="2400" height="1340" fill="var(--paint-road)" />

      <g filter="url(#map-oil)">
        <Ground />
        {BLOCKS.map((b, i) => (
          <BlockPlot key={i} block={b} seed={i * 97 + 13} />
        ))}
      </g>

      <rect width="2400" height="1340" fill="url(#map-vignette)" />
    </svg>
  )
}

/** The street plane the blocks sit on, with kerb lines between them. */
function Ground() {
  const a = iso(-6, -6)
  const b = iso(56, -6)
  const c = iso(56, 51)
  const d = iso(-6, 51)
  return (
    <>
      <polygon points={pts([a, b, c, d])} fill="var(--paint-road)" />
      {/* lane markings along each street corridor */}
      {[15.5, 32.5].map((x) => (
        <line
          key={`v${x}`}
          x1={iso(x + 1, -6)[0]} y1={iso(x + 1, -6)[1]}
          x2={iso(x + 1, 51)[0]} y2={iso(x + 1, 51)[1]}
          stroke="var(--paint-lit)" strokeWidth="1.1" opacity="0.14" strokeDasharray="10 16"
        />
      ))}
      {[13.5, 30.5].map((y) => (
        <line
          key={`h${y}`}
          x1={iso(-6, y + 1)[0]} y1={iso(-6, y + 1)[1]}
          x2={iso(56, y + 1)[0]} y2={iso(56, y + 1)[1]}
          stroke="var(--paint-lit)" strokeWidth="1.1" opacity="0.14" strokeDasharray="10 16"
        />
      ))}
      {/* street lamps at the crossings */}
      {[[15.5, 13.5], [32.5, 13.5], [15.5, 30.5], [32.5, 30.5]].map(([x, y], i) => {
        const [sx, sy] = iso(x + 1, y + 1, 1.6)
        return <circle key={i} cx={sx} cy={sy} r={42} fill="url(#map-lamp)" />
      })}
    </>
  )
}

function BlockPlot({ block, seed }: { block: Block; seed: number }) {
  const r = rand(seed)
  const { x, y, w, d } = block
  const plate = pts([iso(x, y), iso(x + w, y), iso(x + w, y + d), iso(x, y + d)])

  // Painter's algorithm: things further back are drawn first.
  const ordered = [...block.buildings].sort((a, b) => a.x + a.y - (b.x + b.y))

  return (
    <g>
      <polygon points={plate} fill={block.green ? 'var(--paint-green)' : 'var(--paint-near)'} opacity={block.green ? 0.9 : 0.75} />
      {/* path across a quad */}
      {block.green && (
        <polygon
          points={pts([iso(x + w * 0.1, y + d * 0.5), iso(x + w * 0.9, y + d * 0.42), iso(x + w * 0.9, y + d * 0.5), iso(x + w * 0.1, y + d * 0.58)])}
          fill="var(--paint-road)"
          opacity="0.5"
        />
      )}
      {ordered.map((bl, i) => (
        <Solid key={i} b={{ ...bl, x: x + bl.x, y: y + bl.y }} lit={r() > 0.55} r={r} />
      ))}
      {(block.trees ?? []).map(([tx, ty], i) => (
        <Tree key={i} x={x + tx} y={y + ty} scale={0.8 + r() * 0.5} />
      ))}
    </g>
  )
}

/** One extruded building: two visible walls, a roof, and a few lit windows. */
function Solid({ b, lit, r }: { b: Building; lit: boolean; r: () => number }) {
  const { x, y, w, d, h, pitched, tower } = b
  const top = h

  const roofTop = pts([iso(x, y, top), iso(x + w, y, top), iso(x + w, y + d, top), iso(x, y + d, top)])
  const left = pts([iso(x, y + d, 0), iso(x, y + d, top), iso(x + w, y + d, top), iso(x + w, y + d, 0)])
  const right = pts([iso(x + w, y, 0), iso(x + w, y, top), iso(x + w, y + d, top), iso(x + w, y + d, 0)])

  // Window lights: a scatter along the left face, warm and sparse.
  const windows: JSX.Element[] = []
  const cols = Math.max(1, Math.round(w * 1.1))
  const rows = Math.max(1, Math.round(h * 0.9))
  for (let c = 0; c < cols; c++) {
    for (let rw = 0; rw < rows; rw++) {
      if (r() > (lit ? 0.52 : 0.82)) continue
      const wx = x + ((c + 0.5) / cols) * w
      const wz = ((rw + 0.5) / rows) * top
      const [sx, sy] = iso(wx, y + d, wz)
      windows.push(
        <rect key={`${c}-${rw}`} x={sx - 2.6} y={sy - 3.4} width="5.2" height="6.4" fill="var(--glow)" opacity={0.6} />,
      )
    }
  }

  return (
    <g>
      <polygon points={left} fill="var(--paint-wall)" />
      <polygon points={right} fill="var(--paint-wall)" opacity="0.72" />
      {windows}
      {pitched ? (
        <>
          <polygon
            points={pts([
              iso(x, y + d, top), iso(x + w, y + d, top),
              iso(x + w, y + d / 2, top + Math.min(1.4, d * 0.5)),
              iso(x, y + d / 2, top + Math.min(1.4, d * 0.5)),
            ])}
            fill="var(--paint-roof)"
          />
          <polygon
            points={pts([
              iso(x, y, top), iso(x + w, y, top),
              iso(x + w, y + d / 2, top + Math.min(1.4, d * 0.5)),
              iso(x, y + d / 2, top + Math.min(1.4, d * 0.5)),
            ])}
            fill="var(--paint-roof)"
            opacity="0.7"
          />
        </>
      ) : (
        <polygon points={roofTop} fill="var(--paint-roof)" opacity="0.85" />
      )}
      {tower && (
        <>
          <polygon
            points={pts([iso(x, y, top), iso(x + w, y, top), iso(x + w, y + d, top), iso(x, y + d, top)])}
            fill="var(--paint-roof)"
          />
          {/* a small spire and a lit belfry */}
          <polygon
            points={pts([iso(x, y + d, top), iso(x + w, y + d, top), iso(x + w / 2, y + d / 2, top + 2.6)])}
            fill="var(--brass)"
            opacity="0.45"
          />
          <circle {...(() => { const [cx, cy] = iso(x + w / 2, y + d / 2, top - 0.6); return { cx, cy } })()} r="7" fill="var(--glow)" opacity="0.3" />
        </>
      )}
    </g>
  )
}

function Tree({ x, y, scale }: { x: number; y: number; scale: number }) {
  const [sx, sy] = iso(x, y, 0)
  const r = 9 * scale
  return (
    <g>
      <ellipse cx={sx} cy={sy + 2} rx={r * 1.1} ry={r * 0.45} fill="var(--paint-road)" opacity="0.45" />
      <rect x={sx - 1.2} y={sy - 10 * scale} width="2.4" height={10 * scale} fill="var(--paint-road)" opacity="0.8" />
      <circle cx={sx} cy={sy - 13 * scale} r={r} fill="var(--paint-green)" />
      <circle cx={sx - r * 0.5} cy={sy - 10 * scale} r={r * 0.68} fill="var(--paint-green)" opacity="0.85" />
      <circle cx={sx + r * 0.5} cy={sy - 10.5 * scale} r={r * 0.62} fill="var(--paint-green)" opacity="0.8" />
    </g>
  )
}
