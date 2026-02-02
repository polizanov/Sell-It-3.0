import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { http, type HttpError } from '../services/http'

type Category = { id: string; name: string }

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

type LocalImage = {
  file: File
  previewUrl: string
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

export function CreateProduct() {
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')

  const [categories, setCategories] = useState<Category[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)

  const [categoryMode, setCategoryMode] = useState<'existing' | 'new'>('existing')
  const [categoryId, setCategoryId] = useState('')
  const [categoryName, setCategoryName] = useState('')

  const [images, setImages] = useState<LocalImage[]>([])

  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    ;(async () => {
      setIsLoadingCategories(true)
      try {
        const res = await http<{ categories: Category[] }>('/api/categories')
        setCategories(res.categories)
        if (res.categories.length && !categoryId) setCategoryId(res.categories[0].id)
      } finally {
        setIsLoadingCategories(false)
      }
    })().catch(() => {
      setIsLoadingCategories(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.previewUrl))
    }
  }, [images])

  const canSubmit = useMemo(() => !isSubmitting, [isSubmitting])

  return (
    <div className="sl-page">
      <div className="sl-container">
        <header className="sl-header">
          <div>
            <h1 className="sl-h1">Create product</h1>
            <p className="sl-subtitle">Post a new listing</p>
          </div>
        </header>

        <section className="sl-card" aria-label="Create product page">
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
                  images.length > 0 ? await Promise.all(images.map((img) => uploadToCloudinary(img.file))) : undefined

                type CreateProductPayloadBase = {
                  title: string
                  description: string
                  price: number
                }
                type CreateProductPayload =
                  | (CreateProductPayloadBase & { categoryId: string; categoryName?: never })
                  | (CreateProductPayloadBase & { categoryName: string; categoryId?: never })
                const payload: CreateProductPayload =
                  categoryMode === 'existing'
                    ? { title: title.trim(), description: description.trim(), price: priceNumber, categoryId }
                    : {
                        title: title.trim(),
                        description: description.trim(),
                        price: priceNumber,
                        categoryName: categoryName.trim()
                      }

                const payloadWithImages =
                  uploadedImages?.length ? { ...payload, images: uploadedImages } : payload

                const res = await http<{ product: ProductDto }>('/api/products', {
                  method: 'POST',
                  body: JSON.stringify(payloadWithImages)
                })

                navigate('/products', { state: { justCreatedTitle: res.product.title } })
              } catch (e2) {
                const err = e2 as HttpError
                const errors = err.errors?.map((x) => x.msg).filter(Boolean) || []
                setFieldErrors(errors)
                setError(err.message || 'Failed to create product')
              } finally {
                setIsSubmitting(false)
              }
            }}
          >
            <div className="sl-field">
              <label className="sl-label" htmlFor="create-title">
                Title
              </label>
              <input
                id="create-title"
                data-testid="create-title"
                className="sl-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={160}
              />
            </div>

            <div className="sl-field">
              <label className="sl-label" htmlFor="create-description">
                Description
              </label>
              <textarea
                id="create-description"
                data-testid="create-description"
                className="sl-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                style={{ resize: 'vertical' }}
              />
            </div>

            <div className="sl-field">
              <label className="sl-label" htmlFor="create-price">
                Price
              </label>
              <input
                id="create-price"
                data-testid="create-price"
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
                  data-testid="create-category-select"
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
                    data-testid="create-category-name"
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
              <label className="sl-label" htmlFor="create-images">
                Images (optional, up to 5)
              </label>
              <input
                id="create-images"
                className="sl-input"
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []).slice(0, 5)
                  images.forEach((img) => URL.revokeObjectURL(img.previewUrl))
                  setImages(
                    files.map((file) => ({
                      file,
                      previewUrl: URL.createObjectURL(file)
                    }))
                  )
                }}
              />
              {images.length ? (
                <div className="sl-row" style={{ alignItems: 'flex-start' }}>
                  {images.map((img, idx) => (
                    <div key={img.previewUrl} className="sl-pill" style={{ flexDirection: 'column', gap: '0.6rem' }}>
                      <img
                        src={img.previewUrl}
                        alt={img.file.name}
                        style={{ width: '12rem', height: '8rem', objectFit: 'cover', borderRadius: '0.8rem' }}
                      />
                      <button
                        className="sl-button"
                        type="button"
                        onClick={() => {
                          URL.revokeObjectURL(img.previewUrl)
                          setImages((prev) => prev.filter((_, i) => i !== idx))
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            {fieldErrors.length ? (
              <div role="alert" data-testid="create-errors">
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
                data-testid="create-submit"
                className="sl-button sl-button--primary"
                type="submit"
                disabled={!canSubmit}
              >
                {isSubmitting ? 'Creating…' : 'Create product'}
              </button>
              <button className="sl-button" type="button" onClick={() => navigate('/products')} disabled={isSubmitting}>
                Cancel
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  )
}

