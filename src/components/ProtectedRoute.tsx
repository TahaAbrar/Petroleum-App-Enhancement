import { Navigate, Outlet } from 'react-router-dom'
import { clearSession, getSession, getUserRole, homePathForRole, isAuthenticated } from '../lib/auth'

/** Requires login — otherwise redirect to /login */
export function ProtectedRoute() {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}

/** Role gate */
export function RoleRoute({ allow }: { allow: string[] }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }
  const role = getUserRole()
  if (!role || !allow.includes(role)) {
    return <Navigate to={homePathForRole(role || 'User')} replace />
  }
  return <Outlet />
}

/** If already logged in, skip login → role home */
export function PublicOnlyRoute() {
  const session = getSession()
  if (session?.token) {
    if (session.user.role === 'User') {
      clearSession()
      return <Outlet />
    }
    return <Navigate to={session.redirectTo || homePathForRole(session.user.role)} replace />
  }
  return <Outlet />
}
