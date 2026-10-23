# Usability improvements

Four changes to Campus Customs: two to the front end, two to the back end. Each
is recorded with the reason it was made, in the project owner's own words, and
with what was tested to confirm it works.

| # | Where | Change |
| --- | --- | --- |
| 1 | Front end | Yale colours, a bulldog mark, merchandise and a shopfront on the home page |
| 2 | Front end | Removed copy that foregrounded what the shop *cannot* do |
| 3 | Back end | Chat drives a single live filter on the page, replaced on every change of tack |
| 4 | Back end | Every set of garments the assistant shows is recorded and can be reopened |

---

## Front end 1 — Yale colours, a mascot, and merchandise above the fold

### What changed

- **Palette.** The black-and-pink scheme was replaced with Yale blues: a deep
  navy ground (`#001b2e`), Yale Blue (`#00356b`) for headers and active states,
  and Yale's brighter blue (`#286dc0`) for actions and links. Pink survives as
  a deliberate accent only — the second word of the wordmark, the eyebrow rule,
  the bulldog's collar tag, the awning stripe — which keeps the house style
  present without letting it define the shop.
- **A bulldog mark**, in the navigation beside the wordmark and again in the
  footer. It is **original artwork drawn for this project**, not a reproduction
  of Yale's Handsome Dan, which is a registered trademark.
- **A triptych of real merchandise** on the home page — a tee, a crewneck and a
  hoodie, loaded live from the catalogue rather than hard-coded, each linking to
  its product page.
- **An illustration of the 57 Broadway shopfront.** Drawn rather than
  photographed, because no photograph of the shop was available and inventing
  one would misrepresent a real address. It is a self-contained component and
  can be swapped for a real photograph by replacing one file.

### Why — the reason to log

The previous design conveyed nothing of Yale's brand. The issue was not merely
that the palette was wrong in the decorative sense; it is that an apparel shop
trades on the institution whose marks it is licensed to sell, and the visual
identity *is* the licence made visible. A black-and-pink scheme did not read as
Yale at all — not as the traditional institution, and not as some knowing,
subcultural reading of it either. It simply detached the shop from the thing it
is selling, leaving the customer to supply the association themselves. Yale blue
and a bulldog do that work before a word is read, and putting real garments and
the physical shopfront on the home page completes it: the visitor can see what
is sold and that there is a real place on Broadway selling it.

### Verified

Rendered at desktop and mobile widths. The nav mark, footer mark, triptych and
shopfront all render; the three featured garments load live from `/api/products`
and link to their detail pages.

---

## Front end 2 — Removed copy that foregrounded what the shop cannot do

### What changed

- **Deleted the home page section "Can you tell me what is actually in stock?"**
  — the passage that volunteered that roughly three-quarters of garments are
  missing a size at any moment and that the shop would rather say so than let
  the customer find out at the register.
- **Rewrote the equivalent About Us section.** "How we handle the awkward part",
  which named 145 of 612 size options as sitting at zero, is now "How we keep
  the shelves honest", describing live per-size counts and the assistant's size
  filter as features of the service.

### Why — the reason to log

Both passages focused the customer on negative potential aspects of the
experience. The information was accurate, and the instinct behind it — candour
about stock — was sound, but placing it in the shop's own introductory copy
inverts its effect. Volunteered unprompted, before the customer has looked at a
single garment, an inventory statistic reads as a warning rather than as
honesty, and it primes a visitor to expect disappointment at precisely the point
where they are deciding whether to browse at all. The underlying commitment has
not been dropped: the stock counts are still live on every product page, sold-out
sizes are still struck through, and the assistant still volunteers when a size
is gone. The difference is that the customer now meets that honesty at the
moment it is useful to them, rather than as a disclaimer on the front door.

### Verified

Home page headings are now "Why layers, specifically?" and "Come visit us". No
inventory statistic appears in introductory copy on either page.

---

## Back end 3 — Chat drives one live filter, replaced on every change of tack

### What changed

A single backend change with three parts, so that a conversation operates the
shop's filters rather than accumulating panels of results.

1. **Size became a real filter.** `db.search_products()` and `/api/products`
   accept `size`, implemented as an `EXISTS` clause requiring a stock row above
   zero — so "available in XL" means a garment that can actually be bought in
   XL, not one the shop lists in XL. The agent's `search_catalog` tool takes the
   same argument.
2. **The chat response carries an explicit filter.** `ChatResponse.filter` is an
   `AppliedFilter` (`query`, `category`, `color`, `size`, `max_price`) recording
   the state the page should be in. Each search **replaces** it rather than
   adding to it, which is what makes a change of tack behave like moving a set
   of dropdowns.
