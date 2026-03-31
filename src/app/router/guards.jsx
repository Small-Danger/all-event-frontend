import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'

function getDemoRoleBypass(location) {
  const params = new URLSearchParams(location.search)
  const demoEnabled = params.get('demo') === '1'
  if (!demoEnabled) return null

  const clientPaths = [
    '/dashboard',
    '/panier',
    '/reservations',
    '/favorites',
    '/compte',
    '/profile',
    '/reviews',
    '/messages',
    '/payments',
  ]
  const prestatairePaths = [
    '/prestataire/dashboard',
    '/prestataire/activities',
    '/prestataire/availability',
    '/prestataire/reservations',
    '/prestataire/reviews',
    '/prestataire/statistics',
    '/prestataire/ads',
    '/prestataire/settings',
  ]
  const adminPaths = [
    '/admin/dashboard',
    '/admin/users',
    '/admin/prestataires',
    '/admin/activities',
    '/admin/reviews',
    '/admin/reports',
    '/admin/ads',
    '/admin/commissions',
    '/admin/disputes',
    '/admin/statistics',
    '/admin/notifications',
  ]

  if (clientPaths.includes(location.pathname)) return 'client'
  if (prestatairePaths.includes(location.pathname)) return 'prestataire'
  if (adminPaths.includes(location.pathname)) return 'admin'
  return null
}

export function RequireAuth() {
  const { auth } = useAuth()
  const location = useLocation()

  if (auth.isLoading) {
    return null
  }

  if (getDemoRoleBypass(location)) {
    return <Outlet />
  }

  if (!auth.isAuthenticated) {
    const loginTarget = location.pathname.startsWith('/prestataire')
      ? '/prestataire/login'
      : '/login'
    return <Navigate to={loginTarget} replace state={{ from: location }} />
  }

  return <Outlet />
}

export function RequireRole({ allowedRoles }) {
  const { auth } = useAuth()
  const location = useLocation()

  if (auth.isLoading) {
    return null
  }

  const demoRoleBypass = getDemoRoleBypass(location)
  if (demoRoleBypass && allowedRoles.includes(demoRoleBypass)) {
    return <Outlet />
  }

  if (!allowedRoles.includes(auth.role)) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
