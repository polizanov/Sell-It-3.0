import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { useAuth } from '../contexts/AuthContext'
import { http, type HttpError } from '../services/http'
import { getProductById, updateProduct, type ProductDetailsDto, type UpdateProductPayload } from '../services/products'

type Category = { id: string; name: string }

type ExistingImage = {
  kind: 'existing'
  url: string
  publicId: string
}

type LocalImage = {
  kind: 'local'
  file: File
  previewUrl: string
}

type EditImage = ExistingImage | LocalImage

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

export function EditProduct() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { userId } = useAuth()

  const [product, setProduct] = useState<ProductDetailsDto | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')

  const [categories, setCategories] = useState<Category[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)

  const [categoryMode, setCategoryMode] = useState<'existing' | 'new'>('existing')
  const [categoryId, setCategoryId] = useState('')
  const [categoryName, setCategoryName] = useState('')

  const [images, setImages] = useState<EditImage[]>([])

  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [didInit, setDidInit] = useState(false)

  useEffect(() => {
    return () => {
      images.forEach((img) => {
        if (img.kind === 'local') URL.revokeObjectURL(img.previewUrl)
      })
    }
  }, [images])

  useEffect(() => {
    if (!id) {
      setIsLoading(false)
      setLoadError('Product not found')
      return
    }

    ;(async () => {
      setIsLoading(true)
      setLoadError(null)
      try {
        const [productRes] = await Promise.all([getProductById(id)])
        setProduct(productRes)
      } catch (e) {
        const err = e as HttpError
        setLoadError(err.message || 'Failed to load product')
      } finally {
        setIsLoading(false)
      }
    })().catch(() => {
      setIsLoading(false)
      setLoadError('Failed to load product')
    })
  }, [id])

  useEffect(() => {
    ;(async () => {
      setIsLoadingCategories(true)
      try {
        const res = await http<{ categories: Category[] }>('/api/categories')
        setCategories(res.categories)
      } finally {
        setIsLoadingCategories(false)
      }
    })().catch(() => {
      setIsLoadingCategories(false)
    })
  }, [])

  useEffect(() => {
    if (!product || didInit) return
    if (isLoadingCategories) return

    setTitle(product.title)
    setDescription(product.description)
    setPrice(String(product.price))

    const hasCategory = categories.some((c) => c.id === product.category.id)
    if (hasCategory) {
      setCategoryMode('existing')
      setCategoryId(product.category.id)
    } else {
      setCategoryMode('new')
      setCategoryName(product.category.name)
    }

    setImages(
      product.images.map((img) => ({
        kind: 'existing',
        url: img.url,
        publicId: img.publicId
      }))
    )

    setDidInit(true)
  }, [product, categories, didInit, isLoadingCategories])

  const isAuthor = useMemo(() => {
    if (!product || !userId) return false
    return product.sellerId === userId
  }, [product, userId])

  const canSubmit = useMemo(() => !isSubmitting, [isSubmitting])
  const existingImages = images.filter((img): img is ExistingImage => img.kind === 'existing')
  const localImages = images.filter((img): img is LocalImage => img.kind === 'local')

  return (
    <div className="sl-page">
      <div className="sl-container">
        <header className="sl-header">
          <div>
            <h1 className="sl-h1">Edit product</h1>
            <p className="sl-subtitle">Update your listing</p>
          </div>
          {product ? (
            <Link className="sl-button" to={`/products/${product.id}`}>
              Back to product
            </Link>
          ) : null}
        </header>

        <section className="sl-card" aria-label="Edit product page">
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

          {!isLoading && !loadError && product && !isAuthor ? (
            <>
              <p className="sl-error" role="alert">
                You can only edit your own products.
              </p>
              <div className="sl-row">
                <Link className="sl-button" to={`/products/${product.id}`}>
                  Back to product
                </Link>
              </div>
            </>
          ) : null}

          {!isLoading && !loadError && product && isAuthor ? (
            <form
              className="sl-form"
              onSubmit={async (e) => {
                e.preventDefault()
                setError(null)
                setFieldErrors([])

                const localErrors: string[] = []
                if (!title.trim()) localErrors.push('Title is required')
                if (!description.trim()) localErrors.push('Description is required')
                const priceNumber = Number(price)
                if (!price.trim() || Number.isNaN(priceNumber) || priceNumber <= 0) {
                  localErrors.push('Price must be a positive number')
                }
                if (categoryMode === 'existing' && !categoryId) localErrors.push('Category is required')
                if (categoryMode === 'new' && !categoryName.trim()) localErrors.push('New category name is required')
                if (images.length > 5) localErrors.push('You can upload at most 5 images')

                if (localErrors.length) {
                  setFieldErrors(localErrors)
                  return
                }

                setIsSubmitting(true)
                try {
                  const uploadedImages =
                    localImages.length > 0 ? await Promise.all(localImages.map((img) => uploadToCloudinary(img.file))) : []

                  const mergedImages = [...existingImages.map((img) => ({ url: img.url, publicId: img.publicId })), ...uploadedImages]

                  const payloadBase = {
                    title: title.trim(),
                    description: description.trim(),
                    price: priceNumber,
                    images: mergedImages
                  }

                  const payload: UpdateProductPayload =
                    categoryMode === 'existing'
                      ? { ...payloadBase, categoryId }
                      : { ...payloadBase, categoryName: categoryName.trim() }

                  await updateProduct(product.id, payload)

                  navigate(`/products/${product.id}`)
                } catch (e2) {
                  const err = e2 as HttpError
                  const errors = err.errors?.map((x) => x.msg).filter(Boolean) || []
                  setFieldErrors(errors)
                  setError(err.message || 'Failed to update product')
                } finally {
                  setIsSubmitting(false)
                }
              }}
            >
              <div className="sl-field">
                <label className="sl-label" htmlFor="edit-title">
                  Title
                </label>
                <input
                  id="edit-title"
                  data-testid="edit-title"
                  className="sl-input"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={160}
                />
              </div>

              <div className="sl-field">
                <label className="sl-label" htmlFor="edit-description">
                  Description
                </label>
                <textarea
                  id="edit-description"
                  data-testid="edit-description"
                  className="sl-input"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={6}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div className="sl-field">
                <label className="sl-label" htmlFor="edit-price">
                  Price
                </label>
                <input
                  id="edit-price"
                  data-testid="edit-price"
                  className="sl-input"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>

              <div className="sl-field">
                <label className="sl-label">Category</label>
                <div className="sl-row">
                  <label className="sl-subtitle" style={{ margin: 0 }}>
                    <input
                      type="radio"
                      name="categoryMode"
                      value="existing"
                      checked={categoryMode === 'existing'}
                      onChange={() => setCategoryMode('existing')}
                    />{' '}
                    Select existing
                  </label>
                  <label className="sl-subtitle" style={{ margin: 0 }}>
                    <input
                      type="radio"
                      name="categoryMode"
                      value="new"
                      checked={categoryMode === 'new'}
                      onChange={() => setCategoryMode('new')}
                    />{' '}
                    Create new
                  </label>
                </div>

                {categoryMode === 'existing' ? (
                  <select
                    data-testid="edit-category-select"
                    className="sl-input"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    disabled={isLoadingCategories}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <>
                    <input
                      data-testid="edit-category-name"
                      className="sl-input"
                      type="text"
                      value={categoryName}
                      onChange={(e) => setCategoryName(e.target.value)}
                      placeholder="e.g. cameras"
                      maxLength={64}
                    />
                    <p className="sl-help">If the category doesn’t exist yet, we’ll create it.</p>
                  </>
                )}
              </div>

              <div className="sl-field">
                <label className="sl-label" htmlFor="edit-images">
                  Images (optional, up to 5)
                </label>
                <input
                  id="edit-images"
                  className="sl-input"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || [])
                    const remainingSlots = Math.max(0, 5 - images.length)
                    if (!remainingSlots) return
                    const nextFiles = files.slice(0, remainingSlots)
                    const nextImages = nextFiles.map((file) => ({
                      kind: 'local' as const,
                      file,
                      previewUrl: URL.createObjectURL(file)
                    }))
                    setImages((prev) => [...prev, ...nextImages])
                  }}
                />

                {images.length ? (
                  <div className="sl-row" style={{ alignItems: 'flex-start' }}>
                    {images.map((img, idx) => {
                      const src = img.kind === 'local' ? img.previewUrl : img.url
                      const alt = img.kind === 'local' ? img.file.name : `Existing image ${idx + 1}`
                      return (
                        <div key={`${img.kind}-${img.kind === 'local' ? img.previewUrl : img.publicId}`} className="sl-pill" style={{ flexDirection: 'column', gap: '0.6rem' }}>
                          <img
                            src={src}
                            alt={alt}
                            style={{ width: '12rem', height: '8rem', objectFit: 'cover', borderRadius: '0.8rem' }}
                          />
                          <button
                            className="sl-button"
                            type="button"
                            onClick={() => {
                              if (img.kind === 'local') URL.revokeObjectURL(img.previewUrl)
                              setImages((prev) => prev.filter((_, i) => i !== idx))
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      )
                    })}
                  </div>
                ) : null}
              </div>

              {fieldErrors.length ? (
                <div role="alert" data-testid="edit-errors">
                  {fieldErrors.map((msg) => (
                    <p key={msg} className="sl-error">
                      {msg}
                    </p>
                  ))}
                </div>
              ) : null}

              {error ? (
                <p className="sl-error" role="alert">
                  {error}
                </p>
              ) : null}

              <div className="sl-row">
                <button
                  data-testid="edit-submit"
                  className="sl-button sl-button--primary"
                  type="submit"
                  disabled={!canSubmit}
                >
                  {isSubmitting ? 'Saving…' : 'Save changes'}
                </button>
                <button className="sl-button" type="button" onClick={() => navigate(`/products/${product.id}`)} disabled={isSubmitting}>
                  Cancel
                </button>
              </div>
            </form>
          ) : null}
        </section>
      </div>
    </div>
  )
}

