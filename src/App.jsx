import Navbar from './components/layout/Navbar.jsx'
import Footer from './components/layout/Footer.jsx'
import FloatingButtons from './components/layout/FloatingButtons.jsx'
import Hero from './components/sections/Hero.jsx'
import About from './components/sections/About.jsx'
import Services from './components/sections/Services.jsx'
import Gallery from './components/sections/Gallery.jsx'
import Testimonials from './components/sections/Testimonials.jsx'
import Booking from './components/sections/Booking.jsx'
import Loyalty from './components/sections/Loyalty.jsx'
import Location from './components/sections/Location.jsx'

export default function App() {
  return (
    <div className="min-h-screen overflow-hidden text-cream">
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
    </div>
  )
}
