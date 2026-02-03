import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'

import { useAuth } from '../contexts/AuthContext'
import { http, type HttpError } from '../services/http'
import { getMyFavorites, getMyProducts, type ProductDto, type ProductsListResponse } from '../services/products'
import './all-products.css'
import './profile.css'

type TabKey = 'products' | 'favorites'

type PageMeta = {
  page: number
  totalPages: number
  total: number
}

function buildInitials(name: string | null | undefined, email: string | null | undefined) {
  const base = (name ?? '').trim() || (email ?? '').split('@')[0] || ''
  const parts = base.split(/\s+/).filter(Boolean)
  const initials = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() || '').join('')
  return initials || 'U'
}

async function uploadToCloudinary(file: File) {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined

  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary env vars are missing (VITE_CLOUDINARY_CLOUD_NAME, VITE_CLOUDINARY_UPLOAD_PRESET)')
  }

  const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null

  const form = new FormData()
  form.append('file', file)
  form.append('upload_preset', uploadPreset)

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/upload`, {
    method: 'POST',
    body: form
  })

  const data = (await res.json().catch(() => null)) as unknown
  if (!res.ok) {
    const msg =
      isRecord(data) &&
      isRecord(data.error) &&
      typeof data.error.message === 'string' &&
      data.error.message.trim().length > 0
        ? data.error.message
        : 'Failed to upload image'
    throw new Error(msg)
  }

  const secureUrl = isRecord(data) && typeof data.secure_url === 'string' ? data.secure_url : ''
  const publicId = isRecord(data) && typeof data.public_id === 'string' ? data.public_id : ''
  if (!secureUrl || !publicId) throw new Error('Unexpected Cloudinary response')

  return { url: secureUrl, publicId }
}

export function Profile() {
  const { user, logout, resendVerification, refreshMe } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()

  const tab = useMemo<TabKey>(() => {
    const raw = searchParams.get('tab')
    return raw === 'favorites' ? 'favorites' : 'products'
  }, [searchParams])

  const page = useMemo(() => {
    const raw = searchParams.get('page')
    const n = raw ? Number(raw) : Number.NaN
    return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1
  }, [searchParams])

  const [products, setProducts] = useState<ProductDto[]>([])
  const [pageMeta, setPageMeta] = useState<PageMeta>({ page: 1, totalPages: 1, total: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null)

  const initials = useMemo(() => buildInitials(user?.username, user?.email), [user?.username, user?.email])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  useEffect(() => {
    const state = location.state as { justDeletedTitle?: string } | null
    if (!state?.justDeletedTitle) return
    setDeleteSuccess(`Product "${state.justDeletedTitle}" deleted`)
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null })
  }, [location.pathname, location.search, location.state, navigate])

  useEffect(() => {
    ;(async () => {
      setIsLoading(true)
      setLoadError(null)
      try {
        const limit = 9
        const res: ProductsListResponse =
          tab === 'favorites' ? await getMyFavorites({ page, limit }) : await getMyProducts({ page, limit })
        setProducts(res.products)
        setPageMeta({ page: res.page, totalPages: res.totalPages, total: res.total })
      } catch (e) {
        const err = e as HttpError
        setLoadError(err.message || 'Failed to load products')
      } finally {
        setIsLoading(false)
      }
    })().catch(() => {
      setIsLoading(false)
      setLoadError('Failed to load products')
    })
  }, [page, tab])

  const handleTabChange = (next: TabKey) => {
    setSearchParams({ tab: next, page: '1' })
  }

  const handlePageChange = (nextPage: number) => {
    setSearchParams({ tab, page: String(nextPage) })
  }

  const handleFileChange = (file: File | null) => {
    setUploadError(null)
    setUploadSuccess(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    if (!file) {
      setSelectedFile(null)
      setPreviewUrl(null)
      return
    }
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    setIsUploading(true)
    setUploadError(null)
    setUploadSuccess(null)
    try {
      const uploaded = await uploadToCloudinary(selectedFile)
      await http<{ user: { profileImageUrl: string | null } }>('/api/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({ profileImageUrl: uploaded.url })
      })
      await refreshMe()
      setUploadSuccess('Profile photo updated')
      setSelectedFile(null)
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    } catch (e) {
      const err = e as Error
      setUploadError(err.message || 'Failed to update profile photo')
    } finally {
      setIsUploading(false)
    }
  }

  const currentPhotoUrl = user?.profileImageUrl ?? ''
  const isFavoritesTab = tab === 'favorites'

  return (
    <div className="sl-page">
      <div className="sl-container">
        <header className="sl-header profile__header">
          <div>
            <h1 className="sl-h1">Profile</h1>
            <p className="sl-subtitle">Your account details</p>
          </div>
        </header>

        <section className="sl-card profile__card" aria-label="Profile">
          <div className="profile__top">
            <div className="profile__identity">
              <div className="profile__avatar">
                {currentPhotoUrl ? (
                  <img className="profile__avatarImage" src={currentPhotoUrl} alt="Profile" />
                ) : (
                  <div className="profile__avatarPlaceholder" aria-hidden="true">
                    {initials}
                  </div>
                )}
              </div>
              <div className="profile__info">
                <p className="sl-subtitle profile__infoLine">
                  <strong>Email</strong>: <span className="sl-code">{user?.email}</span>
                </p>
                <p className="sl-subtitle profile__infoLine">
                  <strong>Username</strong>: <span className="sl-code">{user?.username}</span>
                </p>
                <p className="sl-subtitle profile__infoLine">
                  <strong>Email verified</strong>: <span className="sl-code">{user?.isEmailVerified ? 'yes' : 'no'}</span>
                </p>
              </div>
            </div>
            <button className="sl-button" type="button" onClick={logout}>
              Logout
            </button>
          </div>

          <div className="sl-divider" />

          <div className="profile__upload">
            <div className="profile__uploadInfo">
              <p className="sl-subtitle profile__infoLine" style={{ margin: 0 }}>
                Upload a new profile photo (jpg/png). It will replace the current one.
              </p>
              <input
                className="sl-input profile__fileInput"
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                disabled={isUploading}
              />
            </div>
            {previewUrl ? (
              <div className="profile__preview">
                <img className="profile__previewImage" src={previewUrl} alt="Selected preview" />
                <div className="profile__previewActions">
                  <button className="sl-button sl-button--primary" type="button" onClick={handleUpload} disabled={isUploading}>
                    {isUploading ? 'Uploading…' : 'Save photo'}
                  </button>
                  <button
                    className="sl-button"
                    type="button"
                    onClick={() => handleFileChange(null)}
                    disabled={isUploading}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}
            {uploadError ? (
              <p className="sl-error" role="alert">
                {uploadError}
              </p>
            ) : null}
            {uploadSuccess ? (
              <p className="profile__success" role="status">
                {uploadSuccess}
              </p>
            ) : null}
          </div>

          {!user?.isEmailVerified ? (
            <>
              <div className="sl-divider" />
              <p className="sl-subtitle" style={{ margin: 0 }}>
                Please verify your email to unlock protected actions (e.g. creating products or favoriting).
              </p>
              <div className="sl-row" style={{ marginTop: '1.2rem' }}>
                <button
                  className="sl-button sl-button--primary"
                  type="button"
                  onClick={() => resendVerification().catch(() => undefined)}
                >
                  Resend verification email
                </button>
              </div>
            </>
          ) : null}
        </section>

        <section className="sl-card profile__card" aria-label="My products and favorites">
          <div className="profile__tabs" role="tablist" aria-label="Profile tabs">
            <button
              className={`profile__tab ${!isFavoritesTab ? 'profile__tab--active' : ''}`}
              type="button"
              role="tab"
              aria-selected={!isFavoritesTab}
              onClick={() => handleTabChange('products')}
            >
              My products
            </button>
            <button
              className={`profile__tab ${isFavoritesTab ? 'profile__tab--active' : ''}`}
              type="button"
              role="tab"
              aria-selected={isFavoritesTab}
              onClick={() => handleTabChange('favorites')}
            >
              My favorites
            </button>
          </div>

          {deleteSuccess ? (
            <p className="profile__success" role="status">
              {deleteSuccess}
            </p>
          ) : null}

          {isLoading ? (
            <p className="sl-subtitle" style={{ margin: 0 }}>
              Loading…
            </p>
          ) : null}

          {loadError ? (
            <p className="sl-error" role="alert">
              {loadError}
            </p>
          ) : null}

          {!isLoading && !loadError ? (
            <>
              {products.length ? (
                <div data-testid="products-list" className="all-products__grid profile__grid">
                  {products.map((p) => (
                    <Link key={p.id} className="sl-card product-item" to={`/products/${p.id}`} aria-label={`Product ${p.title}`}>
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
                <div className="profile__empty">
                  <p className="sl-subtitle" style={{ margin: 0 }}>
                    {isFavoritesTab ? 'No favorites yet.' : 'No products yet.'}
                  </p>
                  {!isFavoritesTab ? (
                    <Link className="sl-button sl-button--primary" to="/products/create">
                      Create product
                    </Link>
                  ) : null}
                </div>
              )}

              {pageMeta.totalPages > 1 ? <div className="sl-divider" /> : null}

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
                      onClick={() => handlePageChange(Math.max(1, pageMeta.page - 1))}
                      disabled={pageMeta.page <= 1}
                      aria-label="Previous page"
                    >
                      Prev
                    </button>
                    <button
                      className="sl-button"
                      type="button"
                      onClick={() => handlePageChange(Math.min(pageMeta.totalPages, pageMeta.page + 1))}
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

