---
name: refactor-all-products-pagination
overview: Refactor the All Products page to load products in pages of 9 items and sort newest-first, using URL-driven pagination and a paginated backend endpoint.
todos:
  - id: backend-paginate-products
    content: Add page/limit query params to GET /api/products and return {products,page,limit,total,totalPages} sorted by publishedAt desc.
    status: completed
  - id: frontend-fetch-paginated
    content: Update AllProducts page to read page from URL and fetch /api/products?page=…&limit=9.
    status: completed
  - id: frontend-pagination-ui
    content: Add Prev/Next + page indicator; keep created-title banner.
    status: completed
  - id: polish-types-styles
    content: Refactor types (optional shared DTO) and minimize inline styles while following REM/BEM rules where applicable.
    status: completed
isProject: false
---

## Goal

- Update the “All products” page (`/products`) to **list all products 9 per page** and **sort newest-first**.

## What exists today (baseline)

- Frontend page `[frontend/src/pages/AllProducts.tsx](frontend/src/pages/AllProducts.tsx)` fetches **all** products via `GET /api/products` and renders them without pagination.
- Backend route `[backend/src/routes/product.routes.ts](backend/src/routes/product.routes.ts)` implements `GET /` with `.sort({ publishedAt: -1 })` (already **newest-first**) but no paging; it returns `{ products: [...] }`.

## Approach

### Backend: add pagination to `GET /api/products`

- Extend `GET /api/products` in `[backend/src/routes/product.routes.ts](backend/src/routes/product.routes.ts)` to accept query params:
  - `page` (default `1`, min `1`)
  - `limit` (default `9`, min `1`, max `50`)
- Implement:
  - `skip = (page - 1) * limit`
  - Query uses `sort({ publishedAt: -1 })` (as today), plus `.skip(skip).limit(limit)`.
  - Add a `total` count via `Product.countDocuments({})` (same filter as the list query).
- Response shape becomes:
  - `{ products, page, limit, total, totalPages }`
- Keep mapping logic for category population (reuse existing `isPopulatedCategory` mapping).

### Frontend: URL-driven pagination and 9-per-page fetching

- Update `[frontend/src/pages/AllProducts.tsx](frontend/src/pages/AllProducts.tsx)` to:
  - Read `page` from the URL query string (e.g. `/products?page=2`) using `useSearchParams`.
  - Fetch `GET /api/products?page=<page>&limit=9`.
  - Render pagination controls:
    - Previous / Next buttons (disabled at bounds)
    - Current page indicator (e.g. “Page 2 of 7”)
  - Preserve the existing “Created ” message via `location.state`.
- Add/adjust TypeScript types:
  - Define a paginated response type locally or reuse `ProductDto` from `[frontend/src/services/products.ts](frontend/src/services/products.ts)` by exporting a shared type.

### Styling/refactor hygiene

- Keep using existing `sl-*` utility classes.
- Reduce inline styles where it’s easy and move to a small CSS module/file if needed; follow workspace CSS rules (REM units, no horizontal overflow, BEM if new classes are introduced).

## Verification

- Manually verify:
  - `/products` loads page 1 with **9 products**.
  - Navigating to `/products?page=2` loads the next 9.
  - Ordering is newest-first (published dates descending).
  - Prev/Next bounds behave correctly.
  - Empty state still works when there are no products.

## Files to change

- `[backend/src/routes/product.routes.ts](backend/src/routes/product.routes.ts)`
- `[frontend/src/pages/AllProducts.tsx](frontend/src/pages/AllProducts.tsx)`
- (Optional) `[frontend/src/services/products.ts](frontend/src/services/products.ts)` if we centralize shared product/pagination types.

