import { Outlet } from 'react-router-dom'

import { Navigation } from '../components/Navigation/Navigation.tsx'

export function AppLayout() {
  return (
    <>
      <Navigation />
      <main className="sl-main" id="main">
        <Outlet />
      </main>
    </>
  )
}

