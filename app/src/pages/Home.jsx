import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, MapPin, Building2, TrendingUp, ChevronRight, Star, Search, X, CheckCircle2, Sparkles, ArrowUpDown } from 'lucide-react'
import CountUp from '../components/CountUp'
import { useAdmin } from '../contexts/AdminContext.jsx'
import { developerLogos } from '../components/DeveloperLogos.jsx'
import { formatCardRera, formatCardType, formatStatusClass, getReraUrl, handleReraClick } from '../utils/propertyUtils.js'
import { extractArea, getUniqueAreas, matchesArea, KNOWN_AREAS } from '../utils/locationUtils.js'
import { toProtectedMediaUrl } from '../utils/useMaskedImage.js'
import { getOptimizedImageUrl } from '../utils/mediaUrlUtils.js'
import PropertyWatermark from '../components/PropertyWatermark.jsx'
import GlassSelect from '../components/GlassSelect.jsx'
import './Home.css'

const localities = [
  { name: 'Kharghar', price: '₹12,500/sqft', trend: '+14%', bg: 'https://images.unsplash.com/photo-1546412414-8035e1776c9a?w=600&q=80' },
  { name: 'Panvel', price: '₹8,200/sqft', trend: '+18%', bg: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=80' },
  { name: 'Taloja', price: '₹6,800/sqft', trend: '+22%', bg: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&q=80' },
  { name: 'Ulwe', price: '₹9,100/sqft', trend: '+16%', bg: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=600&q=80' },
  { name: 'Dronagiri', price: '₹7,400/sqft', trend: '+20%', bg: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=600&q=80' },
  { name: 'Ghansoli', price: '₹14,200/sqft', trend: '+9%', bg: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80' },
]

const steps = [
  { num: '01', title: 'Share Your Requirements', desc: 'Tell us your budget, location preference, and the type of home you envision. Our experts listen carefully.' },
  { num: '02', title: 'Curated Property Tour', desc: 'We handpick the best matching properties and arrange personalised site visits at your convenience.' },
  { num: '03', title: 'Move In with Confidence', desc: 'From documentation to registration, we handle everything end-to-end. You just enjoy your new home.' },
]

const defaultStats = [
  { value: '3000+', label: 'Happy Families' },
  { value: '80+', label: 'Projects Listed' },
  { value: '360+', label: 'Developer Partners' },
  { value: '17+', label: 'Years of Expertise' },
]

const testimonials = [
  { name: 'Rahul Desai', role: 'Homeowner, Kharghar', text: 'RE-ON made our home-buying journey so smooth. They found us the perfect 3 BHK within our budget in just two weeks!', rating: 5 },
  { name: 'Priya Mehta', role: 'Investor, Panvel', text: 'As a property investor, I rely on RE-ON for their market insights. Their curated approach is unlike any other brokerage.', rating: 5 },
  { name: 'Sneha Kulkarni', role: 'First-time Buyer, Ulwe', text: "Being a first-time buyer, I had many doubts. RE-ON's team patiently guided me through every step.", rating: 5 },
]

// Session-scoped cache to lock selected property IDs per page refresh,
// preventing mid-session shifts or glitches when background MongoDB sync completes.
let sessionFeaturedIds = null

const pickRandom = (arr) => {
  if (!arr || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}

const availableTypes = ['All', '1 RK / Studio', '1 BHK', '2 BHK', '3 BHK', '4 BHK+', 'Commercial Property', 'Plots']

export default function Home() {
  const navigate = useNavigate()
  const { properties } = useAdmin()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState('')
  const [searchBudget, setSearchBudget] = useState('')

  const stats = useMemo(() => {
    const projectCount = properties && properties.length > 0 ? `${properties.length}+` : '80+'
    return [
      { value: '3000+', label: 'Happy Families' },
      { value: projectCount, label: 'Projects Listed' },
      { value: '360+', label: 'Developer Partners' },
      { value: '17+', label: 'Years of Expertise' },
    ]
  }, [properties])

  const featuredProperties = useMemo(() => {
    if (!properties || properties.length === 0) return []

    const panvelProps = properties.filter((p) => matchesArea(p, 'Panvel'))
    const khargharProps = properties.filter((p) => matchesArea(p, 'Kharghar'))
    const talojaProps = properties.filter((p) => matchesArea(p, 'Taloja'))

    // Initialize random selection once per page refresh
    if (!sessionFeaturedIds) {
      const pPanvel = pickRandom(panvelProps)
      const pKharghar = pickRandom(khargharProps)
      const pTaloja = pickRandom(talojaProps)

      sessionFeaturedIds = {
        panvelId: pPanvel ? (pPanvel.id ?? pPanvel._id) : null,
        khargharId: pKharghar ? (pKharghar.id ?? pKharghar._id) : null,
        talojaId: pTaloja ? (pTaloja.id ?? pTaloja._id) : null,
      }
    }

    // Resolve properties using the locked session IDs to prevent flicker
    let propPanvel = sessionFeaturedIds.panvelId != null
      ? panvelProps.find((p) => (p.id ?? p._id) === sessionFeaturedIds.panvelId)
      : null
    let propKharghar = sessionFeaturedIds.khargharId != null
      ? khargharProps.find((p) => (p.id ?? p._id) === sessionFeaturedIds.khargharId)
      : null
    let propTaloja = sessionFeaturedIds.talojaId != null
      ? talojaProps.find((p) => (p.id ?? p._id) === sessionFeaturedIds.talojaId)
      : null

    // Fallbacks if data changed and ID is missing
    if (!propPanvel && panvelProps.length > 0) {
      propPanvel = pickRandom(panvelProps)
      sessionFeaturedIds.panvelId = propPanvel ? (propPanvel.id ?? propPanvel._id) : null
    }
    if (!propKharghar && khargharProps.length > 0) {
      propKharghar = pickRandom(khargharProps)
      sessionFeaturedIds.khargharId = propKharghar ? (propKharghar.id ?? propKharghar._id) : null
    }
    if (!propTaloja && talojaProps.length > 0) {
      propTaloja = pickRandom(talojaProps)
      sessionFeaturedIds.talojaId = propTaloja ? (propTaloja.id ?? propTaloja._id) : null
    }

    const selected = [propPanvel, propKharghar, propTaloja].filter(Boolean)

    // Fallback if any area has no properties: fill remaining slots up to 3
    if (selected.length < 3) {
      const selectedIds = new Set(selected.map((p) => p.id ?? p._id))
      for (const p of properties) {
        const pId = p.id ?? p._id
        if (!selectedIds.has(pId)) {
          selected.push(p)
          selectedIds.add(pId)
          if (selected.length === 3) break
        }
      }
    }

    return selected
  }, [properties])

  const availableLocations = useMemo(() => ['All', ...getUniqueAreas(properties)], [properties])

  const handleSearch = (e) => {
    e.preventDefault()
    const params = new URLSearchParams()
    const queryTrimmed = searchQuery.trim()
    if (queryTrimmed) {
      const matchedArea = availableLocations.find(
        (a) => a !== 'All' && a.toLowerCase() === queryTrimmed.toLowerCase()
      ) || KNOWN_AREAS.find(
        (a) => a.toLowerCase() === queryTrimmed.toLowerCase()
      )
      if (matchedArea) {
        params.set('location', matchedArea)
      } else {
        params.set('q', queryTrimmed)
      }
    }
    if (searchType) params.set('type', searchType)
    if (searchBudget) params.set('budget', searchBudget)
    navigate(`/properties?${params.toString()}`)
  }

  return (
    <div className="home">
      {/* Hero */}
      <section className="hero">
        <div className="hero__bg">
          <img src="/images/hero-skyline.png" alt="RE-ON Navi Mumbai Skyline" />
          <div className="hero__overlay" />
        </div>
        <div className="container hero__inner">
          <h1 className="headline-xl hero__title fade-up">
            Find Your<br /><span className="text-red">Perfect</span><br />Home
          </h1>
          <p className="hero__subtitle fade-up fade-up-delay-2">
            Stop Searching. Start Owning.<br />All your property needs — Homes, Plots, Shops & Luxury properties — All Under One Roof.
          </p>
          <div className="hero__actions fade-up fade-up-delay-3">
            <Link to="/properties" className="btn-accent">Explore Properties <ArrowRight size={16} /></Link>
            <Link to="/contact" className="btn-outline">Book Free Consultation</Link>
          </div>
          <div className="hero__stats fade-up fade-up-delay-4">
            {stats.map(({ value, label }, i) => (
              <div key={label} className="hero__stat" style={{ animationDelay: `${0.5 + i * 0.08}s` }}>
                <CountUp value={value} className="hero__stat-value" />
                <span className="hero__stat-label">{label}</span>
              </div>
            ))}
          </div>
          <form className="hero__search fade-up fade-up-delay-5" onSubmit={handleSearch}>
            <div className="hero__search-field hero__search-field--input">
              <Search size={16} className="hero__search-icon" />
              <input
                type="text"
                list="home-location-list"
                placeholder="Search project, developer, locality (e.g. 'Kharghar', 'SM Jewel')..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoComplete="off"
              />
              <datalist id="home-location-list">
                {availableLocations.filter(l => l !== 'All').map(loc => (
                  <option key={loc} value={loc} />
                ))}
              </datalist>
              {searchQuery && (
                <button
                  type="button"
                  className="hero__search-clear-btn"
                  onClick={() => setSearchQuery('')}
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <GlassSelect
              value={searchType}
              onChange={setSearchType}
              icon={Building2}
              options={[
                { value: '', label: 'All Types / BHK' },
                { value: '1 RK / Studio', label: '1 RK / Studio' },
                { value: '1 BHK', label: '1 BHK' },
                { value: '2 BHK', label: '2 BHK' },
                { value: '3 BHK', label: '3 BHK' },
                { value: '4 BHK+', label: '4 BHK+' },
                { value: 'Commercial Property', label: 'Commercial Property' },
                { value: 'Plots', label: 'Plots' }
              ]}
              ariaLabel="Search by Property Type"
              className="hero__search-field"
            />
            <GlassSelect
              value={searchBudget}
              onChange={setSearchBudget}
              icon={TrendingUp}
              options={[
                { value: '', label: 'All Budgets' },
                { value: 'under-50L', label: 'Under ₹50 Lakhs' },
                { value: '50L-1.3Cr', label: '₹50L – ₹1.3 Crore' },
                { value: '1.3Cr-2Cr', label: '₹1.3Cr – ₹2 Crore' },
                { value: '2Cr+', label: '₹2 Crore+' }
              ]}
              ariaLabel="Search by Budget"
              className="hero__search-field"
            />
            <button type="submit" className="btn-accent hero__search-btn">Search <ArrowRight size={16} /></button>
          </form>
        </div>
      </section>

      {/* Sections below Hero with Background Image */}
      <div className="home__lower">
        <div className="home__lower-bg">
          <img src="/images/navi-mumbai-night.jpg" alt="Navi Mumbai Night Skyline" />
          <div className="home__lower-overlay" />
        </div>

        <div className="home__lower-content">
          {/* Featured Properties — from DB */}
          {featuredProperties.length > 0 && (
            <section className="section home__featured">
              <div className="container">
                <div className="section-header reveal-on-scroll">
                  <div>
                    <p className="section-label">Hand-Picked</p>
                    <h2 className="headline-lg home__section-title">Featured Properties</h2>
                  </div>
                  <Link to="/properties" className="btn-outline">View All <ChevronRight size={16} /></Link>
                </div>
                <div className="home__properties-grid reveal-stagger">
                  {featuredProperties.map((p) => (
                    <div key={p.id || p._id} className="prop-card reveal-on-scroll">
                      <Link
                        to={`/properties/${p.id || p._id}`}
                        className="prop-card__img"
                        onContextMenu={(e) => e.preventDefault()}
                        onMouseEnter={() => {
                          const nextImg = p.images?.[0] || p.img
                          if (nextImg) {
                            const preloadImg = new Image()
                            preloadImg.src = getOptimizedImageUrl(nextImg, 1200)
                          }
                        }}
                        onTouchStart={() => {
                          const nextImg = p.images?.[0] || p.img
                          if (nextImg) {
                            const preloadImg = new Image()
                            preloadImg.src = getOptimizedImageUrl(nextImg, 1200)
                          }
                        }}
                      >
                        <img
                          src={getOptimizedImageUrl(p.images?.[0] || p.img || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=700&q=80', 600)}
                          alt={p.name}
                          loading="lazy"
                          decoding="async"
                          draggable={false}
                          onDragStart={(e) => e.preventDefault()}
                          onContextMenu={(e) => e.preventDefault()}
                          onError={(e) => {
                            e.currentTarget.onerror = null
                            e.currentTarget.src = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=700&q=80'
                          }}
                        />
                        <PropertyWatermark variant="card" />
                        <span className={`prop-card__status ${formatStatusClass(p.status)}`}>{p.status || 'Verified'}</span>
                      </Link>
                      <div className="prop-card__body">
                        <div className="prop-card__inner">
                          <div className="prop-card__top-meta">
                            <span className="badge">{formatCardType(p.type || p.bhk || p.configurations || p.configuration)}</span>
                            <a
                              href={p.reraNumber ? getReraUrl(p.reraNumber) : undefined}
                              target={p.reraNumber ? "_blank" : undefined}
                              rel={p.reraNumber ? "noopener noreferrer" : undefined}
                              className={`prop-card__rera ${p.reraNumber ? 'prop-card__rera--link' : 'prop-card__rera--pending'}`}
                              title={p.reraNumber ? `Verify RERA on MahaRERA: ${p.reraNumber}` : 'RERA Registration Coming Soon'}
                              onClick={(e) => {
                                if (p.reraNumber) handleReraClick(e, p.reraNumber)
                                else e.preventDefault()
                              }}
                            >
                              {formatCardRera(p.reraNumber)}
                            </a>
                          </div>
                          <h3 className="prop-card__name" title={p.name}>
                            <Link to={`/properties/${p.id || p._id}`} target="_blank" rel="noopener noreferrer">{p.name}</Link>
                          </h3>
                          <p className="prop-card__loc" title={p.location}>
                            <MapPin size={13} className="prop-card__loc-icon" />
                            <span>{p.location || 'Navi Mumbai'}</span>
                          </p>
                          <div className="prop-card__footer">
                            <div className="prop-card__price-wrap">
                              <span className="prop-card__price-label">Price</span>
                              <div className="prop-card__price">{p.price || 'Price on Request'}</div>
                            </div>
                            <Link to={`/properties/${p.id || p._id}`} target="_blank" rel="noopener noreferrer" className="btn-accent prop-card__cta">View Details</Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Localities */}
          <section className="section">
            <div className="container">
              <p className="section-label reveal-on-scroll">Explore by Area</p>
              <h2 className="headline-lg home__section-title reveal-on-scroll reveal-delay-1" style={{ marginBottom: '2.5rem' }}>Top Localities in Navi Mumbai</h2>
              <div className="home__loc-grid reveal-stagger">
                {localities.map((loc) => (
                  <Link to={`/properties?location=${loc.name}`} key={loc.name} className="loc-card reveal-on-scroll">
                    <div className="loc-card__bg-img" style={{ backgroundImage: `url(${loc.bg})` }} />
                    <div className="loc-card__overlay" />
                    <div className="loc-card__content">
                      <h3 className="loc-card__name">{loc.name}</h3>
                      <p className="loc-card__price">{loc.price}</p>
                    </div>
                    <span className="loc-card__trend">{loc.trend}</span>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section className="section home__journey">
            <div className="container">
              <div className="home__journey-inner">
                <div className="reveal-on-scroll reveal--left">
                  <p className="section-label">Simple Process</p>
                  <h2 className="headline-lg home__section-title">Your Home Buying<br />Journey Made Easy</h2>
                  <p className="home__journey-desc">We've helped hundreds of families find their dream homes. Our streamlined process removes complexity so you focus on what matters — moving in.</p>
                  <Link to="/services" className="btn-accent" style={{ marginTop: '2rem' }}>Our Services <ArrowRight size={16} /></Link>
                </div>
                <div className="home__journey-steps reveal-stagger">
                  {steps.map((step) => (
                    <div key={step.num} className="step-card reveal-on-scroll">
                      <span className="step-card__num">{step.num}</span>
                      <div>
                        <h3 className="step-card__title">{step.title}</h3>
                        <p className="step-card__desc">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Developer Ticker */}
          <section className="section home__developers">
            <div className="container">
              <p className="section-label reveal-on-scroll" style={{ justifyContent: 'center' }}>Trusted Partners</p>
              <h2 className="headline-lg home__section-title text-center reveal-on-scroll reveal-delay-1">Top Developer Collaborations</h2>
            </div>
            <div className="home__dev-ticker reveal-on-scroll reveal-delay-2">
              <div className="home__dev-track">
                {[...developerLogos, ...developerLogos].map((dev, i) => (
                  <div key={i} className="dev-logo-chip" title={dev.name}>
                    <div className="dev-chip__icon">{dev.icon}</div>
                    <div className="dev-chip__info">
                      <span className="dev-chip__name">{dev.name}</span>
                      <span className="dev-chip__badge">{dev.badge}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Testimonials */}
          <section className="section">
            <div className="container">
              <p className="section-label reveal-on-scroll">What Clients Say</p>
              <h2 className="headline-lg home__section-title reveal-on-scroll reveal-delay-1" style={{ marginBottom: '2.5rem' }}>Trusted by Navi Mumbai's Homebuyers</h2>
              <div className="home__testi-grid reveal-stagger">
                {testimonials.map((t) => (
                  <div key={t.name} className="testi-card reveal-on-scroll">
                    <div className="testi-card__stars">
                      {Array.from({ length: t.rating }).map((_, si) => <Star key={si} size={14} fill="#B41E1E" color="#B41E1E" />)}
                    </div>
                    <p className="testi-card__text">"{t.text}"</p>
                    <div className="testi-card__author">
                      <div className="testi-card__avatar">{t.name.charAt(0)}</div>
                      <div>
                        <p className="testi-card__name">{t.name}</p>
                        <p className="testi-card__role">{t.role}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CTA Banner */}
          <section className="home__cta-banner">
            <div className="container">
              <div className="home__cta-inner">
                <div className="reveal-on-scroll reveal--left">
                  <p className="section-label">Get Started Today</p>
                  <h2 className="headline-lg home__cta-title">Ready to Find Your Dream Home?</h2>
                  <p style={{ color: 'var(--cream-muted)', marginTop: '0.75rem' }}>Book a free consultation with our experts. No obligations, just honest advice.</p>
                </div>
                <div className="home__cta-actions reveal-on-scroll reveal--right reveal-delay-2">
                  <Link to="/contact" className="btn-accent">Book Free Consultation <ArrowRight size={16} /></Link>
                  <a href="tel:+918591944460" className="btn-outline">Call Now</a>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