3. **Every argument is optional.** A shopper who gives only a constraint — a
   size, a budget — gets a filter on that constraint alone.

The page renders the filter as removable chips. Removing one re-queries through
the same `/api/products` the chat uses, so the two cannot disagree.

### Why — the reason to log

To give the customer a more dynamic and responsive experience: it should feel
like they are operating a set of radio buttons and dropdown filters, but through
their chat. A customer who changes tack mid-conversation should see the shop
rearrange itself around the new request, not accumulate a second list of options
inside the chat window while the page behind it still shows the old one. The
conversation is the control surface; the page is the display it drives.

### Verified — stress-tested

**Filter correctness against the database.** For all six sizes, the count from
`/api/products?size=X` matched a direct SQL count exactly (XS 75, S 78, M 80,
L 78, XL 77, XXL 79). Every garment returned was confirmed to hold stock in that
size — zero wrong across 152 results. Combined filters behaved: hoodies in XL
gave 21, XS under $40 gave 18.

**Hostile input.** `size=ZZ` returned 0 rather than everything; an empty size was
ignored; `size="'; drop table catalogue; --"` returned 0 and the catalogue was
intact at 102 rows afterwards, the query being parameterised.

**A conversation that keeps changing tack.** Four turns — "what do you have in
XL?", "only hoodies please", "actually, jackets instead", "forget the size, show
me anything under $40" — produced filters that replaced correctly each time:
`size XL` → `Hoodies · size XL` → `Jackets · size XL` → `under $40`. Every
garment in every selection was verified against the database; zero violations.

**Two bugs this testing caught and fixed:**

- `query` was a required tool argument, so when a shopper gave only a
  constraint the agent padded it with a filler word like "garments", which
  matches nothing. "Anything under $40?" produced the reply *"Nothing in the
  catalog is under $40"* — **false**, as 25 T-shirts are $32. Making every
  argument optional fixed it; the same question now returns six $32 T-shirts.
- "What do you have in XL?" failed the same way and now returns six garments.

---

## Back end 4 — Every set of garments shown is recorded and can be reopened

### What changed

- **Each search becomes a `Selection`** — an id, a human label ("Hoodies · size
  XL"), the filter that produced it, and the garments. It is returned on
  `ChatResponse.selection`.
- **Signed-in shoppers get durable ids.** A selection is keyed to the stored
  `chat_messages` row, so it survives a reload; replayed turns come back from
  `GET /api/chat/{user_id}` carrying `selection_id`. A guest's selections are
  keyed per reply and last the session.
- **The chat shows a compact record, not a stack of cards.** Each assistant turn
  that showed garments renders as one row: four thumbnails, a count and label,
  and either "Show these again" or "Showing on the page". Clicking it puts that
  set back on the page. The garments themselves live on the page, so the chat
  stays a conversation and scrolling up gives a browsable history of everything
  the customer has been shown.
- Editing a filter chip by hand detaches the page from the assistant's
  selection, so no chat row is left claiming to be what is on screen.

### Why — the reason to log

Customers are more and more used to interacting with chatbots that are
responsive to them and that save their version history, and their shopping
experience should be the same. Somebody who has been shown four sets of garments
over a conversation expects to be able to scroll back and return to the second
one, the way they would step back through any other tool they use. Without it,
every change of direction destroys the previous result and the only way back is
to ask again and hope for the same answer.

### Verified — stress-tested

**In the browser, across a live conversation.** After two searches the chat held
two selection rows and the page held six cards, with **zero product cards nested
inside the chat window**. Clicking the older selection row restored it: the chips
changed from `Hoodies, size XL` back to `size XL`, the cards changed to that
earlier set, and the active marker moved to the first row.

**Chip removal.** Removing `size XL` re-queried and returned the full catalogue —
102 garments, chips empty — and the stale "Showing on the page" marker cleared.

**Selection identity.** Across a four-turn conversation, four selections were
recorded with four distinct ids.

---

## Notes

- The bulldog and shopfront are original artwork, drawn for this project. The
  bulldog is deliberately **not** a reproduction of Yale's Handsome Dan, which
  is a registered trademark; the shopfront is drawn rather than photographed
  because no photograph of 57 Broadway was available and generating one would
  misrepresent a real address.

  Both were put to the project owner, who confirmed them as they stand
  (2026-10-23): *"The drawn bulldog and shopfront are fine as they are."* If a
  real photograph is ever supplied, `Storefront.tsx` is self-contained and can
  be replaced with an `<img>` without touching anything else.
- `Agents.md` specifies a black-and-pink house style. Pink is retained as an
  accent throughout rather than removed, so the rule is still visibly observed
  while the shop reads as Yale.
