---
name: add-product-flow
overview: Implement end-to-end “Add Product” feature with verified-user enforcement, Product/Category persistence, Cloudinary (unsigned direct uploads), and Playwright E2E coverage for valid/invalid submissions.
todos:
  - id: backend-models
    content: Add `Category` + `Product` mongoose models (with required fields, images max 5, publishedAt) and category seeding for 5 defaults.
    status: pending
  - id: backend-routes
    content: Implement `/api/categories` and `/api/products` routes with `authenticate` + `requireVerified` and express-validator request validation; mount routes in `backend/src/app.ts`.
    status: pending
  - id: cloudinary-frontend
    content: Implement `CreateProduct` form + optional Cloudinary unsigned upload flow using `VITE_CLOUDINARY_CLOUD_NAME`/`VITE_CLOUDINARY_UPLOAD_PRESET` and submit JSON to backend.
    status: pending
  - id: product-list-ui
    content: Implement `AllProducts` page fetching `/api/products` for basic listing + E2E assertions.
    status: pending
  - id: e2e-playwright
    content: Add root Playwright config to run `npm run dev` and add E2E tests for valid/invalid create product; add backend test-utils routes gated by `ENABLE_TEST_UTILS=true`.
    status: pending
isProject: false
---

# Add product functionality (verified users only)

## Current integration points (already in repo)

- Frontend already protects the route `products/create` with `requireVerified` via `ProtectedRoute`.

```33:41:/Users/d.polizanov/Documents/Projects/sellit-cursor/frontend/src/main.tsx
      {
        path: 'products/create',
        element: (
          <ProtectedRoute requireVerified>
            <CreateProduct />
          </ProtectedRoute>
        )
      }
```

- Backend has auth middleware that attaches `req.user.id` from a JWT.

```13:29:/Users/d.polizanov/Documents/Projects/sellit-cursor/backend/src/middleware/authenticate.ts
export const authenticate: RequestHandler = (req, res, next) => {
  const header = req.header('authorization');
  if (!header) return res.status(401).json({ message: 'Missing Authorization header' });

  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Invalid Authorization header' });
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub };
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};
```

## Backend changes

### API surface

- **POST** `/api/products`
  - **Auth**: must be logged in **and** `isEmailVerified=true`.
  - **Body** (all required except images):
    - `title` (string)
    - `description` (string)
    - `price` (number)
    - `categoryId` (string) OR `categoryName` (string). If `categoryName` doesn’t exist yet, create it.
    - `images?: Array<{ url: string; publicId: string }>` (optional, max 5)
  - **Returns**: created product.
- **GET** `/api/products` (for UI + E2E assertions)
  - Optional query later; initially return newest-first.
- **GET** `/api/categories`
  - Returns list of categories (defaults + user-created).

### Data models

- Add `backend/src/models/Category.ts`
  - Fields: `name` (required). No other fields (no `key`, no timestamps).
  - Uniqueness/lookup: use a case-insensitive match on `name` for “find-or-create” during product creation.
  - Seed initial 5 categories: `clothes`, `shoes`, `phones`, `tablets`, `laptops`.
- Add `backend/src/models/Product.ts`
  - Fields:
    - `sellerId` (ref `User`, required)
    - `title` (required)
    - `description` (required)
    - `price` (required)
    - `categoryId` (ref `Category`, required)
    - `images` (optional array, max 5)
    - `publishedAt` (required; default `Date.now`)

### Enforcement & validation

- Add middleware `backend/src/middleware/requireVerified.ts`
  - After `authenticate`, load `User` by `req.user.id`, ensure `user.isEmailVerified === true`, else 403.
- Add routes:
  - `backend/src/routes/product.routes.ts`
  - `backend/src/routes/category.routes.ts`
- Register routes in `backend/src/app.ts`.
- Validation via `express-validator`:
  - Require `title`, `description`, `price`.
  - Require exactly one of `categoryId`/`categoryName`.
  - If `images` provided: must be array length 1–5 (or 0–5 if you allow empty), each object must include `url` and `publicId`.

### Category seeding

- Add a small seed function `backend/src/services/categorySeed.service.ts` (or similar).
- Call it from `backend/src/server.ts` right after `connectToDatabase()` so defaults exist in dev/prod and tests.

### Test utilities (to make Playwright E2E feasible)

Email verification is email-driven in dev, so E2E needs a deterministic way to get a verified session.

- Add `backend/src/routes/testUtils.routes.ts` and mount it **only when** `process.env.ENABLE_TEST_UTILS === 'true'`.
  - **POST** `/api/test-utils/create-verified-user` → returns `{ token, user }` with `isEmailVerified=true`.
  - **POST** `/api/test-utils/reset` → clears products and non-default categories (keeps defaults) for repeatable runs.

## Frontend changes

### Create Product page

- Implement real form in `frontend/src/pages/CreateProduct.tsx`:
  - Title, description, price.
  - Category selector backed by `GET /api/categories` plus “Create new category” input (shown when category not found / or via toggle).
  - Images (optional): multi-file picker, limit 5, preview list, remove image.

### Cloudinary (unsigned direct uploads)

- Frontend uploads selected images directly to Cloudinary and then submits product JSON to backend.
- Add Vite env vars (placeholders; you’ll fill values later):
  - `VITE_CLOUDINARY_CLOUD_NAME`
  - `VITE_CLOUDINARY_UPLOAD_PRESET`
- Implementation:
  - For each file, POST `FormData` to Cloudinary upload endpoint and collect `{ secure_url, public_id }`.
  - Send backend `images: [{ url: secure_url, publicId: public_id }]`.
- No backend multipart is needed (backend stays JSON-only).

### Products list (minimal)

- Replace placeholder in `frontend/src/pages/AllProducts.tsx` with a simple list using `GET /api/products` so E2E can assert the created item is visible.

## Playwright E2E

### Setup

- Add Playwright at monorepo root (so it can start both servers using the existing root `npm run dev`).
- Create `playwright.config.ts` at repo root:
  - `webServer.command`: `npm run dev`
  - `webServer.url`: `http://localhost:5173`
  - `reuseExistingServer`: true
  - set env `ENABLE_TEST_UTILS=true` for the webServer process

### Tests

- Add `e2e/product-create.spec.ts`:
  - Use test utils to obtain a verified user token.
  - Set `localStorage.sellit_token` in the browser context.
  - Go to `/products/create`, fill valid fields (skip images to avoid Cloudinary dependency), submit.
  - Assert success UI + product appears in `/products` list.
- Add `e2e/product-create-invalid.spec.ts`:
  - Verified session.
  - Submit with missing fields / invalid price.
  - Assert validation errors rendered and no navigation.

## Notes / constraints

- **Verified enforcement is server-side** (not only UI), via `requireVerified`.
- **Images are optional** and capped at 5.
- **All other fields are required**.
- **Category creation is supported inline** during product creation.

