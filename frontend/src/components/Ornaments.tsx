import { useTheme } from '../theme'

/**
 * Decorative furniture for the pages — a rule, a seal and a corner filigree.
 *
 * Each draws from the theme's brass and glow, so the same ornament reads as
 * candle-lit oak, cold cyanotype brass, or gaslit iron without being redrawn.
 */

/** A divider: filigree, a small cog, filigree. */
export function OrnamentRule({ className = '' }: { className?: string }) {
  return (
    <svg className={`orn-rule ${className}`} viewBox="0 0 300 20" role="presentation" aria-hidden="true">
      <path d="M8 10h96M196 10h96" stroke="var(--brass)" strokeWidth="1" opacity="0.5" />
      <path d="M104 10c8-7 14-7 22 0-8 7-14 7-22 0z" fill="var(--brass)" opacity="0.55" />
      <path d="M174 10c8-7 14-7 22 0-8 7-14 7-22 0z" fill="var(--brass)" opacity="0.55" />
      <g>
        <circle cx="150" cy="10" r="6" fill="none" stroke="var(--brass)" strokeWidth="1.2" />
        {Array.from({ length: 8 }).map((_, i) => (
          <rect key={i} x="149.2" y="1.6" width="1.6" height="2.6" fill="var(--brass)" transform={`rotate(${i * 45} 150 10)`} />
        ))}
        <circle cx="150" cy="10" r="1.6" fill="var(--accent)" />
      </g>
    </svg>
  )
}

/** A wax seal, stamped with the society's initials. */
export function WaxSeal({ size = 64, className = '' }: { size?: number; className?: string }) {
  const { theme } = useTheme()
  return (
    <svg className={`orn-seal ${className}`} width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={`${theme.name} seal`}>
      <title>{theme.name}</title>
      <path
        d="M32 3c5 4 11 3 15 7s3 10 7 15-3 11-7 15-3 11-7 15-10 2-15 6-11-2-15-6-10-1-14-6 3-10-1-15 4-11 1-15 9-3 14-7 11-3 15-7z"
        fill="var(--accent)"
        opacity="0.16"
      />
      <circle cx="32" cy="32" r="21" fill="none" stroke="var(--brass)" strokeWidth="1.4" opacity="0.8" />
      <circle cx="32" cy="32" r="25" fill="none" stroke="var(--brass)" strokeWidth="0.7" opacity="0.4" />
      <text
        x="32"
        y="38"
        textAnchor="middle"
        fontSize="17"
        fontFamily="'Cormorant Garamond', Georgia, serif"
        fontVariant="small-caps"
        letterSpacing="1.5"
        fill="var(--brass-soft)"
      >
        cc
      </text>
    </svg>
  )
}

/** Corner filigree, mirrored by CSS at each corner of a panel. */
export function CornerPiece({ className = '' }: { className?: string }) {
  return (
    <svg className={`orn-corner ${className}`} viewBox="0 0 48 48" role="presentation" aria-hidden="true">
      <path d="M2 2h18M2 2v18" stroke="var(--brass)" strokeWidth="1.3" opacity="0.7" />
      <path d="M8 8c10 0 18 8 18 18" stroke="var(--brass)" strokeWidth="0.9" fill="none" opacity="0.45" />
      <circle cx="8" cy="8" r="2" fill="var(--brass)" opacity="0.7" />
    </svg>
  )
}
