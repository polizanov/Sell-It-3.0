import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './styles/globals.css'
import App from './App.tsx'
import { AllProducts } from './pages/AllProducts'
import { CreateProduct } from './pages/CreateProduct'
import { Home } from './pages/Home'
import { Login } from './pages/Login'
import { Profile } from './pages/Profile'
import { Register } from './pages/Register'

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: 'login', element: <Login /> },
      { path: 'register', element: <Register /> },
      { path: 'profile', element: <Profile /> },
      { path: 'products', element: <AllProducts /> },
      { path: 'products/create', element: <CreateProduct /> },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
