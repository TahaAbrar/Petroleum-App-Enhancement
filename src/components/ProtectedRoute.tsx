import { Navigate, Outlet } from 'react-router-dom'
import { isAuthenticated } from '../lib/auth'

/** Requires login — otherwise redirect to /login */
export function ProtectedRoute() {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}

/** If already logged in, skip login → /dashboard */
export function PublicOnlyRoute() {
  if (isAuthenticated()) {
    return <Navigate to="/dashboard" replace />
  }
  return <Outlet />
}
