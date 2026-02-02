---
name: dark_only_black_orange_style
overview: Remove Vite/React template CSS and implement a dark-only black+orange style guide (CSS variables + minimal global styles), with no light theme or theme toggle.
todos:
  - id: remove-template-css-usage
    content: Remove starter imports/usages of `frontend/src/index.css` and `frontend/src/App.css` by updating `main.tsx` and `App.tsx`.
    status: completed
  - id: add-dark-tokens
    content: Create `frontend/src/styles/tokens.css` with `--sl-` semantic tokens for a dark-only black+orange palette, plus spacing/typography/radius/motion.
    status: completed
  - id: add-global-styles
    content: "Create `frontend/src/styles/globals.css` that imports tokens and sets `color-scheme: dark`, base body/link/button/focus styles."
    status: completed
  - id: delete-template-css-files
    content: Delete `frontend/src/index.css` and `frontend/src/App.css` once unused.
    status: completed
  - id: verify
    content: Run frontend lint/test/build to verify no regressions.
    status: completed
isProject: false
---

## Goal

- Remove the starter Vite/React CSS (`frontend/src/index.css`, `frontend/src/App.css`) and the template UI that relies on them.
- Define a **single dark theme only** (no light theme, no toggle) using a **black + orange** design system.

## What we have today (key touch points)

- Global CSS imported in `frontend/src/main.tsx` via `import './index.css'`.
- Component CSS imported in `frontend/src/App.tsx` via `import './App.css'` and template classNames (`logo`, `card`, `read-the-docs`).

## Dark-only style guide (black + orange)

- **Principles**
  - One theme: **dark only**.
  - Use **semantic tokens** (components never hardcode hex values).
  - Keep the global layer small: typography, page background, link/button defaults, focus ring.
- **Token naming**
  - Prefix all variables with `--sl-`.
  - Use semantic names: `--sl-bg`, `--sl-fg`, `--sl-surface`, `--sl-border`, `--sl-primary`, `--sl-primary-hover`, `--sl-focus-ring`, etc.
- **Palette direction (black + orange)**
  - Background: near-black (`--sl-bg`)
  - Surfaces: slightly lifted dark grays (`--sl-surface`, `--sl-surface-2`)
  - Text: off-white + muted gray (`--sl-fg`, `--sl-muted`)
  - Accent: orange for primary actions/links (`--sl-primary`)
  - Borders: subtle dark border (`--sl-border`)
  - Focus: orange-tinted focus ring (`--sl-focus-ring`)

## File changes (planned)

- **Add** `frontend/src/styles/tokens.css`
  - Define:
    - Foundational tokens: font, spacing, radius, shadows, motion
    - Dark semantic color tokens for black+orange
- **Add** `frontend/src/styles/globals.css`
  - `@import './tokens.css';`
  - Apply base styles:
    - `:root { color-scheme: dark; }`
    - `body { margin:0; background: var(--sl-bg); color: var(--sl-fg); font-family: var(--sl-font-sans); }`
    - `a` uses `--sl-primary`
    - `button` baseline styling using tokens
    - `:focus-visible` uses `--sl-focus-ring`
- **Update** `frontend/src/main.tsx`
  - Replace `import './index.css'` with `import './styles/globals.css'`.
- **Update** `frontend/src/App.tsx`
  - Remove `import './App.css'`.
  - Remove Vite template markup (logos/counter card styling) and replace with a minimal dark app shell that uses tokens (header, container, primary button, secondary button, small status text).
- **Delete**
  - `frontend/src/index.css`
  - `frontend/src/App.css`

## Validation

- Ensure TypeScript and Jest still compile after CSS import changes.
- Run:
  - `frontend` → `npm run build`
  - `frontend` → `npm test`
  - `frontend` → `npm run lint`

## Out of scope (unless you ask)

- Adding a component library (Tailwind, MUI, etc.)
- Creating a full page/layout system beyond the minimal app shell

