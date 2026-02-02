import { Navigate, useLocation } from 'react-router-dom'

import { useAuth } from '../contexts/AuthContext'

export function ProtectedRoute({
  children,
  requireVerified
}: {
  children: React.ReactNode
  requireVerified?: boolean
}) {
  const { user, isLoading, resendVerification } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="sl-page">
        <div className="sl-container">
          <section className="sl-card" aria-label="Loading">
            <p className="sl-subtitle" style={{ margin: 0 }}>
              Loading…
            </p>
          </section>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (requireVerified && !user.isEmailVerified) {
    return (
      <div className="sl-page">
        <div className="sl-container">
          <header className="sl-header">
            <div>
              <h1 className="sl-h1">Email verification required</h1>
              <p className="sl-subtitle">Please verify your email before continuing.</p>
            </div>
          </header>

          <section className="sl-card" aria-label="Verification required">
            <p className="sl-subtitle" style={{ margin: 0 }}>
              We sent you a verification link when you registered. If you can’t find it, you can resend it.
            </p>
            <div className="sl-divider" />
            <div className="sl-row">
              <button
                className="sl-button sl-button--primary"
                type="button"
                onClick={() => resendVerification().catch(() => undefined)}
              >
                Resend verification email
              </button>
            </div>
          </section>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

