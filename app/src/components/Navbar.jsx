import { useState, useEffect } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import {
  ArrowRight,
  Phone,
  Menu,
  X,
  User,
  ShoppingBag,
  LogOut,
  Home as HomeIcon,
  Building2,
  Briefcase,
  Sparkles,
  BookOpen,
  Newspaper,
  GraduationCap,
  Send,
  Heart,
  ChevronRight
} from 'lucide-react'
import { useCart } from '../contexts/CartContext'
import { useClientAuth } from '../contexts/ClientAuthContext'
import './Navbar.css'

const navLinks = [
  { to: '/', label: 'Home', icon: HomeIcon },
  { to: '/properties', label: 'Properties', icon: Building2 },
  { to: '/services', label: 'Services', icon: Briefcase },
  { to: '/about', label: 'About', icon: Sparkles },
  { to: '/blog', label: 'Blog', icon: BookOpen },
  { to: '/news', label: 'News', icon: Newspaper },
  { to: '/career', label: 'Career', icon: GraduationCap },
  { to: '/contact', label: 'Contact', icon: Send },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { user, isSignedIn, signOut, openAuthModal } = useClientAuth()
  const location = useLocation()
  const { count } = useCart()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => { setOpen(false) }, [location])

  // Close mobile dropdown when clicking/tapping outside
  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e) => {
      if (e.target.closest('.navbar')) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', handleClickOutside)
    return () => document.removeEventListener('pointerdown', handleClickOutside)
  }, [open])

  const handleAuthToggle = () => {
    if (isSignedIn) {
      signOut()
    } else {
      openAuthModal()
    }
  }

  return (
    <header className={`navbar${scrolled ? ' navbar--scrolled' : ''}`}>
      <div className="container navbar__container">
        {/* Logo aligned with page container */}
        <Link to="/" className="navbar__logo" aria-label="RE-ON Real Estate">
          <div className="navbar__logo-wrap">
            <img src="/images/reon-logo.png" alt="RE-ON Real Estate" className="navbar__logo-img" />
          </div>
        </Link>

        {/* Floating Capsule Nav (Separate from Logo) */}
        <div className="navbar__capsule">
          {/* Nav Links */}
          <nav className="navbar__links">
            {navLinks.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) => `navbar__link${isActive ? ' navbar__link--active' : ''}`}
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Green Pill CTA */}
          <Link to="/contact" className="navbar__cta-pill">
            Book Visit <ArrowRight size={15} />
          </Link>

          {/* Mobile Burger with Immediate 1-Tap Toggle */}
          <button
            type="button"
            className={`navbar__burger${open ? ' navbar__burger--open' : ''}`}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setOpen((prev) => !prev)
            }}
            aria-label="Toggle navigation menu"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* ── Action Icons (after capsule) ── */}
        <div className="navbar__actions">
          {/* Call */}
          <a
            href="tel:+918591944460"
            className="navbar__action-btn"
            aria-label="Call us"
            title="Call Us"
          >
            <Phone size={17} strokeWidth={2} />
          </a>

          {/* User Login / Logout */}
          <button
            className={`navbar__action-btn${isSignedIn ? ' navbar__action-btn--active' : ''}`}
            onClick={handleAuthToggle}
            aria-label={isSignedIn ? `Signed in as ${user?.name || user?.phone || 'Member'}. Click to Logout` : 'Login with Mobile Number'}
            title={isSignedIn ? `Signed in as ${user?.name || user?.phone || 'Member'} (Click to Logout)` : 'Login with Mobile Number'}
          >
            {isSignedIn ? <LogOut size={17} strokeWidth={2} /> : <User size={17} strokeWidth={2} />}
          </button>

          {/* Cart / Shortlist */}
          <Link
            to="/cart"
            className={`navbar__action-btn navbar__action-btn--cart${location.pathname === '/cart' ? ' navbar__action-btn--active' : ''}`}
            aria-label="View shortlist"
            title="Shortlist"
          >
            <ShoppingBag size={17} strokeWidth={2} />
            {count > 0 && <span className="navbar__cart-badge">{count > 9 ? '9+' : count}</span>}
          </Link>
        </div>
      </div>

      {/* Mobile Dropdown Panel — Floating Compact Capsule Collection */}
      <div className={`navbar__mobile${open ? ' navbar__mobile--open' : ''}`}>
        <nav className="navbar__mobile-nav">
          {navLinks.map(({ to, label, icon: Icon }, idx) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `navbar__mobile-capsule${isActive ? ' active' : ''}`}
              style={{ '--i': idx }}
              onClick={() => setOpen(false)}
            >
              <div className="navbar__mobile-capsule-left">
                <span className="navbar__mobile-capsule-icon">
                  <Icon size={12} />
                </span>
                <span className="navbar__mobile-capsule-label">{label}</span>
              </div>
              <span className="navbar__mobile-capsule-arrow">
                <ChevronRight size={11} />
              </span>
            </NavLink>
          ))}
          <Link
            to="/cart"
            className={`navbar__mobile-capsule${location.pathname === '/cart' ? ' active' : ''}`}
            style={{ '--i': navLinks.length }}
            onClick={() => setOpen(false)}
          >
            <div className="navbar__mobile-capsule-left">
              <span className="navbar__mobile-capsule-icon">
                <Heart size={12} />
              </span>
              <span className="navbar__mobile-capsule-label">Shortlist</span>
            </div>
            {count > 0 ? (
              <span className="navbar__mobile-badge">{count}</span>
            ) : (
              <span className="navbar__mobile-capsule-arrow">
                <ChevronRight size={11} />
              </span>
            )}
          </Link>
        </nav>

        <div className="navbar__mobile-actions" style={{ '--i': navLinks.length + 1 }}>
          <button className="navbar__mobile-auth" onClick={() => { setOpen(false); handleAuthToggle() }}>
            {isSignedIn ? <><LogOut size={13} /> Logout</> : <><User size={13} /> Login</>}
          </button>
          <a href="tel:+918591944460" className="navbar__mobile-cta" onClick={() => setOpen(false)}>
            <Phone size={13} /> Call Us
          </a>
        </div>
      </div>
    </header>
  )
}
