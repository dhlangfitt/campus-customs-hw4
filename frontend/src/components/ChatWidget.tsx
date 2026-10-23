import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getChatHistory, sendChat } from '../api'
import { useAuth } from '../auth'
import { useChatResults } from '../chatResults'
import { buildPageContext, usePageState } from '../pageContext'
import RichText from './RichText'
import type { ChatTurn, Selection } from '../types'

const GREETING: ChatTurn = {
  role: 'assistant',
  content: 'ask me about anything in the shop, and i will look it up for you.',
}

/**
 * Floating chat panel, bottom-right, talking to the Pydantic AI agent behind
 * POST /api/chat.
 *
 * Two different kinds of memory meet here, and they are not the same thing:
 *
 * * **Within this conversation**, the agent's opaque `history` blob is held in
 *   state and passed back on every request. That is what lets the assistant
 *   resolve "the first one" or "that hoodie".
 * * **Across sessions**, a signed-in shopper's stored turns are loaded when the
 *   panel opens. Those are replayed for the shopper to read; they are *not*
 *   given to the agent as context, so the assistant will not remember a
 *   conversation from last week.
 */
export default function ChatWidget() {
  const { user } = useAuth()
  const { results, show } = useChatResults()
  const navigate = useNavigate()
  const location = useLocation()
  const { category } = usePageState()
  const [open, setOpen] = useState(false)
  const [turns, setTurns] = useState<ChatTurn[]>([GREETING])
  const [history, setHistory] = useState<unknown[]>([])
  // Every result set the assistant has shown this session, newest last.
  const [selections, setSelections] = useState<Record<string, Selection>>({})
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingPast, setLoadingPast] = useState(false)
  const [error, setError] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  //: Which user's stored turns are currently shown, so we load them once.
  const loadedFor = useRef<number | null>(null)

  const loadPast = useCallback(async (userId: number) => {
    setLoadingPast(true)
    try {
      const { messages } = await getChatHistory(userId)
      loadedFor.current = userId
      const restored: Record<string, Selection> = {}
      messages.forEach((m) => {
        if (m.selection_id && m.products.length) {
          restored[m.selection_id] = {
            id: m.selection_id,
            label: `${m.products.length} shown earlier`,
            filter: { query: null, category: null, color: null, size: null, max_price: null },
            products: m.products,
            created_at: m.created_at,
          }
        }
      })
      setSelections((s) => ({ ...s, ...restored }))
      setTurns(
        messages.length
          ? messages.map((m) => ({
              role: m.role,
              content: m.content,
              products: m.products,
              created_at: m.created_at,
              selectionId: m.selection_id ?? null,
              selectionLabel:
                m.products.length ? `${m.products.length} garments` : undefined,
            }))
          : [GREETING],
      )
    } catch {
      // A failure to replay old turns should not stop a new conversation.
      setTurns([GREETING])
    } finally {
      setLoadingPast(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    if (!user) {
      // Signed out: drop anything personal from view immediately.
      if (loadedFor.current !== null) {
        loadedFor.current = null
        setTurns([GREETING])
        setHistory([])
      }
      return
    }
    if (loadedFor.current !== user.id) {
      setHistory([])
      void loadPast(user.id)
    }
  }, [open, user, loadPast])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [turns, open])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const message = draft.trim()
    if (!message || sending) return

    setTurns((t) => [...t, { role: 'user', content: message }])
    setDraft('')
    setSending(true)
    setError('')
    try {
      const res = await sendChat(
        message,
        user?.id ?? null,
        history,
        buildPageContext(location.pathname, category),
      )
      setTurns((t) => [...t, { role: 'assistant', content: res.reply, products: res.products }])
      setHistory(res.history)

      // Hand the structured matches to the page, and take the shopper to them.
      // The panel stays open — the conversation is the thing driving the browse.
      if (res.selection) {
        const sel = res.selection
        setSelections((s) => ({ ...s, [sel.id]: sel }))
        setTurns((t) => {
          const copy = [...t]
          const last = copy[copy.length - 1]
          if (last && last.role === 'assistant') {
            copy[copy.length - 1] = {
              ...last,
              selectionId: sel.id,
              selectionLabel: sel.label,
              products: sel.products,
            }
          }
          return copy
        })
        show(sel)
        navigate('/products')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'could not reach the shop assistant.')
    } finally {
      setSending(false)
    }
  }

  if (!open) {
    return (
      <button className="chat__launch" onClick={() => setOpen(true)} aria-label="Open shop assistant">
        ask the shop
      </button>
    )
  }

  return (
    <section className="chat" aria-label="Shop assistant">
      <header className="chat__head">
        <h2 className="chat__title">ask the shop</h2>
        <button className="chat__close" onClick={() => setOpen(false)} aria-label="Close chat">
          ×
        </button>
      </header>

      <div className="chat__log">
        {loadingPast && <p className="chat__note">loading your earlier messages</p>}

        {turns.map((t, i) => {
          // A gap between what was said before and what is being said now.
          const isLastStored = Boolean(t.created_at) && !turns[i + 1]?.created_at
          return (
            <div key={i} className="turn">
              <p className={`bubble bubble--${t.role}`}>
                <RichText text={t.content} />
              </p>
              {t.selectionId && (
                <SelectionLink
                  turn={t}
                  active={!!results?.id && results.id === t.selectionId}
                  onShow={() => {
                    const sel = selections[t.selectionId as string]
                    if (sel) {
                      show(sel)
                      navigate('/products')
                    }
                  }}
                />
              )}
              {isLastStored && <p className="chat__divider">earlier conversation above</p>}
            </div>
          )
        })}

        {sending && <p className="bubble bubble--assistant bubble--pending">looking</p>}
        {error && <p className="bubble bubble--error">{error}</p>}
        <div ref={endRef} />
      </div>

      <form className="chat__form" onSubmit={submit}>
        <input
          className="chat__input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="do you have this in navy"
          aria-label="Message the shop assistant"
          disabled={sending}
        />
        <button className="chat__send" type="submit" disabled={sending || !draft.trim()}>
          send
        </button>
      </form>
    </section>
  )
}

/**
 * A compact, clickable record of one set of garments the assistant showed.
 *
 * The cards themselves live on the page, not stacked inside the conversation —
 * so the chat stays a conversation, and scrolling back up gives the shopper a
 * list of everything they have been shown, any of which can be put back on the
 * page with one click.
 */
function SelectionLink({
  turn,
  active,
  onShow,
}: {
  turn: ChatTurn
  active: boolean
  onShow: () => void
}) {
  const products = turn.products ?? []
  return (
    <button
      type="button"
      className={active ? 'sel sel--active' : 'sel'}
      onClick={onShow}
      aria-label={`Show these ${products.length} garments on the page again`}
    >
      <span className="sel__thumbs">
        {products.slice(0, 4).map((p) => (
          <img key={p.product_id} className="sel__thumb" src={p.image_url} alt="" loading="lazy" />
        ))}
        {products.length > 4 && <span className="sel__more">+{products.length - 4}</span>}
      </span>
      <span className="sel__body">
        <span className="sel__label">
          {products.length} {products.length === 1 ? 'garment' : 'garments'}
          {turn.selectionLabel ? ` · ${turn.selectionLabel}` : ''}
        </span>
        <span className="sel__cta">{active ? 'showing on the page' : 'show these again'}</span>
      </span>
    </button>
  )
}
