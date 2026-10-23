import { useEffect, useState } from 'react'
import { applyFilter, getCategories, listProducts } from '../api'
import { useChatResults } from '../chatResults'
import { usePageState } from '../pageContext'
import ProductCard from '../components/ProductCard'
import type { AppliedFilter, CategoryCount, Product } from '../types'

export default function Products() {
  const { results, update, clear } = useChatResults()
  // Published so the chat widget can say which category is being browsed.
  const { category, setCategory } = usePageState()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<CategoryCount[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getCategories()
      .then((d) => setCategories(d.categories))
      .catch(() => setCategories([]))
  }, [])

  useEffect(() => {
    let live = true
    setLoading(true)
    setError('')
    listProducts({ category: category || undefined, q: query || undefined })
      .then((d) => live && setProducts(d.products))
      .catch((e: Error) => live && setError(e.message))
      .finally(() => live && setLoading(false))
    return () => {
      live = false
    }
  }, [category, query])

  return (
    <div className="page">
      <h1>the shop</h1>

      {/* The filter the assistant has put in force. One panel, replaced on
          every new search, with each clause removable — the chat is driving a
          set of controls the shopper can also reach by hand. */}
      {results && (
        <section className="found" key={results.seq} aria-live="polite">
          <div className="found__head">
            <div>
              <p className="found__eyebrow">from the shop assistant</p>
              <h2 className="found__title">
                {results.products.length}{' '}
                {results.products.length === 1 ? 'garment' : 'garments'}
              </h2>
            </div>
            <button className="found__clear" onClick={clear}>
              clear
            </button>
          </div>

          <FilterChips
            filter={results.filter}
            onRemove={async (key) => {
              const next: AppliedFilter = { ...results.filter, [key]: null }
              const { products: rows } = await applyFilter(next)
              update(next, describe(next), rows)
            }}
          />

          {results.products.length > 0 ? (
            <>
              <div className="grid grid--found">
                {results.products.map((p, i) => (
                  <div className="found__item" style={{ animationDelay: `${i * 55}ms` }} key={p.product_id}>
                    <ProductCard product={p} />
                  </div>
                ))}
              </div>
              <p className="found__hint">open any card for sizes and stock.</p>
            </>
          ) : (
            <p className="found__hint">
              nothing matches that. combination. remove a filter above, or ask the shop.
            </p>
          )}
        </section>
      )}

      {results && <h2 className="browse">browse everything</h2>}

      <div className="filters">
        <input
          className="filters__search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="try field hockey or quarter zip"
          aria-label="search products"
        />
        {/* Decision 1: filters offer the six normalised categories, not the 22
            raw garment_type strings the database stores. */}
        <div className="filters__cats" role="group" aria-label="Filter by category">
          <button
            className={category === '' ? 'pill pill--on' : 'pill'}
            onClick={() => setCategory('')}
          >
            all
          </button>
          {categories.map((c) => (
            <button
              key={c.category}
              className={category === c.category ? 'pill pill--on' : 'pill'}
              onClick={() => setCategory(c.category)}
            >
              {c.category} <span className="pill__n">{c.count}</span>
            </button>
          ))}
        </div>
      </div>

      {loading && <p className="state">loading the catalog</p>}
      {error && <p className="state state--error">{error}</p>}
      {!loading && !error && (
        <>
          <p className="state state--quiet">
            {products.length} {products.length === 1 ? 'garment' : 'garments'}
          </p>
          <div className="grid">
            {products.map((p) => (
              <ProductCard key={p.product_id} product={p} />
            ))}
          </div>
          {products.length === 0 && <p className="state">nothing matches that.</p>}
        </>
      )}
    </div>
  )
}

/** A short reading of a filter, matching what the backend produces. */
function describe(f: AppliedFilter): string {
  const bits: string[] = []
  if (f.query) bits.push(`“${f.query}”`)
  if (f.category) bits.push(f.category)
  if (f.color) bits.push(f.color)
  if (f.size) bits.push(`size ${f.size}`)
  if (f.max_price != null) bits.push(`under $${f.max_price}`)
  return bits.join(' · ') || 'everything'
}

const CHIP_LABELS: Record<keyof AppliedFilter, (v: string | number) => string> = {
  query: (v) => `“${v}”`,
  category: (v) => String(v),
  color: (v) => String(v),
  size: (v) => `size ${v}`,
  max_price: (v) => `under $${v}`,
}

function FilterChips({
  filter,
  onRemove,
}: {
  filter: AppliedFilter
  onRemove: (key: keyof AppliedFilter) => void
}) {
  const entries = (Object.keys(CHIP_LABELS) as (keyof AppliedFilter)[])
    .filter((k) => filter[k] != null && filter[k] !== '')

  if (!entries.length) return null

  return (
    <div className="chipbar" aria-label="Filters in force">
      {entries.map((k) => (
        <button key={k} className="fchip" onClick={() => onRemove(k)} title="Remove this filter">
          {CHIP_LABELS[k](filter[k] as string | number)}
          <span className="fchip__x" aria-hidden="true">×</span>
        </button>
      ))}
    </div>
  )
}
