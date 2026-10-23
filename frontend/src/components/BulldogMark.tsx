/**
 * Handsome Dan, after a long century in the society's basement.
 *
 * Original artwork — deliberately not a reproduction of Yale's trademarked
 * mascot. Brass monocle, riveted collar plate, a cog behind one ear. The brief
 * was sympathetic but not safe: the jaw is set and the good eye is steady, so
 * he reads as a creature who has seen something, rather than a cartoon.
 *
 * Colours come from the theme, so he changes with the lighting.
 */
export default function BulldogMark({
  size = 28,
  className = '',
  title = 'handsome dan',
}: {
  size?: number
  className?: string
  title?: string
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label={title}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>

      {/* cog behind the left ear */}
      <g opacity="0.75">
        <circle cx="13" cy="15" r="7" fill="none" stroke="var(--brass)" strokeWidth="2" />
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i * Math.PI) / 4
          return (
            <rect
              key={i}
              x={12.1}
              y={5.6}
              width="1.8"
              height="3.4"
              fill="var(--brass)"
              transform={`rotate(${(a * 180) / Math.PI} 13 15)`}
            />
          )
        })}
        <circle cx="13" cy="15" r="2" fill="var(--brass)" />
      </g>

      {/* ears */}
      <path d="M13 17c-3.6.6-5 4.4-3.8 9 .9 3.5 3.4 5.4 5.2 4.6L17 20l-4-3z" fill="currentColor" opacity="0.9" />
      <path d="M51 17c3.6.6 5 4.4 3.8 9-.9 3.5-3.4 5.4-5.2 4.6L47 20l4-3z" fill="currentColor" opacity="0.9" />

      {/* head */}
      <path
        d="M32 10c-10.2 0-17.8 5.2-18.8 14.2-.6 5 .5 9 2.2 12.1C18.2 41.6 23.6 46 32 46s13.8-4.4 16.6-9.7c1.7-3.1 2.8-7.1 2.2-12.1C49.8 15.2 42.2 10 32 10z"
        fill="currentColor"
      />

      {/* heavy brow — the menace lives here */}
      <path d="M16 21.4c4-3.6 9.2-4.2 13.4-2.4l-1.4 5C24.4 21.8 20 22.4 16 24.8z" fill="var(--ink)" opacity="0.72" />
      <path d="M48 21.4c-4-3.6-9.2-4.2-13.4-2.4l1.4 5c3.6-2.2 8-1.6 12 .8z" fill="var(--ink)" opacity="0.72" />
      <path d="M30.4 17.6L32 22l1.6-4.4z" fill="var(--ink)" opacity="0.4" />

      {/* muzzle */}
      <ellipse cx="32" cy="35" rx="12.5" ry="9.2" fill="var(--ink)" opacity="0.9" />
      <path d="M32 28.4c-3.1 0-5.2 1.7-5.2 3.5 0 1.8 2.3 3.1 5.2 3.1s5.2-1.3 5.2-3.1c0-1.8-2.1-3.5-5.2-3.5z" fill="currentColor" />
      <path
        d="M32 35v4.4m0 0c-2.5 0-4.6-1.1-5.6-2.8M32 39.4c2.5 0 4.6-1.1 5.6-2.8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* set jaw, underbite — two teeth showing */}
      <path d="M24.4 38.6c2.2 3.4 4.6 5 7.6 5s5.4-1.6 7.6-5c-2 4.8-4.6 7.2-7.6 7.2s-5.6-2.4-7.6-7.2z" fill="var(--ink)" opacity="0.5" />
      <path d="M27.2 39.4l1.7 3.6 1.7-3.6z" fill="var(--text)" opacity="0.95" />
      <path d="M33.4 39.4l1.7 3.6 1.7-3.6z" fill="var(--text)" opacity="0.95" />

      {/* eyes — left plain, right behind the monocle */}
      <circle cx="24" cy="24.8" r="3" fill="var(--ink)" />
      <circle cx="24.9" cy="23.9" r="0.95" fill="var(--text)" opacity="0.95" />
      <circle cx="40" cy="24.5" r="2.8" fill="var(--ink)" />
      <circle cx="40.8" cy="23.6" r="0.8" fill="var(--glow)" opacity="0.9" />

      {/* brass monocle */}
      <g>
        <circle cx="40" cy="24.5" r="8" fill="var(--glow)" opacity="0.1" />
        <circle cx="40" cy="24.5" r="8" fill="none" stroke="var(--brass)" strokeWidth="2.2" />
        <circle cx="40" cy="24.5" r="10" fill="none" stroke="var(--brass)" strokeWidth="0.8" opacity="0.55" />
        <path d="M46.6 29.4c3.4 4.2 3.6 8.6 1 12.4" stroke="var(--brass)" strokeWidth="1.4" fill="none" opacity="0.8" />
        {/* glint across the glass */}
        <path d="M35.4 20.2a8 8 0 0 1 6.2-2.8" stroke="var(--text)" strokeWidth="1.6" opacity="0.75" fill="none" strokeLinecap="round" />
        <path d="M34.8 23a8 8 0 0 1 2.2-3.2" stroke="var(--text)" strokeWidth="1" opacity="0.4" fill="none" strokeLinecap="round" />
      </g>

      {/* riveted collar plate */}
      <path d="M17 44c4.4 3.3 9.6 4.9 15 4.9S42.6 47.3 47 44l2.6 6.2C44.4 54 38.4 55.8 32 55.8S19.6 54 14.4 50.2z" fill="var(--brass)" opacity="0.85" />
      {[21, 27, 37, 43].map((cx, i) => (
        <circle key={cx} cx={cx} cy={48.5 + (i === 1 || i === 2 ? 1.6 : 0)} r="1.3" fill="var(--ink)" opacity="0.6" />
      ))}
      <circle cx="32" cy="53" r="3.2" fill="var(--ink)" opacity="0.75" />
      <circle cx="32" cy="53" r="1.5" fill="var(--accent)" />
    </svg>
  )
}
