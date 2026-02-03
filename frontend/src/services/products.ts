import { http } from './http'

export type ProductDto = {
  id: string
  sellerId: string
  title: string
  description: string
  price: number
  category: { id: string; name: string }
  images: Array<{ url: string; publicId: string }>
  publishedAt: string
}

export type ProductDetailsDto = ProductDto & {
  likedUsers: string[]
  favoritesCount: number
}

export type FavoriteDto = {
  isFavorited: boolean
  favoritesCount: number
  likedUsers: string[]
}

type ProductPayloadBase = {
  title: string
  description: string
  price: number
  images?: Array<{ url: string; publicId: string }>
}

export type UpdateProductPayload =
  | (ProductPayloadBase & { categoryId: string; categoryName?: never })
  | (ProductPayloadBase & { categoryName: string; categoryId?: never })

export type ProductsListResponse = {
  products: ProductDto[]
  page: number
  limit: number
  total: number
  totalPages: number
}

export async function getProductById(id: string) {
  const res = await http<{ product: ProductDetailsDto }>(`/api/products/${id}`)
  return res.product
}

export async function getMyProducts(args: { page: number; limit: number }) {
  const qs = new URLSearchParams({ page: String(args.page), limit: String(args.limit) })
  return http<ProductsListResponse>(`/api/products/mine?${qs.toString()}`)
}

export async function getMyFavorites(args: { page: number; limit: number }) {
  const qs = new URLSearchParams({ page: String(args.page), limit: String(args.limit) })
  return http<ProductsListResponse>(`/api/products/favorites?${qs.toString()}`)
}

export async function updateProduct(id: string, payload: UpdateProductPayload) {
  const res = await http<{ product: ProductDto }>(`/api/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  })
  return res.product
}

export async function deleteProduct(id: string) {
  const res = await http<{ ok: boolean }>(`/api/products/${id}`, { method: 'DELETE' })
  return res.ok
}

export async function favoriteProduct(id: string) {
  const res = await http<{ favorite: FavoriteDto }>(`/api/products/${id}/favorite`, { method: 'POST' })
  return res.favorite
}

export async function unfavoriteProduct(id: string) {
  const res = await http<{ favorite: FavoriteDto }>(`/api/products/${id}/favorite`, { method: 'DELETE' })
  return res.favorite
}

