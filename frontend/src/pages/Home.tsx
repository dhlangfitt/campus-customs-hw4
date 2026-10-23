import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getProduct } from '../api'
import { OrnamentRule, WaxSeal } from '../components/Ornaments'
import Storefront from '../components/Storefront'
import type { Product } from '../types'

/** Three garments that between them show the range: tee, crewneck, hoodie. */
const FEATURED = ['2025-yale-vs-harvard-t-shirt', 'yale-dad-crewneck', 'basic-hoodie-big-yale']

export default function Home() {
  const [featured, setFeatured] = useState<Product[]>([])

  useEffect(() => {
    let live = true
    Promise.all(FEATURED.map((id) => getProduct(id).catch(() => null))).then(
      (rows) => live && setFeatured(rows.filter(Boolean) as Product[]),
    )
    return () => {
      live = false
    }
  }, [])

  return (
    <div className="prose">
      <section className="hero" data-campus="oldCampus">
        <p className="hero__eyebrow">officially licensed merchandise</p>
        <h1 className="hero__title">what does yale look like on a tuesday</h1>
        <p className="hero__lead">
          not the viewbook. a navy crewneck three winters deep in coffee, pulled on over
          whatever was nearest. that is the thing we sell: 102 of them, at 57 broadway and here.
        </p>
        <Link className="btn" to="/products">
          enter the shop
        </Link>
      </section>

      <OrnamentRule />

      <section className="triptych-wrap" data-campus="green">
        <div className="triptych">
          {featured.map((p) => (
            <Link className="trip" key={p.product_id} to={`/products/${p.product_id}`}>
              <img className="trip__img" src={p.image_url} alt={p.name} loading="lazy" />
              <span className="trip__name">{p.name}</span>
              <span className="trip__price">${p.price.toFixed(2)}</span>
            </Link>
          ))}
        </div>
        <p className="triptych__hint">
          <Link to="/products">all 102 garments &rarr;</Link>
        </p>
      </section>

      <OrnamentRule />

      <section data-campus="scienceHill">
        <h2>why layers</h2>
        <p>
          new haven between november and march is less a climate than a negotiation. you leave
          sterling at four in a quarter-zip and come out at seven wanting the hood. so most of
          what we keep is middle layers: 29 crewnecks, 27 hoodies, 11 quarter-zips, against only
          25 t-shirts. which tells you something honest about the weather here.
        </p>
      </section>

      <section data-campus="broadway">
        <h2>come and find us</h2>
        <figure className="shopfront">
          <Storefront className="shopfront__img" />
          <figcaption className="shopfront__cap">57 broadway &middot; new haven</figcaption>
        </figure>
        <p>
          everything on these pages is on those shelves, in the sizes the counts give. casual
          comfort, classic bulldog pride, and a staff who will tell you when something runs
          small.
        </p>
      </section>

      <div className="sealrow">
        <WaxSeal size={58} />
        <p>which leaves the one question we cannot settle for you: crewneck, or hoodie?</p>
      </div>
    </div>
  )
}
