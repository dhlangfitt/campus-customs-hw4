import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getProduct } from '../api'
import type { Product } from '../types'

export default function ProductDetail() {
  const { productId } = useParams<{ productId: string }>()
  const [product, setProduct] = useState<Product | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!productId) return
    let live = true
    setProduct(null)
    setError('')
    getProduct(productId)
      .then((p) => live && setProduct(p))
      .catch((e: Error) => live && setError(e.message))
    return () => {
      live = false
    }
  }, [productId])

  if (error) return <p className="state state--error">{error}</p>
  if (!product) return <p className="state">loading</p>

  return (
    <div className="page">
      <Link className="backlink" to="/products">
        ← all products
      </Link>

      <div className="detail">
        <div className="detail__media">
          <img className="detail__img" src={product.image_url} alt={product.name} />
        </div>

        <div className="detail__info">
          <p className="detail__cat">{product.category}</p>
          <h1 className="detail__name">{product.name}</h1>
          <p className="detail__price">${product.price.toFixed(2)}</p>
          <p className="detail__desc">{product.description}</p>

          <h2 className="detail__h">colors</h2>
          <ul className="chips">
            {product.colors.map((c) => (
              <li key={c} className="chip">
                {c}
              </li>
            ))}
          </ul>

          <h2 className="detail__h">sizes</h2>
          {/* Decision 2: show the whole size run, strike through what has gone,
              and mark anything down to its last few. */}
          <ul className="sizes">
            {product.inventory.map((s) => {
              const out = s.quantity === 0
              const low = !out && s.quantity <= 3
              return (
                <li
                  key={s.size}
                  className={`size${out ? ' size--out' : ''}${low ? ' size--low' : ''}`}
                >
                  <span className="size__label">{s.size}</span>
                  <span className="size__qty">
                    {out ? 'sold out' : low ? `only ${s.quantity} left` : `${s.quantity} in stock`}
                  </span>
                </li>
              )
            })}
          </ul>
          <p className="detail__total">
            {product.total_stock} in stock across all sizes · listed as “{product.garment_type}”
          </p>
        </div>
      </div>
    </div>
  )
}
