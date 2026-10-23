import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

/**
 * Three readings of the same brief — Ivy League secret society meets steampunk.
 *
 * They differ in lighting and palette rather than in layout, so the shop is
 * recognisably one shop in three moods. Every value is a CSS custom property;
 * the campus painting, the ornaments and the bulldog all read from them, so
 * switching themes repaints the artwork too.
 */
export interface Theme {
  id: ThemeId
  name: string
  tagline: string
  vars: Record<string, string>
}

export type ThemeId = 'tomb' | 'orrery' | 'gaslamp'

export const THEMES: Record<ThemeId, Theme> = {
  tomb: {
    id: 'tomb',
    name: 'the tomb',
    tagline: 'candlelight on oak and brass',
    vars: {
      '--ink': '#0c0a07',
      '--ink-2': '#15110c',
      '--ink-3': '#1e1812',
      '--line': '#3b2f20',
      '--text': '#efe6d4',
      '--muted': '#a08f72',
      '--brass': '#c9a24a',
      '--brass-soft': '#e8cb86',
      '--glow': '#ffb648',
      '--accent': '#ff5c9d',
      '--paint-sky': '#17120c',
      '--paint-far': '#241c13',
      '--paint-mid': '#332616',
      '--paint-near': '#120d08',
      '--paint-lit': '#8a6a33',
      '--warn': '#e0a33a',
      '--paint-green': '#2a3119',
      '--paint-roof': '#43301c',
      '--paint-road': '#120e09',
      '--paint-wall': '#2e2317',
      '--brick': '#4a2b1b',
    },
  },
  orrery: {
    id: 'orrery',
    name: 'the orrery',
    tagline: 'cyanotype, moonlight, cold brass',
    vars: {
      '--ink': '#050e16',
      '--ink-2': '#081722',
      '--ink-3': '#0c2130',
      '--line': '#1d4259',
      '--text': '#e2eef5',
      '--muted': '#7fa0b4',
      '--brass': '#b98b3a',
      '--brass-soft': '#d9b468',
      '--glow': '#7fd4ff',
      '--accent': '#ff4f93',
      '--paint-sky': '#071722',
      '--paint-far': '#0d2635',
      '--paint-mid': '#13394f',
      '--paint-near': '#040c13',
      '--paint-lit': '#2f6c8c',
      '--warn': '#e8b34a',
      '--paint-green': '#13332f',
      '--paint-roof': '#14384d',
      '--paint-road': '#061018',
      '--paint-wall': '#10293a',
      '--brick': '#33303a',
    },
  },
  gaslamp: {
    id: 'gaslamp',
    name: 'the gaslamp',
    tagline: 'oxblood, iron and a red lamp',
    vars: {
      '--ink': '#100507',
      '--ink-2': '#1a0a0d',
      '--ink-3': '#241014',
      '--line': '#4a2029',
      '--text': '#f2e3e2',
      '--muted': '#ab8a86',
      '--brass': '#d0a33f',
      '--brass-soft': '#ebc96f',
      '--glow': '#ff7a5c',
      '--accent': '#ff2d87',
      '--paint-sky': '#190a0d',
      '--paint-far': '#2a1116',
      '--paint-mid': '#3a1a1f',
      '--paint-near': '#0b0406',
      '--paint-lit': '#8f4536',
      '--warn': '#e9a44a',
      '--paint-green': '#1f2a1c',
      '--paint-roof': '#43181d',
      '--paint-road': '#0d0507',
      '--paint-wall': '#301319',
      '--brick': '#4d1d22',
    },
  },
}

export const THEME_ORDER: ThemeId[] = ['tomb', 'orrery', 'gaslamp']

const KEY = 'campus-customs.theme'

interface Value {
  theme: Theme
  setTheme: (id: ThemeId) => void
}

const Ctx = createContext<Value | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [id, setId] = useState<ThemeId>(() => {
    const saved = localStorage.getItem(KEY) as ThemeId | null
    // The blue reading leads: it carries the concept while staying inside
    // Yale's colour world, which matters for a licensed reseller.
    return saved && saved in THEMES ? saved : 'orrery'
  })

  useEffect(() => {
    const t = THEMES[id]
    const root = document.documentElement
    Object.entries(t.vars).forEach(([k, v]) => root.style.setProperty(k, v))
    root.setAttribute('data-theme', id)
    localStorage.setItem(KEY, id)
  }, [id])

  const setTheme = useCallback((next: ThemeId) => setId(next), [])
  const value = useMemo(() => ({ theme: THEMES[id], setTheme }), [id, setTheme])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useTheme(): Value {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}
