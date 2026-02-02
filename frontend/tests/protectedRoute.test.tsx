import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

let mockUser:
  | {
      email: string
      username: string
      profileImageUrl: string | null
      isEmailVerified: boolean
    }
  | null = null
let mockIsLoading = false
const resendVerification = jest.fn(async () => undefined)

jest.mock('../src/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    isLoading: mockIsLoading,
    resendVerification
  })
}))

import { ProtectedRoute } from '../src/components/ProtectedRoute'

describe('ProtectedRoute', () => {
  beforeEach(() => {
    resendVerification.mockClear()
    mockIsLoading = false
    mockUser = null
  })

  it('shows loading UI while auth state is loading', () => {
    mockIsLoading = true

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Secret</div>
        </ProtectedRoute>
      </MemoryRouter>
    )

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('blocks unverified users when requireVerified=true and allows resending verification', async () => {
    const user = userEvent.setup()
    mockUser = {
      email: 'jocewe6310@cimario.com',
      username: 'test',
      profileImageUrl: null,
      isEmailVerified: false
    }

    render(
      <MemoryRouter>
        <ProtectedRoute requireVerified>
          <div>Secret</div>
        </ProtectedRoute>
      </MemoryRouter>
    )

    expect(screen.getByRole('heading', { name: /email verification required/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /resend verification email/i }))
    expect(resendVerification).toHaveBeenCalledTimes(1)
  })

  it('renders children for verified users when requireVerified=true', () => {
    mockUser = {
      email: 'jocewe6310@cimario.com',
      username: 'test',
      profileImageUrl: null,
      isEmailVerified: true
    }

    render(
      <MemoryRouter>
        <ProtectedRoute requireVerified>
          <div>Secret</div>
        </ProtectedRoute>
      </MemoryRouter>
    )

    expect(screen.getByText('Secret')).toBeInTheDocument()
  })
})

