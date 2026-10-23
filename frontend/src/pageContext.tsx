import { createContext, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

/**
 * The one piece of page state the route cannot tell us: which category filter
 * the Products page currently has applied. The route gives the path and any
 * product id; this fills the gap, so the chat widget can describe where the
 * shopper is standing without reaching into another page's internals.
 */
interface PageStateValue {
  category: string
  setCategory: (c: string) => void
}

const Ctx = createContext<PageStateValue>({ category: '', setCategory: () => {} })

export function PageStateProvider({ children }: { children: ReactNode }) {
  const [category, setCategory] = useState('')
  const value = useMemo(() => ({ category, setCategory }), [category])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const usePageState = () => useContext(Ctx)

/** Build the context object sent with each chat message. */
export function buildPageContext(pathname: string, category: string) {
  const match = pathname.match(/^\/products\/(.+)$/)
  return {
    path: pathname,
    product_id: match ? decodeURIComponent(match[1]) : null,
    category: !match && pathname.startsWith('/products') && category ? category : null,
  }
}
