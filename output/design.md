# Design direction — Ivy League secret society meets steampunk

## The rationale

Campus Customs sells to undergraduates and younger graduate students, and that
audience's relationship with the institution on the label has changed. They are
more sceptical of authority than the generation before them, more fluent in
irony, and noticeably more pessimistic about the future they are being
credentialled for. A shop that addresses them in the register of traditional
collegiate merchandising — crest, serif, blue field, earnest pride — is speaking
past them. It assumes an uncomplicated enthusiasm for the institution that they
do not uncomplicatedly feel.

The strategy is not to abandon the Yale association but to let the customer wear
it at a slight angle. The gear should feel a little edgy, a little out of place,
and knowingly so: an artefact of a legacy institution whose permanence looks
less certain than it used to, against a backdrop of geopolitical instability and
a transhumanist turn that makes the whole idea of an inherited canon feel
provisional. Worn in that spirit, a Yale crewneck becomes a more interesting
object than a straightforwardly proud one. The customer is not disavowing the
institution; they are showing that they can see around it.

Steampunk is the right vehicle because it is already doing what Yale's
architecture does. The campus is a deliberate recreation of styles that were
outdated when the stones were laid — a Gothic revival poured in the twentieth
century, aged on purpose. Steampunk is the same move in a different key: an
imagined past that never existed, built out of brass and conviction. Borrowing
its visual language does not impose a foreign idea on Yale so much as make
explicit something the campus was always doing.

The secret-society register completes it. Those societies are the part of Yale
the audience finds genuinely interesting rather than merely inherited, and their
iconography — seals, keys, candlelight, things withheld — gives a pessimistic
view of the future somewhere pleasurable to sit. It turns the mood from
complaint into membership. The nihilism becomes fun, which is the only form in
which this audience will accept it from a shop.

**In one line:** sell the institution to the people most sceptical of it, by
treating its own theatricality as the joke they are already in on.

---

## What was built

### Typography

Cormorant Garamond throughout, with a Garamond and Georgia fallback so the page
never drops to a sans-serif if the web font fails. Headings are set in small
caps. Body copy runs lowercase — a cummings register that reads as deliberate
rather than careless because the typeface is formal enough to carry it — but it
keeps the punctuation that does grammatical work. Sentences end in full stops and
clauses are separated by commas and colons; what is dropped is capitalisation,
not the marks that tell a reader where one thought ends and the next begins.
Product names, prices and stock counts are left exactly as the catalogue stores
them: the affectation belongs to the shop's voice, not to its data.

### The campus, as a dark isometric map

Behind every page sits a model of the campus seen from above at an angle: city
blocks, quads, courtyards, pitched roofs, two towers, trees and lit windows,
with lamps at the crossings. It is built procedurally in SVG — a small layout
table describes the blocks and the geometry is generated from it — so the map
can be made denser or re-proportioned without redrawing hundreds of polygons.
Every surface reads a CSS custom property, so the whole model relights when the
theme changes rather than being three separate pictures.

**Movement is a flight, not a pan.** Each part of the site is anchored to a
named place on the map: old campus, the green, science hill, the residential
colleges, the library quad, the playing fields, broadway. Whenever you move
between them — scrolling from one section to the next, navigating to another
page, or picking a product category — the camera **pulls back far enough to see
where it is going, travels, and pushes in on the new place**, in two timed
phases rather than one interpolation.

That two-phase motion is the point. Sliding directly from one close-up to
another drags the map sideways under the viewer and reads as a smear; zooming
out first gives the movement somewhere to happen, and makes the campus feel like
a place being crossed rather than a texture being scrolled. The place currently
in view is named quietly in the bottom corner.

### Handsome Dan, redrawn

Brass monocle with a chain, a cog turning behind one ear, a riveted collar
plate. The brief was sympathetic but not safe: the brow is heavy, the jaw is
set, and the underbite shows. He reads as a creature who has been in the
building a long time and has opinions about it. He is original artwork and
deliberately not a reproduction of Yale's trademarked mascot.

The shopfront was redrawn from the shop's own frontage rather than invented:
the red-brick upper storey over a black shopfront, the long italic wordmark on
the fascia with the bulldog shield at its right end, three bays of glass divided
by cast-iron columns, the door and its street number, the blue blade sign on the
corner, and brick pavement with inset star medallions. Drawn, not photographed,
and lit by whichever theme is active.

### Ornament

A filigree-and-cog rule between sections, a wax seal closing each prose page,
and corner pieces available for panels. All three draw from the active palette.

---

## The three options

Switchable live from the **lighting** control in the navigation bar. They differ
in palette and light, not in layout, so the shop stays one shop in three moods.

### 1 — `the tomb` · candlelight on oak and brass

Warmest and the most straightforwardly secret-society. Near-black browns, oak
shadow, strong brass, a low amber glow on the stonework. The campus reads as
interior even outdoors — as if the whole quad were a panelled room. The safest
of the three for a merchandise shop: it flatters garment photography, and the
warmth keeps the mood conspiratorial rather than bleak.

### 2 — `the orrery` · cyanotype, moonlight, cold brass

Coolest and most clearly steampunk. Petrol blues and cyanotype shadow, brass
gone cold, a blue-white moon. This is the option that reads most as
*instrument* — charts, lenses, the apparatus of a society that measures things.
It sits closest to conventional Yale blue, so it is the easiest to defend to
anyone nervous about the institution's colours, and the hardest of the three to
mistake for a generic dark theme.

### 3 — `the gaslamp` · oxblood, iron and a red lamp

Darkest in mood. Oxblood and iron with a red lamp burning at the edges. The most
committed to the apocalyptic register and the one that most makes the gear feel
out of place in a good way. It is also the riskiest: on the wrong page it tips
from knowing to grim, and it is the least flattering to navy garments.

**Selected: `the orrery`.** It is now the default. It carries the concept
furthest while staying recognisably within Yale's colour world, which matters
for a licensed reseller. Hold `the gaslamp` for seasonal use — Game week,
Halloween, end of term — where its bleakness is an event rather than a permanent
posture.

---

## One practical note

This is a licensed reseller, so the aesthetic has a boundary the rest of the
work does not. The mascot and the shopfront are original artwork rather than
borrowed marks, and the actual Yale trademarks on the garments appear only in
catalogue photography, where they belong. The styling dresses the shop, not the
product.


---

## Revision — after the first review

Four changes, following inspection:

- **The blue reading was selected** and is now the default lighting.
- **The backdrop became a map.** The first attempt was a skyline panorama seen
  from street level; it has been replaced with the isometric model described
  above, which is what the brief actually asked for.
- **The camera flies rather than pans.** Movement between parts of the site is
  now an explicit zoom out, travel, zoom in.
- **Punctuation was restored.** The first pass stripped sentence separators
  along with capitalisation, which made the copy hard to parse. Full stops,
  commas and colons are back; the lowercase register stays.
- **The banner is 75% larger and Handsome Dan twice the size**, and the
  shopfront is now drawn from the real building rather than imagined.
