import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useAuth } from '../contexts/AuthContext'
import type { HttpError } from '../services/http'

export function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  return (
    <div className="sl-page">
      <div className="sl-container">
        <header className="sl-header">
          <div>
            <h1 className="sl-h1">Register</h1>
            <p className="sl-subtitle">Create a new account</p>
          </div>
        </header>

        <section className="sl-card" aria-label="Register">
          <form
            className="sl-form"
            onSubmit={async (e) => {
              e.preventDefault()
              setError(null)
              setIsSubmitting(true)
              try {
                await register({
                  email,
                  password,
                  username: username.trim()
                })
                navigate('/profile')
              } catch (e2) {
                const err = e2 as HttpError
                setError(err.message || 'Registration failed')
              } finally {
                setIsSubmitting(false)
              }
            }}
          >
            <div className="sl-field">
              <label className="sl-label" htmlFor="register-email">
                Email
              </label>
              <input
                id="register-email"
                className="sl-input"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="sl-field">
              <label className="sl-label" htmlFor="register-username">
                Username
              </label>
              <input
                id="register-username"
                className="sl-input"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                minLength={3}
                maxLength={32}
                required
              />
              <p className="sl-help">You can change this later in profile settings.</p>
            </div>

            <div className="sl-field">
              <label className="sl-label" htmlFor="register-password">
                Password
              </label>
              <input
                id="register-password"
                className="sl-input"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
              <p className="sl-help">We’ll email you a verification link after registration.</p>
            </div>

            {error ? (
              <p className="sl-error" role="alert">
                {error}
              </p>
            ) : null}

            <div className="sl-row">
              <button className="sl-button sl-button--primary" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating account…' : 'Create account'}
              </button>
              <p className="sl-subtitle" style={{ margin: 0 }}>
                Already have an account? <Link to="/login">Login</Link>
              </p>
            </div>
          </form>
        </section>
      </div>
    </div>
  )
}

