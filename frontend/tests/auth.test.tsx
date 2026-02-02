import { render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'

import { AuthProvider } from '../src/contexts/AuthContext'
import App from '../src/App'
import { Login } from '../src/pages/Login'
import { Profile } from '../src/pages/Profile'
import { VerifyEmail } from '../src/pages/VerifyEmail'
import { ProtectedRoute } from '../src/components/ProtectedRoute'

describe('auth routing', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('redirects unauthenticated users from protected route to login', async () => {
    const router = createMemoryRouter(
      [
        {
          path: '/',
          element: <App />,
          children: [
            { path: 'login', element: <Login /> },
            {
              path: 'profile',
              element: (
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              )
            }
          ]
        }
      ],
      { initialEntries: ['/profile'] }
    )

    render(
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    )

    expect(await screen.findByRole('heading', { name: /login/i })).toBeInTheDocument()
  })

  it('shows success message after verify-email call', async () => {
    // Minimal fetch mock for verify endpoint.
    const fetchMock = jest.fn(async (): Promise<Response> => {
      return new Response(JSON.stringify({ message: 'Email verified' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    })
    ;(globalThis as unknown as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch

    const router = createMemoryRouter(
      [
        {
          path: '/',
          element: <App />,
          children: [{ path: 'verify-email', element: <VerifyEmail /> }]
        }
      ],
      { initialEntries: ['/verify-email?token=abc'] }
    )

    render(
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText(/email verified/i)).toBeInTheDocument()
    })

    expect(fetchMock).toHaveBeenCalled()
  })

  it('shows error when verify-email token is missing (no request made)', async () => {
    const fetchMock = jest.fn()
    ;(globalThis as unknown as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch

    const router = createMemoryRouter(
      [
        {
          path: '/',
          element: <App />,
          children: [{ path: 'verify-email', element: <VerifyEmail /> }]
        }
      ],
      { initialEntries: ['/verify-email'] }
    )

    render(
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    )

    expect(await screen.findByText(/missing verification token/i)).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows backend error message when verify-email fails', async () => {
    const fetchMock = jest.fn(async (): Promise<Response> => {
      return new Response(JSON.stringify({ message: 'Invalid or expired verification token' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    })
    ;(globalThis as unknown as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch

    const router = createMemoryRouter(
      [
        {
          path: '/',
          element: <App />,
          children: [{ path: 'verify-email', element: <VerifyEmail /> }]
        }
      ],
      { initialEntries: ['/verify-email?token=badtoken'] }
    )

    render(
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    )

    expect(await screen.findByText(/invalid or expired verification token/i)).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalled()
  })
})

