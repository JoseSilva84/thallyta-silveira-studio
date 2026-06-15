import { Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/layout/Navbar.jsx'
import Footer from './components/layout/Footer.jsx'
import FloatingButtons from './components/layout/FloatingButtons.jsx'
import FloatingCart from './components/ui/FloatingCart.jsx'
import Hero from './components/sections/Hero.jsx'
import About from './components/sections/About.jsx'
import Services from './components/sections/Services.jsx'
import Gallery from './components/sections/Gallery.jsx'
import Testimonials from './components/sections/Testimonials.jsx'
import Booking from './components/sections/Booking.jsx'
import Loyalty from './components/sections/Loyalty.jsx'
import Location from './components/sections/Location.jsx'
import AdminPanel from './components/admin/AdminPanel.jsx'
import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import ProtectedRoute from './components/auth/ProtectedRoute.jsx'
import MyBookingsPage from './pages/MyBookingsPage.jsx'
import WhatsappPromptModal from './components/auth/WhatsappPromptModal.jsx'
import GoogleBrowserWarning from './components/auth/GoogleBrowserWarning.jsx'
import Seo from './components/Seo.jsx'
import { useAuth } from './context/AuthContext.jsx'
import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

function GoogleAuthCallback() {
  const { } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    // O AuthContext já lida com o token na URL.
    // Após o processamento, redireciona para home.
    const params = new URLSearchParams(location.search)
    if (!params.get('token')) {
      navigate('/', { replace: true })
    } else {
      // Aguarda 100ms para o AuthContext processar o token
      setTimeout(() => navigate('/', { replace: true }), 100)
    }
  }, [navigate, location])

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center">
      <p className="text-gold animate-pulse font-bold text-xl">Autenticando com Google...</p>
    </div>
  )
}

function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <About />
        <Services />
        <Gallery />
        <Testimonials />
        <Booking />
        <Loyalty />
        <Location />
      </main>
      <Footer />
      <FloatingButtons />
      <FloatingCart />
    </>
  )
}

export default function App() {
  return (
    <div className="min-h-screen overflow-hidden text-cream relative">
      <Seo />
      {/* Neon Background Auras */}
      <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
        <div className="neon-aura-1"></div>
        <div className="neon-aura-2"></div>
        <div className="neon-aura-3"></div>
      </div>

      <Routes>
        {/* Páginas públicas */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/auth/callback" element={<GoogleAuthCallback />} />
        <Route
          path="/meus-agendamentos"
          element={
            <ProtectedRoute>
              <MyBookingsPage />
            </ProtectedRoute>
          }
        />

        {/* Painel Admin — apenas administradores autenticados */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requireAdmin>
              <AdminPanel />
            </ProtectedRoute>
          }
        />

        {/* Redireciona qualquer rota desconhecida para home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <WhatsappPromptModal />
      <GoogleBrowserWarning />
    </div>
  )
}
