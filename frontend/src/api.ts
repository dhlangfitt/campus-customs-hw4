// Thin wrapper over the FastAPI backend. Vite proxies /api in dev, so these
// stay relative and the built app works wherever it is served from.

import type {
  AppliedFilter,
  CategoryCount,
  ChatReply,
  Product,
  SignupInput,
  StoredTurn,
  User,
} from './types'

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { detail?: string }).detail || `Request failed (${res.status})`)
  }
  return res.json() as Promise<T>
}

export interface ProductQuery {
  q?: string
  category?: string
  color?: string
  size?: string
  max_price?: number
}

/** Run an AppliedFilter against the catalog — the same filter the chat applies. */
export const applyFilter = (f: AppliedFilter) =>
  listProducts({
    q: f.query ?? undefined,
    category: f.category ?? undefined,
    color: f.color ?? undefined,
    size: f.size ?? undefined,
    max_price: f.max_price ?? undefined,
  })

export function listProducts(params: ProductQuery = {}): Promise<{ count: number; products: Product[] }> {
  const qs = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== '' && v != null) qs.set(k, String(v))
  })
  return fetch(`/api/products?${qs}`).then((r) => json<{ count: number; products: Product[] }>(r))
}

export const getProduct = (id: string): Promise<Product> =>
  fetch(`/api/products/${encodeURIComponent(id)}`).then((r) => json<Product>(r))

export const getCategories = (): Promise<{ categories: CategoryCount[] }> =>
  fetch('/api/categories').then((r) => json<{ categories: CategoryCount[] }>(r))

/**
 * One turn with the shop assistant.
 *
 * `history` is opaque agent state returned by the previous reply and handed
 * straight back, which is what gives the assistant memory within a conversation.
 * `userId` is sent when a shopper is signed in, so the turn is persisted.
 * `pageContext` says where the shopper is standing, so "this one" has a
 * referent. It is derived from the route, never from what they typed.
 */
export interface PageContext {
  path: string
  product_id: string | null
  category: string | null
}

export const sendChat = (
  message: string,
  userId: number | null,
  history: unknown[],
  pageContext: PageContext,
): Promise<ChatReply> =>
  fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      user_id: userId,
      history,
      page_context: pageContext,
    }),
  }).then((r) => json<ChatReply>(r))

// --------------------------------------------------------------------------- //
// Accounts. Passwords go over the wire to the API and are never stored in the
// browser — only the returned user record is kept.
// --------------------------------------------------------------------------- //

export const login = (email: string, password: string): Promise<{ user: User }> =>
  fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  }).then((r) => json<{ user: User }>(r))

export const signup = (input: SignupInput): Promise<{ user: User }> =>
  fetch('/api/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  }).then((r) => json<{ user: User }>(r))

/**
 * A signed-in shopper's stored conversation, oldest first.
 *
 * Display only: the backend replays what was said, with each product card
 * rebuilt against the live catalog so a price the shopper is about to act on
 * is current rather than whatever it was at the time.
 */
export const getChatHistory = (userId: number): Promise<{ messages: StoredTurn[] }> =>
  fetch(`/api/chat/${userId}`).then((r) => json<{ messages: StoredTurn[] }>(r))

export const requestPasswordReset = (email: string): Promise<{ sent: boolean; message: string }> =>
  fetch('/api/password-reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  }).then((r) => json<{ sent: boolean; message: string }>(r))
