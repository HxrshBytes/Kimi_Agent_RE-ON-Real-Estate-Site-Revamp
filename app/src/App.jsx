import { BrowserRouter, Routes, Route, useLocation, useNavigationType } from 'react-router-dom'
import { useEffect, lazy, Suspense } from 'react'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ScrollObserver from './components/ScrollObserver'
import { AdminProvider } from './contexts/AdminContext.jsx'
import { CartProvider } from './contexts/CartContext.jsx'
import { ClientAuthProvider } from './contexts/ClientAuthContext.jsx'
import ClientAuthModal from './components/ClientAuthModal.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

// Route-level code splitting for instantaneous mobile loading
const Home = lazy(() => import('./pages/Home'))
const Properties = lazy(() => import('./pages/Properties'))
const PropertyDetail = lazy(() => import('./pages/PropertyDetail'))
const Services = lazy(() => import('./pages/Services'))
const About = lazy(() => import('./pages/About'))
const Career = lazy(() => import('./pages/Career'))
const Contact = lazy(() => import('./pages/Contact'))
const Blog = lazy(() => import('./pages/Blog'))
const BlogDetail = lazy(() => import('./pages/BlogDetail'))
const News = lazy(() => import('./pages/News'))
const NewsDetail = lazy(() => import('./pages/NewsDetail'))
const Cart = lazy(() => import('./pages/Cart'))
const Admin = lazy(() => import('./pages/Admin'))

function ScrollToTop() {
  const location = useLocation()
  const navType = useNavigationType()

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
  }, [])

  useEffect(() => {
    if (navType !== 'POP') {
      // Stop Lenis animation and instantly jump to top
      if (window.__lenis) {
        window.__lenis.stop()
        window.__lenis.scrollTo(0, { immediate: true, force: true })
        requestAnimationFrame(() => window.__lenis?.start?.())
      }
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
  }, [location.key, navType])

  return null
}

function AdminWrapper() {
  return (
    <ErrorBoundary>
      <Admin />
    </ErrorBoundary>
  )
}

export default function App() {
  useEffect(() => {
    // Only initialize heavy smooth-scroll library on desktop/laptop devices
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    if (isTouch) return

    let lenis = null
    let animationFrameId = null

    import('lenis').then(({ default: Lenis }) => {
      import('lenis/dist/lenis.css')
      lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier: 0.9,
      })

      window.__lenis = lenis

      function raf(time) {
        lenis.raf(time)
        animationFrameId = requestAnimationFrame(raf)
      }

      animationFrameId = requestAnimationFrame(raf)
    }).catch(() => {})

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId)
      if (lenis) lenis.destroy()
      window.__lenis = null
    }
  }, [])

  return (
    <ClientAuthProvider>
      <CartProvider>
        <AdminProvider>
          <BrowserRouter>
            <ScrollToTop />
            <ScrollObserver />
            <Navbar />
            <ClientAuthModal />
            <main>
              <Suspense
                fallback={
                  <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--green-dark)', color: 'var(--cream)', gap: '1rem' }}>
                    <div style={{ width: 40, height: 40, border: '3px solid rgba(74, 222, 128, 0.2)', borderTopColor: '#4ade80', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    <p style={{ fontSize: '0.9rem', color: 'var(--cream-muted)' }}>Loading RE-ON Platform...</p>
                  </div>
                }
              >
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/properties" element={<Properties />} />
                  <Route path="/properties/:id" element={<PropertyDetail />} />
                  <Route path="/services" element={<Services />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/career" element={<Career />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/blog/:id" element={<BlogDetail />} />
                  <Route path="/news" element={<News />} />
                  <Route path="/news/:id" element={<NewsDetail />} />
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/admin" element={<AdminWrapper />} />
                </Routes>
              </Suspense>
            </main>
            <Footer />
          </BrowserRouter>
        </AdminProvider>
      </CartProvider>
    </ClientAuthProvider>
  )
}
