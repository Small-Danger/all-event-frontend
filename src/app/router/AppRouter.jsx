import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { appRoutes } from './routeConfig'

const router = createBrowserRouter(appRoutes)

export function AppRouter() {
  return <RouterProvider router={router} />
}
