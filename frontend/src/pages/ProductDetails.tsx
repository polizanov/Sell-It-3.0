import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { Navigation, Pagination, A11y } from 'swiper/modules'
import { Swiper, SwiperSlide } from 'swiper/react'

import { useAuth } from '../contexts/AuthContext'
import { type HttpError } from '../services/http'
import { favoriteProduct, getProductById, type ProductDetailsDto, unfavoriteProduct } from '../services/products'
import './product-details.css'

import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'

export function ProductDetails() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const { token, user, userId } = useAuth()

  const [product, setProduct] = useState<ProductDetailsDto | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isUpdatingFavorite, setIsUpdatingFavorite] = useState(false)
  const [favoriteError, setFavoriteError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    ;(async () => {
      setIsLoading(true)
      setError(null)
      try {
        const p = await getProductById(id)
        setProduct(p)
      } catch (e) {
        const err = e as HttpError
        setError(err.message || 'Failed to load product')
      } finally {
        setIsLoading(false)
      }
    })().catch(() => {
      setIsLoading(false)
      setError('Failed to load product')
    })
  }, [id])

  const isAuthor = useMemo(() => {
    if (!product || !userId) return false
    return product.sellerId === userId
  }, [product, userId])

  const isFavorited = useMemo(() => {
    if (!product || !userId) return false
    return product.likedUsers.includes(userId)
  }, [product, userId])

  const canFavorite = Boolean(token) && Boolean(user?.isEmailVerified) && Boolean(product) && !isAuthor

  const fromPath = useMemo(() => location.pathname, [location.pathname])

  return (
    <div className="sl-page">
      <div className="sl-container">
        <header className="sl-header">
          <div style={{ minWidth: 0 }}>
            <h1 className="sl-h1">Product details</h1>
            <p className="sl-subtitle" style={{ margin: 0 }}>
              {product?.title ?? 'Loading…'}
            </p>
          </div>
          <Link className="sl-button" to="/products">
            Back to products
          </Link>
        </header>

        <section className="sl-card product-details" aria-label="Product details">
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

          {!isLoading && !error && product ? (
            <div className="product-details__layout">
              <div className="product-details__media">
                {product.images.length ? (
                  <Swiper
                    modules={[Navigation, Pagination, A11y]}
                    navigation
                    pagination={{ clickable: true }}
                    className="product-details__swiper"
                  >
                    {product.images.map((img, idx) => (
                      <SwiperSlide key={img.publicId || img.url}>
                        <div className="product-details__imageWrap">
                          <img
                            className="product-details__image"
                            src={img.url}
                            alt={`${product.title} image ${idx + 1}`}
                            loading="lazy"
                          />
                        </div>
                      </SwiperSlide>
                    ))}
                  </Swiper>
                ) : (
                  <div className="product-details__noImage" aria-label="No product images">
                    <p className="product-details__noImageText">No images uploaded</p>
                  </div>
                )}
              </div>

              <div className="product-details__info">
                <div className="product-details__titleRow">
                  <h2 className="product-details__title">{product.title}</h2>
                  <div className="sl-pill" style={{ flexShrink: 0 }}>
                    <strong>${product.price.toFixed(2)}</strong>
                  </div>
                </div>

                <p className="product-details__description">{product.description}</p>

                <div className="product-details__meta">
                  <span className="sl-pill">
                    <strong>Category</strong> {product.category.name}
                  </span>
                  <span className="sl-pill">
                    <strong>Published</strong> {new Date(product.publishedAt).toLocaleString()}
                  </span>
                  <span className="sl-pill">
                    <strong>Favorites</strong> {product.favoritesCount}
                  </span>
                </div>

                <div className="product-details__actions">
                  {!token ? (
                    <p className="product-details__hint">
                      Sign in to favorite this product.{' '}
                      <Link to="/login" state={{ from: fromPath }}>
                        Login
                      </Link>
                    </p>
                  ) : null}

                  {token && user && !user.isEmailVerified ? (
                    <p className="product-details__hint">
                      Email verification is required to favorite products. Visit{' '}
                      <Link to="/profile">Profile</Link> to resend your verification email.
                    </p>
                  ) : null}

                  {token && user && user.isEmailVerified && isAuthor ? (
                    <div className="product-details__ownerActions" aria-label="Owner actions">
                      <button className="sl-button" type="button" disabled title="Not implemented yet">
                        Edit (coming soon)
                      </button>
                      <button className="sl-button" type="button" disabled title="Not implemented yet">
                        Delete (coming soon)
                      </button>
                    </div>
                  ) : null}

                  {canFavorite ? (
                    <div className="product-details__favorite">
                      <button
                        className={`sl-button ${isFavorited ? 'sl-button--primary' : ''}`}
                        type="button"
                        aria-pressed={isFavorited}
                        disabled={isUpdatingFavorite}
                        onClick={() => {
                          if (!id) return
                          if (!product) return

                          setFavoriteError(null)
                          setIsUpdatingFavorite(true)

                          ;(async () => {
                            const fav = isFavorited ? await unfavoriteProduct(id) : await favoriteProduct(id)
                            setProduct((prev) => {
                              if (!prev) return prev
                              return {
                                ...prev,
                                likedUsers: fav.likedUsers,
                                favoritesCount: fav.favoritesCount
                              }
                            })
                          })()
                            .catch((e) => {
                              const err = e as HttpError
                              setFavoriteError(err.message || 'Failed to update favorite')
                            })
                            .finally(() => {
                              setIsUpdatingFavorite(false)
                            })
                        }}
                      >
                        {isUpdatingFavorite ? 'Updating…' : isFavorited ? 'Unfavorite' : 'Favorite'}
                      </button>

                      {favoriteError ? (
                        <p className="sl-error" role="alert" style={{ margin: 0 }}>
                          {favoriteError}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  )
}

