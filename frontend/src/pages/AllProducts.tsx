import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

import { http, type HttpError } from '../services/http'

type ProductDto = {
  id: string
  sellerId: string
  title: string
  description: string
  price: number
  category: { id: string; name: string }
  images: Array<{ url: string; publicId: string }>
  publishedAt: string
}

export function AllProducts() {
  const location = useLocation()

  const [products, setProducts] = useState<ProductDto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const justCreatedTitle = useMemo(() => {
    const state = (location.state ?? null) as { justCreatedTitle?: unknown } | null
    return typeof state?.justCreatedTitle === 'string' ? state.justCreatedTitle : null
  }, [location.state])

  useEffect(() => {
    ;(async () => {
      setIsLoading(true)
      setError(null)
      try {
        const res = await http<{ products: ProductDto[] }>('/api/products')
        setProducts(res.products)
      } catch (e) {
        const err = e as HttpError
        setError(err.message || 'Failed to load products')
      } finally {
        setIsLoading(false)
      }
    })().catch(() => {
      setIsLoading(false)
      setError('Failed to load products')
    })
  }, [])

  return (
    <div className="sl-page">
      <div className="sl-container">
        <header className="sl-header">
          <div>
            <h1 className="sl-h1">All products</h1>
            <p className="sl-subtitle">Browse listings</p>
          </div>
          <Link className="sl-button sl-button--primary" to="/products/create">
            Create product
          </Link>
        </header>

        <section className="sl-card" aria-label="All products page">
          {justCreatedTitle ? (
            <>
              <p className="sl-subtitle" style={{ margin: 0 }}>
                <strong style={{ color: 'var(--sl-success)' }}>Created</strong> <span className="sl-code">{justCreatedTitle}</span>
              </p>
              <div className="sl-divider" />
            </>
          ) : null}

          {isLoading ? (
            <p className="sl-subtitle" style={{ margin: 0 }}>
              Loading…
            </p>
          ) : null}

          {error ? (
            <p className="sl-error" role="alert">
              {error}
            </p>
          ) : null}

          {!isLoading && !error ? (
            products.length ? (
              <div data-testid="products-list" style={{ display: 'grid', gap: '1.2rem' }}>
                {products.map((p) => (
                  <article
                    key={p.id}
                    data-testid="product-item"
                    className="sl-card"
                    style={{ padding: '1.6rem' }}
                    aria-label={`Product ${p.title}`}
                  >
                    <div className="sl-row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ minWidth: 0 }}>
                        <h2 style={{ margin: 0, fontSize: '2rem' }}>{p.title}</h2>
                        <p className="sl-subtitle" style={{ marginTop: '0.6rem' }}>
                          {p.description.length > 180 ? `${p.description.slice(0, 180)}…` : p.description}
                        </p>
                      </div>
                      <div className="sl-pill" style={{ flexShrink: 0 }}>
                        <strong>${p.price.toFixed(2)}</strong>
                      </div>
                    </div>

                    <div className="sl-row" style={{ marginTop: '1.2rem' }}>
                      <span className="sl-pill">
                        <strong>Category</strong> {p.category.name}
                      </span>
                      <span className="sl-pill">
                        <strong>Published</strong> {new Date(p.publishedAt).toLocaleString()}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="sl-subtitle" style={{ margin: 0 }}>
                No products yet. Create your first listing.
              </p>
            )
          ) : null}
        </section>
      </div>
    </div>
  )
}

