import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { useAuth } from '../contexts/AuthContext'
import { http, type HttpError } from '../services/http'

export function VerifyEmail() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const { refreshMe } = useAuth()

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState<string>('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Missing verification token.')
      return
    }

    ;(async () => {
      setStatus('loading')
      try {
        const res = await http<{ message: string }>('/api/auth/verify-email?token=' + encodeURIComponent(token))
        setMessage(res.message || 'Email verified.')
        setStatus('success')
        await refreshMe().catch(() => undefined)
      } catch (e) {
        const err = e as HttpError
        setMessage(err.message || 'Verification failed.')
        setStatus('error')
      }
    })()
  }, [token, refreshMe])

  return (
    <div className="sl-page">
      <div className="sl-container">
        <header className="sl-header">
          <div>
            <h1 className="sl-h1">Verify email</h1>
            <p className="sl-subtitle">Confirm your email address</p>
          </div>
        </header>

        <section className="sl-card" aria-label="Email verification">
          <p className="sl-subtitle" style={{ margin: 0 }}>
            {status === 'loading' ? 'Verifying…' : message || 'Ready.'}
          </p>

          <div className="sl-divider" />

          <div className="sl-row">
            <Link className="sl-button sl-button--primary" to="/profile">
              Go to profile
            </Link>
            <Link className="sl-button" to="/">
              Home
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}

