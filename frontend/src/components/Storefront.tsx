/**
 * 57 Broadway, drawn from the shop's own frontage.
 *
 * The photograph the drawing was made from shows 59 on the door; the shop's
 * own listing gives 57, which the owner confirmed, so the drawing follows the
 * address rather than the glass.
 *
 * The real building: a red-brick upper storey over a black shopfront, a long
 * white wordmark on the fascia with the bulldog shield at its right end, three
 * bays of glass divided by cast-iron columns, a blue blade sign on the corner,
 * and brick pavement with inset medallions.
 *
 * Original artwork, not a photograph, and lit for whichever theme is active —
 * so the same building reads as candlelit, cyanotype or gaslit.
 */
export default function Storefront({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 900 470"
      role="img"
      aria-label="the campus customs shopfront on broadway, drawn"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>campus customs, broadway</title>
      <defs>
        <filter id="front-oil" x="-4%" y="-4%" width="108%" height="108%">
          <feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="2" seed="5" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="3.4" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <pattern id="brick" width="26" height="12" patternUnits="userSpaceOnUse">
          <rect width="26" height="12" fill="var(--brick)" />
          <path d="M0 11.4h26M13 0v11.4M0 5.7h26" stroke="var(--paint-road)" strokeWidth="0.8" opacity="0.4" />
        </pattern>
        <pattern id="pave" width="18" height="10" patternUnits="userSpaceOnUse">
          <rect width="18" height="10" fill="var(--brick)" opacity="0.5" />
          <path d="M0 9.5h18M9 0v9.5" stroke="var(--paint-road)" strokeWidth="0.7" opacity="0.5" />
        </pattern>
        <linearGradient id="pane" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--glow)" stopOpacity="0.34" />
          <stop offset="100%" stopColor="var(--glow)" stopOpacity="0.08" />
        </linearGradient>
      </defs>

      <rect width="900" height="470" fill="var(--paint-road)" />

      <g filter="url(#front-oil)">
        {/* upper brick storey */}
        <rect x="18" y="0" width="790" height="150" fill="url(#brick)" />
        {[60, 190, 320, 450, 580].map((x) => (
          <g key={x}>
            <rect x={x} y={26} width="62" height="86" fill="var(--paint-road)" />
            <rect x={x + 5} y={31} width="52" height="76" fill="url(#pane)" opacity="0.5" />
            <rect x={x - 4} y={18} width="70" height="9" fill="var(--brick)" opacity="0.7" />
          </g>
        ))}
        {/* neighbour's brick, right */}
        <rect x="808" y="0" width="92" height="300" fill="url(#brick)" opacity="0.75" />

        {/* black fascia and the wordmark */}
        <rect x="18" y="150" width="790" height="74" fill="var(--paint-road)" />
        <rect x="18" y="150" width="790" height="74" fill="var(--ink)" opacity="0.55" />
        <text
          x="300"
          y="202"
          textAnchor="middle"
          fontFamily="'Cormorant Garamond', Georgia, serif"
          fontSize="50"
          fontStyle="italic"
          fontWeight="700"
          letterSpacing="-1"
          fill="var(--text)"
        >
          campuscustoms
        </text>
        {/* bulldog shield at the right of the sign */}
        <g transform="translate(612 160)">
          <path d="M0 0h56v34c0 16-12 26-28 30C12 60 0 50 0 34z" fill="var(--paint-wall)" />
          <path d="M0 0h56v34c0 16-12 26-28 30C12 60 0 50 0 34z" fill="none" stroke="var(--brass)" strokeWidth="1.4" />
          <circle cx="28" cy="26" r="13" fill="var(--text)" opacity="0.85" />
          <circle cx="22" cy="23" r="2.4" fill="var(--paint-road)" />
          <circle cx="34" cy="23" r="2.4" fill="var(--paint-road)" />
          <path d="M21 33c4 4 10 4 14 0" stroke="var(--paint-road)" strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>

        {/* awning lip */}
        <rect x="18" y="224" width="790" height="12" fill="var(--paint-road)" />

        {/* shopfront glazing, three bays */}
        {[
          { x: 34, w: 196 },
          { x: 262, w: 236 },
          { x: 530, w: 180 },
          { x: 742, w: 58 },
        ].map((bay) => (
          <g key={bay.x}>
            <rect x={bay.x} y={240} width={bay.w} height={162} fill="url(#pane)" />
            <rect x={bay.x} y={240} width={bay.w} height={162} fill="none" stroke="var(--paint-road)" strokeWidth="7" />
          </g>
        ))}

        {/* cast-iron columns between the bays */}
        {[236, 504, 716].map((x) => (
          <g key={x}>
            <rect x={x} y={240} width="20" height="162" fill="var(--paint-road)" />
            <rect x={x + 3} y={252} width="14" height="138" fill="var(--ink)" opacity="0.6" />
            <rect x={x - 3} y={240} width="26" height="10" fill="var(--paint-road)" />
          </g>
        ))}

        {/* left bay: posters and a display table */}
        <rect x="52" y="262" width="46" height="74" fill="var(--text)" opacity="0.22" />
        <text x="75" y="290" textAnchor="middle" fontSize="13" fontFamily="'Cormorant Garamond', Georgia, serif" fill="var(--text)" opacity="0.75">yale</text>
        <text x="75" y="308" textAnchor="middle" fontSize="7" fontFamily="'Cormorant Garamond', Georgia, serif" fill="var(--text)" opacity="0.6">family owned</text>
        <text x="75" y="320" textAnchor="middle" fontSize="7" fontFamily="'Cormorant Garamond', Georgia, serif" fill="var(--text)" opacity="0.6">since 1975</text>
        <rect x="120" y="326" width="96" height="46" fill="var(--paint-wall)" opacity="0.8" />
        {[128, 156, 184].map((x) => (
          <rect key={x} x={x} y={314} width="22" height="16" rx="3" fill="var(--text)" opacity="0.4" />
        ))}

        {/* centre bay: door with the street number, and mannequins */}
        <rect x="330" y="248" width="66" height="152" fill="var(--paint-road)" />
        <rect x="336" y="256" width="54" height="130" fill="url(#pane)" opacity="0.7" />
        <circle cx="386" cy="326" r="3" fill="var(--brass)" />
        <text x="363" y="244" textAnchor="middle" fontSize="13" fontFamily="'Cormorant Garamond', Georgia, serif" fill="var(--text)" opacity="0.8">57</text>
        {[430, 466].map((x, i) => (
          <g key={x} opacity="0.75">
            <circle cx={x} cy={292} r="9" fill="var(--text)" opacity="0.5" />
            <path d={`M${x - 14} 302h28l-5 54h-18z`} fill="var(--text)" opacity={i ? 0.3 : 0.42} />
            <path d={`M${x - 14} 356h28l-3 40h-22z`} fill="var(--paint-wall)" opacity="0.8" />
          </g>
        ))}

        {/* right bay: rail of garments */}
        <line x1="548" y1="286" x2="700" y2="286" stroke="var(--brass)" strokeWidth="2" opacity="0.6" />
        {[560, 588, 616, 644, 672].map((x) => (
          <path key={x} d={`M${x} 286v12l-8 40h16l-8-40`} stroke="var(--text)" strokeWidth="2.2" fill="none" opacity="0.45" />
        ))}

        {/* blue blade sign, right */}
        <g transform="translate(806 206)">
          <rect x="0" y="0" width="94" height="86" fill="var(--paint-wall)" />
          <rect x="0" y="0" width="94" height="86" fill="none" stroke="var(--brass)" strokeWidth="1.2" opacity="0.7" />
          <text x="47" y="30" textAnchor="middle" fontSize="17" fontStyle="italic" fontFamily="'Cormorant Garamond', Georgia, serif" fill="var(--text)">campus</text>
          <text x="47" y="52" textAnchor="middle" fontSize="17" fontStyle="italic" fontFamily="'Cormorant Garamond', Georgia, serif" fill="var(--text)">customs</text>
          <text x="47" y="72" textAnchor="middle" fontSize="8" letterSpacing="1" fontFamily="'Cormorant Garamond', Georgia, serif" fill="var(--brass-soft)">yale bulldog blue</text>
        </g>

        {/* kerb and brick pavement with medallions */}
        <rect x="0" y="402" width="900" height="14" fill="var(--paint-road)" />
        <rect x="0" y="416" width="900" height="54" fill="url(#pave)" />
        {[110, 250, 390, 530, 670, 810].map((x) => (
          <g key={x}>
            <circle cx={x} cy={430} r="5" fill="var(--brass)" opacity="0.45" />
            <path d={`M${x} 425l1.6 3.6 3.9.3-3 2.6.9 3.8-3.4-2-3.4 2 .9-3.8-3-2.6 3.9-.3z`} fill="var(--brass)" opacity="0.6" />
          </g>
        ))}
      </g>
    </svg>
  )
}
