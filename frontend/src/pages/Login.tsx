import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useAuth } from '../contexts/AuthContext'
import type { HttpError } from '../services/http'

export function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  return (
    <div className="sl-page">
      <div className="sl-container">
        <header className="sl-header">
          <div>
            <h1 className="sl-h1">Login</h1>
            <p className="sl-subtitle">Sign in to your account</p>
          </div>
        </header>

        <section className="sl-card" aria-label="Login">
          <form
            className="sl-form"
            onSubmit={async (e) => {
              e.preventDefault()
              setError(null)
              setIsSubmitting(true)
              try {
                await login({ email, password })
                navigate('/profile')
              } catch (e2) {
                const err = e2 as HttpError
                setError(err.message || 'Login failed')
              } finally {
                setIsSubmitting(false)
              }
            }}
          >
            <div className="sl-field">
              <label className="sl-label" htmlFor="login-email">
                Email
              </label>
              <input
                id="login-email"
                className="sl-input"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="sl-field">
              <label className="sl-label" htmlFor="login-password">
                Password
              </label>
              <input
                id="login-password"
                className="sl-input"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>

            {error ? (
              <p className="sl-error" role="alert">
                {error}
              </p>
            ) : null}

            <div className="sl-row">
              <button className="sl-button sl-button--primary" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Signing in…' : 'Sign in'}
              </button>
              <p className="sl-subtitle" style={{ margin: 0 }}>
                No account? <Link to="/register">Register</Link>
              </p>
            </div>
          </form>
        </section>
      </div>
    </div>
  )
}

