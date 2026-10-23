import { Link } from 'react-router-dom'
import type { Product } from '../types'

/** One garment in the grid. The whole card is the link to its detail page. */
export default function ProductCard({ product }: { product: Product }) {
  // Decision 2: a garment with holes in its size run is still worth showing —
  // no product here is sold out entirely — but say so on the card.
  const outOfStock = product.inventory.filter((s) => s.quantity === 0).length

  return (
    <Link className="card" to={`/products/${product.product_id}`}>
      <div className="card__imgwrap">
        <img className="card__img" src={product.image_url} alt={product.name} loading="lazy" />
      </div>
      <div className="card__body">
        <h3 className="card__name">{product.name}</h3>
        <p className="card__price">${product.price.toFixed(2)}</p>
        <p className="card__desc">{product.description}</p>
        {outOfStock > 0 && (
          <p className="card__stock">
            {outOfStock} of {product.inventory.length} sizes sold out
          </p>
        )}
      </div>
    </Link>
  )
}
