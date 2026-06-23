import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

/**
 * Protege uma rota exigindo autenticação.
 * Se requireAdmin=true, exige também que o usuário seja ADMIN.
 */
export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, isAdmin } = useAuth()
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />
  }

  return children
}
