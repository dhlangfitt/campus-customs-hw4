import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { AppliedFilter, Product, Selection } from './types'

export interface ActiveResults {
  /** Which selection is on the page, so the chat can mark it as showing. */
  id: string
  label: string
  filter: AppliedFilter
  products: Product[]
  /** Bumped on every change, so the panel re-animates rather than swapping silently. */
  seq: number
}

interface Value {
  results: ActiveResults | null
  /** Put a selection on the page, replacing whatever was there. */
  show: (s: Selection) => void
  /** Replace the products in place — used when a filter chip is removed. */
  update: (filter: AppliedFilter, label: string, products: Product[]) => void
  clear: () => void
}

const Ctx = createContext<Value | null>(null)

/**
 * The single filter in force on the shop page.
 *
 * It holds *one* result set, never a stack. A new search from the chat
 * replaces it outright, which is what makes a change of tack feel like moving
 * a set of dropdowns rather than opening another panel.
 */
export function ChatResultsProvider({ children }: { children: ReactNode }) {
  const [results, setResults] = useState<ActiveResults | null>(null)

  const show = useCallback((s: Selection) => {
    setResults((prev) => ({
      id: s.id,
      label: s.label,
      filter: s.filter,
      products: s.products,
      seq: (prev?.seq ?? 0) + 1,
    }))
  }, [])

  const update = useCallback((filter: AppliedFilter, label: string, products: Product[]) => {
    // Editing the filter by hand detaches the page from the assistant's
    // selection, so no chat entry should still claim to be what is on screen.
    setResults((prev) =>
      prev ? { ...prev, id: '', filter, label, products, seq: prev.seq + 1 } : prev,
    )
  }, [])

  const clear = useCallback(() => setResults(null), [])

  const value = useMemo(() => ({ results, show, update, clear }), [results, show, update, clear])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useChatResults(): Value {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useChatResults must be used inside ChatResultsProvider')
  return ctx
}
