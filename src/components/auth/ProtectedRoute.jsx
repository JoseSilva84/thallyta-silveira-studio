import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

/**
 * Protege uma rota exigindo autenticação.
 * Se requireAdmin=true, exige também que o usuário seja ADMIN.
 */
export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, isAdmin } = useAuth()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />
  }

  return children
}
