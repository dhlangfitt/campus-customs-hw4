/** One size row from the inventory table. */
export interface StockRow {
  size: string
  quantity: number
}

/**
 * A product as the API returns it. The key set deliberately matches the
 * `products_json` payloads stored in the supplied chat history, so the chat
 * agent and the catalog speak the same shape.
 */
export interface Product {
  product_id: string
  name: string
  garment_type: string
  category: string
  description: string
  colors: string[]
  search_tags: string[]
  image_file_path: string
  image_url: string
  price: number
  inventory: StockRow[]
  total_stock: number
  /** Set on cards replayed from stored history when the live price differs. */
  price_changed_from?: number | null
  /** Set when the garment has since left the catalog. */
  delisted?: boolean
}

export interface CategoryCount {
  category: string
  count: number
}

export interface AppliedFilter {
  query: string | null
  category: string | null
  color: string | null
  size: string | null
  max_price: number | null
}

/** One set of garments the assistant put in front of the shopper. */
export interface Selection {
  id: string
  label: string
  filter: AppliedFilter
  products: Product[]
  created_at?: string | null
}

export interface ChatReply {
  reply: string
  /** Structured catalog matches the page renders as product cards. */
  products: Product[]
  /** What the agent searched for, so the page can label the results. */
  search_query: string | null
  /** The filter now in force on the page. Replaces any previous filter. */
  filter: AppliedFilter | null
  /** This turn's result set, recorded so the shopper can return to it. */
  selection: Selection | null
  /** Opaque agent history. Pass it back verbatim on the next request. */
  history: unknown[]
}

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
  /** Garments the agent looked up for this turn, shown as cards. */
  products?: Product[]
  /** Present on turns replayed from the database rather than this session. */
  created_at?: string
  /** Set on turns that showed garments, so the set can be restored. */
  selectionId?: string | null
  /** A short reading of the filter that produced this turn's garments. */
  selectionLabel?: string
}

export interface StoredTurn {
  id: number
  role: 'user' | 'assistant'
  content: string
  products: Product[]
  created_at: string
  selection_id?: string | null
}

/** A signed-in shopper. The API never sends the password hash. */
export interface User {
  id: number
  name: string
  email: string
  first_name: string | null
  last_name: string | null
}

export interface SignupInput {
  first_name: string
  last_name: string
  email: string
  password: string
}
