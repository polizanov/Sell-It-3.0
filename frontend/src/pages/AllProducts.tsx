import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'

import { http, type HttpError } from '../services/http'
import type { ProductDto } from '../services/products'
import './all-products.css'

type ProductsListResponse = {
  products: ProductDto[]
  page: number
  limit: number
  total: number
  totalPages: number
}

export function AllProducts() {
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()

  const [products, setProducts] = useState<ProductDto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pageMeta, setPageMeta] = useState<{ page: number; totalPages: number; total: number }>({
    page: 1,
    totalPages: 1,
    total: 0
  })

  const page = useMemo(() => {
    const raw = searchParams.get('page')
    const n = raw ? Number(raw) : Number.NaN
    return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1
  }, [searchParams])

  const justCreatedTitle = useMemo(() => {
    const state = (location.state ?? null) as { justCreatedTitle?: unknown } | null
    return typeof state?.justCreatedTitle === 'string' ? state.justCreatedTitle : null
  }, [location.state])

  useEffect(() => {
    ;(async () => {
      setIsLoading(true)
      setError(null)
      try {
        const qs = new URLSearchParams({ page: String(page), limit: '9' })
        const res = await http<ProductsListResponse>(`/api/products?${qs.toString()}`)
        setProducts(res.products)
        setPageMeta({ page: res.page, totalPages: res.totalPages, total: res.total })
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
  }, [page])

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
            <>
              {products.length ? (
                <div data-testid="products-list" className="all-products__grid">
                  {products.map((p) => (
                    <Link
                      key={p.id}
                      data-testid="product-item"
                      className="sl-card product-item"
                      to={`/products/${p.id}`}
                      aria-label={`Product ${p.title}`}
                    >
                      <div className="product-item__imageWrap">
                        {p.images?.[0]?.url ? (
                          <img className="product-item__image" src={p.images[0].url} alt={p.title} loading="lazy" />
                        ) : (
                          <div className="product-item__noImage">
                            <p className="product-item__noImageText">No image</p>
                          </div>
                        )}
                      </div>

                      <div className="product-item__body">
                        <div className="sl-row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ minWidth: 0 }}>
                            <h2 className="product-item__title">{p.title}</h2>
                            <p className="sl-subtitle product-item__description">
                            {p.description.length > 180 ? `${p.description.slice(0, 180)}…` : p.description}
                          </p>
                          </div>
                          <div className="sl-pill" style={{ flexShrink: 0 }}>
                            <strong>${p.price.toFixed(2)}</strong>
                          </div>
                        </div>

                        <div className="sl-row product-item__meta">
                          <span className="sl-pill">
                            <strong>Category</strong> {p.category.name}
                          </span>
                          <span className="sl-pill">
                            <strong>Published</strong> {new Date(p.publishedAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="sl-subtitle" style={{ margin: 0 }}>
                  No products yet. Create your first listing.
                </p>
              )}

              {pageMeta.totalPages > 1 ? (
                <div className="sl-divider" />
              ) : null}

              {pageMeta.totalPages > 1 ? (
                <div className="sl-row" style={{ justifyContent: 'space-between' }}>
                  <span className="sl-subtitle" style={{ margin: 0 }}>
                    Page <span className="sl-code">{pageMeta.page}</span> of{' '}
                    <span className="sl-code">{pageMeta.totalPages}</span>
                  </span>
                  <div className="sl-row">
                    <button
                      className="sl-button"
                      type="button"
                      onClick={() => setSearchParams({ page: String(Math.max(1, pageMeta.page - 1)) })}
                      disabled={pageMeta.page <= 1}
                      aria-label="Previous page"
                    >
                      Prev
                    </button>
                    <button
                      className="sl-button"
                      type="button"
                      onClick={() =>
                        setSearchParams({ page: String(Math.min(pageMeta.totalPages, pageMeta.page + 1)) })
                      }
                      disabled={pageMeta.page >= pageMeta.totalPages}
                      aria-label="Next page"
                    >
                      Next
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </section>
      </div>
    </div>
  )
}

