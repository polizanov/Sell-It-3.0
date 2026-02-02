import { useAuth } from '../contexts/AuthContext'

export function Profile() {
  const { user, logout, resendVerification } = useAuth()

  return (
    <div className="sl-page">
      <div className="sl-container">
        <header className="sl-header">
          <div>
            <h1 className="sl-h1">Profile</h1>
            <p className="sl-subtitle">Your account details</p>
          </div>
        </header>

        <section className="sl-card" aria-label="Profile">
          <div className="sl-row" style={{ justifyContent: 'space-between' }}>
            <div>
              <p className="sl-subtitle" style={{ margin: 0 }}>
                <strong>Email</strong>: <span className="sl-code">{user?.email}</span>
              </p>
              <p className="sl-subtitle" style={{ margin: '0.8rem 0 0 0' }}>
                <strong>Username</strong>: <span className="sl-code">{user?.username}</span>
              </p>
              <p className="sl-subtitle" style={{ margin: '0.8rem 0 0 0' }}>
                <strong>Email verified</strong>: <span className="sl-code">{user?.isEmailVerified ? 'yes' : 'no'}</span>
              </p>
            </div>

            <button className="sl-button" type="button" onClick={logout}>
              Logout
            </button>
          </div>

          {!user?.isEmailVerified ? (
            <>
              <div className="sl-divider" />
              <p className="sl-subtitle" style={{ margin: 0 }}>
                Please verify your email to unlock protected actions (e.g. creating products).
              </p>
              <div className="sl-row" style={{ marginTop: '1.2rem' }}>
                <button
                  className="sl-button sl-button--primary"
                  type="button"
                  onClick={() => resendVerification().catch(() => undefined)}
                >
                  Resend verification email
                </button>
              </div>
            </>
          ) : null}
        </section>
      </div>
    </div>
  )
}

