import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'

import App from '../src/App'
import { Home } from '../src/pages/Home'

describe('App', () => {
  it('renders the layout and home route', () => {
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

    render(<RouterProvider router={router} />)

    expect(screen.getByRole('link', { name: /sellit/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /home/i })).toBeInTheDocument()
  })
})

