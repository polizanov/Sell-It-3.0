---
name: frontend_static_pages_navigation
overview: Add 6 static frontend pages and a responsive navigation bar with a mobile burger menu, using the existing React Router setup and the project’s dark-only token-based styling.
todos:
  - id: router-layout
    content: Create `AppLayout` with `<Navigation />` + `<Outlet />`, and update `frontend/src/main.tsx` to define nested routes for the 6 pages.
    status: completed
  - id: pages
    content: Add the 6 static page components under `frontend/src/pages/`, moving current `App.tsx` demo UI into `Home.tsx`.
    status: completed
  - id: navigation
    content: Implement `Navigation.tsx` with `NavLink`s, burger menu state, close behaviors (route change/Escape/click-outside), and basic focus management.
    status: completed
  - id: styling
    content: Add `frontend/src/styles/navigation.css` with BEM classes and responsive mobile menu styles using existing tokens/rem units; import it from `globals.css`.
    status: completed
  - id: lint-check
    content: Run targeted lint check on the modified/new frontend files and fix any issues introduced by the changes.
    status: completed
isProject: false
---

## Current state (what we’ll build on)

- Routing is already set up with React Router in `[frontend/src/main.tsx](frontend/src/main.tsx)`:

```1:13:/Users/d.polizanov/Documents/Projects/sellit-cursor/frontend/src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './styles/globals.css'
import App from './App.tsx'

const router = createBrowserRouter([{ path: '/', element: <App /> }])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
```

- The current `App` is a single-page demo UI and can be repurposed as the `Home` page:

```1:55:/Users/d.polizanov/Documents/Projects/sellit-cursor/frontend/src/App.tsx
import { useState } from 'react'

import { api } from './services/api'

function App() {
  const [count, setCount] = useState(0)
  const [apiStatus, setApiStatus] = useState<string | null>(null)

  return (
    <div className="sl-page">
      <div className="sl-container">
        <header className="sl-header">
          <div>
            <h1 className="sl-h1">SellIt</h1>
            <p className="sl-subtitle">Dark-only UI (black + orange)</p>
          </div>
          <span className="sl-pill">
            <strong>Theme</strong> Dark
          </span>
        </header>

        <section className="sl-card" aria-label="Demo controls">
          <div className="sl-row">
            <button
              className="sl-button sl-button--primary"
              onClick={async () => {
                try {
                  const res = await api.get('/api/health')
                  setApiStatus(res.data?.status ?? 'unknown')
                } catch {
                  setApiStatus('error')
                }
              }}
            >
              Check API
            </button>

            <button className="sl-button" onClick={() => setCount((c) => c + 1)}>
              Count: <span className="sl-code">{count}</span>
            </button>
          </div>

          <div className="sl-divider" />

          <p className="sl-subtitle">
            API status:{' '}
            <span className="sl-code">{apiStatus ?? 'unknown (not checked yet)'}</span>
          </p>
        </section>
      </div>
    </div>
  )
}
```

## Target UX

- **Top navigation** visible on all pages.
- **Desktop/tablet**: horizontal links.
- **Mobile**: burger button toggles a full-height overlay/panel menu.
- **Usability/accessibility**:
  - `aria-expanded`, `aria-controls`, `aria-label` on burger button
  - closes on route change, `Escape`, and click outside/overlay
  - keyboard tabbing stays within the open menu (simple focus trap)
  - active link highlighting.

## Routes and pages

We’ll add static pages and routes:

- `/` → Home
- `/login` → Login
- `/register` → Register
- `/profile` → Profile
- `/products` → All products
- `/products/create` → Create product

## Files we’ll add

- `[frontend/src/layouts/AppLayout.tsx](frontend/src/layouts/AppLayout.tsx)`
  - Renders `<Navigation />` + a `<main>` with `<Outlet />`.
- `[frontend/src/components/Navigation/Navigation.tsx](frontend/src/components/Navigation/Navigation.tsx)`
  - Links + burger menu behavior.
- `[frontend/src/pages/Home.tsx](frontend/src/pages/Home.tsx)`
  - Contains (or closely matches) today’s `App.tsx` demo content.
- `[frontend/src/pages/Login.tsx](frontend/src/pages/Login.tsx)`
- `[frontend/src/pages/Register.tsx](frontend/src/pages/Register.tsx)`
- `[frontend/src/pages/Profile.tsx](frontend/src/pages/Profile.tsx)`
- `[frontend/src/pages/AllProducts.tsx](frontend/src/pages/AllProducts.tsx)`
- `[frontend/src/pages/CreateProduct.tsx](frontend/src/pages/CreateProduct.tsx)`
- `[frontend/src/styles/navigation.css](frontend/src/styles/navigation.css)`
  - BEM-style classes (block: `.sl-nav`, elements like `.sl-nav__link`), using existing tokens/rem units.

## Files we’ll modify

- `[frontend/src/main.tsx](frontend/src/main.tsx)`
  - Replace the single `App` route with a nested router using `AppLayout` + child page routes.
- `[frontend/src/App.tsx](frontend/src/App.tsx)`
  - Simplify to either `export default function App(){ return <Outlet/> }` (if we keep it), or leave unused; the plan will favor **keeping** it minimal to reduce churn.
- `[frontend/src/styles/globals.css](frontend/src/styles/globals.css)`
  - Import `navigation.css` (keeping global file small), and optionally add a couple utility layout rules for `<main>` spacing if needed.

## Implementation notes (important details)

- **Styling**: follow existing tokens in `[frontend/src/styles/tokens.css](frontend/src/styles/tokens.css)` and global rem sizing rules already present in `globals.css`.
- **No horizontal scrolling**: keep overlay/panel menu widths responsive (`width: 100%`, `max-width` where applicable).
- **Active link**: use `NavLink` so active styles are automatic.

## Verification

- Navigate to each route via nav links.
- Resize to mobile width and confirm:
  - burger toggles open/close
  - `Escape` closes
  - clicking a link closes
  - focus remains usable via keyboard
  - active link styling is correct.

