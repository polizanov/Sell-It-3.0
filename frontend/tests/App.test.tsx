import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'

import App from '../src/App'
import { AuthProvider } from '../src/contexts/AuthContext'
import { Home } from '../src/pages/Home'

describe('App', () => {
  it('renders the layout and home route', async () => {
    const router = createMemoryRouter(
      [
        {
          path: '/',
          element: <App />,
          children: [{ index: true, element: <Home /> }],
        },
      ],
      { initialEntries: ['/'] },
    )

    render(
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>,
    )

    expect(await screen.findByRole('link', { name: /sellit/i })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: /home/i })).toBeInTheDocument()
  })
})

