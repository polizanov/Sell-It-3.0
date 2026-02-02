import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

import { useAuth } from '../../contexts/AuthContext'

const NAV_LINKS: Array<{ to: string; label: string; auth?: 'anon' | 'authed' | 'any' }> = [
  { to: '/', label: 'Home' },
  { to: '/login', label: 'Login', auth: 'anon' },
  { to: '/register', label: 'Register', auth: 'anon' },
  { to: '/profile', label: 'Profile', auth: 'authed' },
  { to: '/products', label: 'All products' },
  { to: '/products/create', label: 'Create product', auth: 'authed' },
]

function getNavLinkClass(isActive: boolean) {
  return isActive ? 'sl-nav__link sl-nav__link--active' : 'sl-nav__link'
}

export function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const location = useLocation()
  const { user, logout } = useAuth()

  const burgerRef = useRef<HTMLButtonElement>(null)
  const mobilePanelRef = useRef<HTMLDivElement>(null)

  const closeMobileMenu = (opts?: { returnFocus?: boolean }) => {
    setIsMobileMenuOpen(false)
    if (opts?.returnFocus) {
      setTimeout(() => burgerRef.current?.focus(), 0)
    }
  }

  useEffect(() => {
    const t = window.setTimeout(() => closeMobileMenu(), 0)
    return () => window.clearTimeout(t)
  }, [location.pathname])

  useEffect(() => {
    if (!isMobileMenuOpen) return

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [isMobileMenuOpen])

  useEffect(() => {
    if (!isMobileMenuOpen) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeMobileMenu({ returnFocus: true })
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isMobileMenuOpen])

  useEffect(() => {
    if (!isMobileMenuOpen) return

    const panel = mobilePanelRef.current
    if (!panel) return

    const getFocusable = () =>
      Array.from(
        panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'),
      )

    const focusable = getFocusable()
    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    first?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      if (!first || !last) return

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
        return
      }

      if (document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    panel.addEventListener('keydown', onKeyDown)
    return () => panel.removeEventListener('keydown', onKeyDown)
  }, [isMobileMenuOpen])

  return (
    <nav className="sl-nav" aria-label="Main navigation">
      <div className="sl-nav__inner">
        <NavLink to="/" className="sl-nav__logo">
          SellIt
        </NavLink>

        <div className="sl-nav__links" aria-label="Primary links">
          {NAV_LINKS.filter((l) => {
            if (!l.auth || l.auth === 'any') return true
            if (l.auth === 'anon') return !user
            return Boolean(user)
          }).map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => getNavLinkClass(isActive)}>
              {l.label}
            </NavLink>
          ))}

          {user ? (
            <button className="sl-nav__link" type="button" onClick={logout}>
              Logout
            </button>
          ) : null}
        </div>

        <button
          ref={burgerRef}
          type="button"
          className={isMobileMenuOpen ? 'sl-nav__burger sl-nav__burger--open' : 'sl-nav__burger'}
          aria-label="Toggle navigation menu"
          aria-expanded={isMobileMenuOpen}
          aria-controls="sl-nav-mobile-menu"
          onClick={() => setIsMobileMenuOpen((v) => !v)}
        >
          <span className="sl-nav__burger-line" />
          <span className="sl-nav__burger-line" />
          <span className="sl-nav__burger-line" />
        </button>
      </div>

      {isMobileMenuOpen ? (
        <button
          type="button"
          className="sl-nav__overlay"
          aria-label="Close navigation menu"
          tabIndex={-1}
          onClick={() => closeMobileMenu({ returnFocus: true })}
        />
      ) : null}

      <div
        id="sl-nav-mobile-menu"
        ref={mobilePanelRef}
        className={isMobileMenuOpen ? 'sl-nav__panel sl-nav__panel--open' : 'sl-nav__panel'}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        aria-hidden={!isMobileMenuOpen}
      >
        <div className="sl-nav__panel-links">
          {NAV_LINKS.filter((l) => {
            if (!l.auth || l.auth === 'any') return true
            if (l.auth === 'anon') return !user
            return Boolean(user)
          }).map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) => getNavLinkClass(isActive)}
              onClick={() => closeMobileMenu()}
            >
              {l.label}
            </NavLink>
          ))}

          {user ? (
            <button
              className="sl-nav__link"
              type="button"
              onClick={() => {
                logout()
                closeMobileMenu({ returnFocus: true })
              }}
            >
              Logout
            </button>
          ) : null}
        </div>
      </div>
    </nav>
  )
}

