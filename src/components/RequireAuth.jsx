import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/auth-context.js'
import AppShell from './AppShell.jsx'

/** Gates the signed-in half of the app and wraps it in the shell. */
export default function RequireAuth({ children }) {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />

  return <AppShell>{children}</AppShell>
}
