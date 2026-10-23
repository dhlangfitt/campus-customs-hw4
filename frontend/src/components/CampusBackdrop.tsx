import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import CampusMap from './CampusMap'

/**
 * The campus map, flown rather than panned.
 *
 * Moving from one part of the site to another is a journey across the model:
 * the camera pulls back far enough to see where it is going, travels, and
 * pushes in on the new place. Scrolling between sections of a page does it,
 * navigating between pages does it, and picking a product category does it.
 *
 * The two-phase flight is deliberate. A single interpolation from one close-up
 * to another slides the map sideways under the viewer and reads as a smear; a
 * zoom out first gives the movement somewhere to happen.
 */

export interface Place {
  x: number
  y: number
  scale: number
  label: string
}

/** Named parts of the map, in fractions of the whole model. */
export const PLACES: Record<string, Place> = {
  overview: { x: 0.5, y: 0.48, scale: 0.92, label: 'the campus' },
  oldCampus: { x: 0.26, y: 0.26, scale: 1.34, label: 'old campus' },
  green: { x: 0.5, y: 0.22, scale: 1.3, label: 'the green' },
  scienceHill: { x: 0.74, y: 0.3, scale: 1.34, label: 'science hill' },
  colleges: { x: 0.28, y: 0.6, scale: 1.3, label: 'the residential colleges' },
  library: { x: 0.56, y: 0.64, scale: 1.36, label: 'the library quad' },
  fields: { x: 0.8, y: 0.8, scale: 1.4, label: 'the playing fields' },
  broadway: { x: 0.36, y: 0.8, scale: 1.44, label: 'broadway' },
}

/** Which place each product category belongs to. */
export const CATEGORY_PLACE: Record<string, keyof typeof PLACES> = {
  'T-Shirts': 'oldCampus',
  'Sweatshirts & Crewnecks': 'green',
  Hoodies: 'scienceHill',
  'Quarter-Zips': 'colleges',
  Jackets: 'library',
  'Performance Shirts': 'fields',
}

/** Where each route starts out, before scrolling takes over. */
const ROUTE_PLACE: Record<string, keyof typeof PLACES> = {
  '/': 'oldCampus',
  '/products': 'overview',
  '/about': 'colleges',
  '/login': 'broadway',
  '/create-account': 'broadway',
}

/** How far the camera pulls back before travelling. */
const TRAVEL_SCALE = 0.8
const PULL_BACK_MS = 520
const TRAVEL_MS = 1000

export default function CampusBackdrop({ focus }: { focus?: string | null }) {
  const location = useLocation()
  const [target, setTarget] = useState<Place>(PLACES.oldCampus)
  const [cam, setCam] = useState<Place>(PLACES.oldCampus)
  const [phase, setPhase] = useState<'rest' | 'out' | 'in'>('rest')
  const timers = useRef<number[]>([])

  // ---- deciding where we are meant to be looking -------------------------

  // A category wins; otherwise the section in view; otherwise the route.
  useEffect(() => {
    if (focus && CATEGORY_PLACE[focus]) {
      setTarget(PLACES[CATEGORY_PLACE[focus]])
      return
    }
    const routeKey = ROUTE_PLACE[location.pathname] ?? (location.pathname.startsWith('/products/') ? 'broadway' : 'overview')
    setTarget(PLACES[routeKey])
  }, [focus, location.pathname])

  // Sections declare their own place with data-campus; whichever sits nearest
  // the middle of the screen is the one the camera follows.
  useEffect(() => {
    if (focus) return
    const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-campus]'))
    if (!sections.length) return

    let last = 0
    const pick = () => {
      const now = Date.now()
      if (now - last < 120) return
      last = now
      const mid = window.innerHeight * 0.45
      let best: HTMLElement | null = null
      let bestGap = Infinity
      for (const s of sections) {
        const r = s.getBoundingClientRect()
        const gap = Math.abs(r.top + r.height / 2 - mid)
        if (gap < bestGap) {
          bestGap = gap
          best = s
        }
      }
      const key = best?.dataset.campus
      if (key && PLACES[key]) setTarget((t) => (t === PLACES[key] ? t : PLACES[key]))
    }
    pick()
    window.addEventListener('scroll', pick, { passive: true })
    window.addEventListener('resize', pick)
    return () => {
      window.removeEventListener('scroll', pick)
      window.removeEventListener('resize', pick)
    }
  }, [location.pathname, focus])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [location.pathname])

  // ---- flying there ------------------------------------------------------

  useEffect(() => {
    if (target === cam) return
    timers.current.forEach(clearTimeout)
    timers.current = []

    // 1. pull back where we are, 2. travel and push in on the new place.
    setPhase('out')
    setCam((c) => ({ ...c, scale: TRAVEL_SCALE }))
    timers.current.push(
      window.setTimeout(() => {
        setPhase('in')
        setCam(target)
      }, PULL_BACK_MS),
      window.setTimeout(() => setPhase('rest'), PULL_BACK_MS + TRAVEL_MS),
    )
    return () => {
      timers.current.forEach(clearTimeout)
      timers.current = []
    }
    // cam is intentionally not a dependency: this runs when the target moves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target])

  const duration = phase === 'out' ? PULL_BACK_MS : TRAVEL_MS

  return (
    <div className="campus" aria-hidden="true">
      <div
        className="campus__pan"
        style={{
          transform: `scale(${cam.scale}) translate3d(${((0.5 - cam.x) * 100) / cam.scale}%, ${
            ((0.5 - cam.y) * 100) / cam.scale
          }%, 0)`,
          transitionDuration: `${duration}ms`,
        }}
      >
        <CampusMap />
      </div>
      <div className="campus__veil" />
      <p className="campus__place">{cam.label}</p>
    </div>
  )
}
