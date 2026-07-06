import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

/**
 * Protege uma rota exigindo autenticação.
 * Se requireAdmin=true, exige também que o usuário seja ADMIN.
 */
export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, isAdmin, authHydrated } = useAuth()
  const location = useLocation()

  if (!authHydrated) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center px-4 text-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-light/60">Carregando painel</p>
          <p className="mt-3 text-lg font-semibold text-cream">Validando acesso...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />
  }

  return children
}
