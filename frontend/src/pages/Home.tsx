import { useState } from 'react'

import { http } from '../services/http'

export function Home() {
  const [count, setCount] = useState(0)
  const [apiStatus, setApiStatus] = useState<string | null>(null)

  return (
    <div className="sl-page">
      <div className="sl-container">
        <header className="sl-header">
          <div>
            <h1 className="sl-h1">Home</h1>
            <p className="sl-subtitle">Welcome to SellIt</p>
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
                  const res = await http<{ status: string }>('/api/health')
                  setApiStatus(res.status ?? 'unknown')
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
            API status: <span className="sl-code">{apiStatus ?? 'unknown (not checked yet)'}</span>
          </p>
        </section>
      </div>
    </div>
  )
}

