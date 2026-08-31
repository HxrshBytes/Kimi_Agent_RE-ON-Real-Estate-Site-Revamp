import { useMemo, useState, useEffect, useCallback, useRef, memo, lazy, Suspense } from 'react'
import { Link, useSearchParams, useNavigationType } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { useAdmin } from '../contexts/AdminContext.jsx'
import { useCart } from '../contexts/CartContext.jsx'
import { useClientAuth } from '../contexts/ClientAuthContext.jsx'
import {
  MapPin,
  BedDouble,
  SlidersHorizontal,
  X,
  Search,
  ArrowUpDown,
  ArrowUp,
  Sparkles,
  Building2,
  CheckCircle2,
  Heart
} from 'lucide-react'
import { formatCardRera, formatCardType, formatStatusClass, getReraUrl, handleReraClick } from '../utils/propertyUtils.js'
import { extractArea, getUniqueAreas, matchesArea, KNOWN_AREAS } from '../utils/locationUtils.js'
import { searchProperties } from '../utils/searchEngine.js'
import { toProtectedMediaUrl } from '../utils/useMaskedImage.js'
import { getOptimizedImageUrl } from '../utils/mediaUrlUtils.js'
import PropertyWatermark from '../components/PropertyWatermark.jsx'
import GlassSelect from '../components/GlassSelect.jsx'
import './Properties.css'

const placeholderImage = 'https://images.unsplash.com/photo-1494526585095-c41746248156?w=900&q=80'

/* ── Performance: Progressive rendering constants ── */
const INITIAL_VISIBLE = 24
const LOAD_MORE_COUNT = 24

/* ── Performance: Lazy QR Code (only renders when scrolled into view) ── */
const LazyQR = memo(function LazyQR({ value, reraNumber, onClick }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { rootMargin: '200px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div ref={ref} className="prop-card__rera-qr-box" title={`Verify RERA: ${reraNumber} (Click to copy & open MahaRERA)`} onClick={onClick}>
      {visible ? (
        <>
          <div className="prop-card__rera-qr-code">
            <QRCodeSVG value={value} size={32} bgColor="#ffffff" fgColor="#1a1a2e" level="M" includeMargin={false} />
          </div>
          <span className="prop-card__rera-qr-tag">RERA ↗</span>
        </>
      ) : (
        <div className="prop-card__rera-qr-code" style={{ width: 32, height: 32 }} />
      )}
    </div>
  )
})

/* ──────────────────────────────────────────────
   MAIN COMPONENT
   ────────────────────────────────────────────── */
export default function Properties() {
  const { properties, isLoadingProperties } = useAdmin()
  const { addItem, removeItem, isInCart } = useCart()
  const { isSignedIn, openAuthModal } = useClientAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const navType = useNavigationType()
  const isInitialMount = useRef(true)
  const scrollKey = 'reon_properties_scroll'

  // Initialize filters from URL params (handles both fresh navigation and back button)
  const [textSearch, setTextSearch] = useState(searchParams.get('query') || searchParams.get('q') || '')
  const [locationFilter, setLocationFilter] = useState(searchParams.get('location') || 'All')
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || 'All')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'All')
  const [budgetFilter, setBudgetFilter] = useState(searchParams.get('budget') || 'All')
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'relevance')

  // Persist all filter state changes to URL search params (replace, not push)
  // This ensures the browser history entry for /properties always has the current filters,
  // so pressing back from a property detail page restores them.
  useEffect(() => {
    // Skip the initial mount to avoid overwriting URL params from Home page search
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    const params = new URLSearchParams()
    if (textSearch.trim()) params.set('q', textSearch.trim())
    if (locationFilter !== 'All') params.set('location', locationFilter)
    if (typeFilter !== 'All') params.set('type', typeFilter)
    if (statusFilter !== 'All') params.set('status', statusFilter)
    if (budgetFilter !== 'All') params.set('budget', budgetFilter)
    if (sortBy !== 'relevance') params.set('sort', sortBy)
    setSearchParams(params, { replace: true })
  }, [textSearch, locationFilter, typeFilter, statusFilter, budgetFilter, sortBy, setSearchParams])

  // Save scroll position on every scroll so it can be restored on back navigation
  useEffect(() => {
    const saveScroll = () => {
      try { sessionStorage.setItem(scrollKey, String(window.scrollY || 0)) } catch {}
    }
    window.addEventListener('scroll', saveScroll, { passive: true })
    return () => {
      saveScroll()
      window.removeEventListener('scroll', saveScroll)
    }
  }, [])

  const [showScrollTop, setShowScrollTop] = useState(false)

  // Track scroll position to toggle floating back-to-top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 350)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = useCallback(() => {
    if (window.__lenis) {
      window.__lenis.scrollTo(0, { duration: 1.2 })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [])

  // Restore scroll position when returning via back button (POP navigation)
  useEffect(() => {
    if (navType === 'POP') {
      try {
        const saved = parseInt(sessionStorage.getItem(scrollKey) || '0', 10)
        if (saved > 0) {
          const restore = () => {
            if (window.__lenis) window.__lenis.scrollTo(saved, { immediate: true })
            window.scrollTo(0, saved)
          }
          // Multiple attempts to ensure content has rendered before restoring
          requestAnimationFrame(restore)
          setTimeout(restore, 80)
          setTimeout(restore, 200)
          setTimeout(restore, 400)
        }
      } catch {}
    }
  }, [navType])

  // Extract unique filter options
  const availableLocations = useMemo(() => ['All', ...getUniqueAreas(properties)], [properties])
  const availableTypes = ['All', '1 RK / Studio', '1 BHK', '2 BHK', '3 BHK', '4 BHK+', 'Commercial Property', 'Plots']
  const availableStatuses = ['All', 'Ready to Move', 'Under Construction', 'New Launch', 'Resell', 'Commercial']

  /* ──── CORE 100% PRECISION SEARCH ENGINE ──── */
  const filteredProperties = useMemo(() => {
    return searchProperties(properties, {
      query: textSearch,
      location: locationFilter,
      type: typeFilter,
      status: statusFilter,
      budget: budgetFilter,
      sortBy: sortBy
    })
  }, [properties, textSearch, locationFilter, typeFilter, statusFilter, budgetFilter, sortBy])

  /* ── Progressive rendering: show cards in batches ── */
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE)
  const loadMoreRef = useRef(null)

  // Reset visible count when filters change so user sees instant results
  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE)
  }, [textSearch, locationFilter, typeFilter, statusFilter, budgetFilter, sortBy])

  // IntersectionObserver to auto-load more cards when user scrolls near bottom
  useEffect(() => {
    const el = loadMoreRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + LOAD_MORE_COUNT, filteredProperties.length))
        }
      },
      { rootMargin: '600px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [filteredProperties.length])

  const visibleProperties = useMemo(
    () => filteredProperties.slice(0, visibleCount),
    [filteredProperties, visibleCount]
  )

  const resetAllFilters = useCallback(() => {
    setTextSearch('')
    setLocationFilter('All')
    setTypeFilter('All')
    setStatusFilter('All')
    setBudgetFilter('All')
    setSortBy('relevance')
    try { sessionStorage.removeItem(scrollKey) } catch {}
  }, [])

  const hasActiveFilters = textSearch.trim() || locationFilter !== 'All' || typeFilter !== 'All' || statusFilter !== 'All' || budgetFilter !== 'All'

  return (
    <div className="properties-page">
      {/* Compact Header */}
      <section className="props__hero-header">
        <div className="container">
          <h1 className="props__main-title">
            Find Your <span className="text-red">Ideal Property</span>
          </h1>
          <p className="props__main-subtitle">
            {hasActiveFilters
              ? `${filteredProperties.length} ${filteredProperties.length === 1 ? 'property' : 'properties'} found matching your criteria`
              : `Explore ${properties.length} verified properties across Navi Mumbai`}
          </p>
        </div>
      </section>

      {/* Search & Filter Panel */}
      <div className="props__search-panel-wrap">
        <div className="container">
          <div className="props__search-panel">
            {/* Search Bar */}
            <div className="props__search-input-group">
              <Search size={18} className="props__search-icon" />
              <input
                type="text"
                className="props__main-input"
                placeholder="Search by project name, developer, locality (e.g. 'SM Jewel', 'Kharghar 2 BHK')..."
                value={textSearch}
                onChange={(e) => setTextSearch(e.target.value)}
              />
              {textSearch && (
                <button className="props__clear-btn" onClick={() => setTextSearch('')} title="Clear search">
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Filter Dropdowns */}
            <div className="props__quick-filters">
              {/* Location */}
              <GlassSelect
                value={locationFilter}
                onChange={setLocationFilter}
                icon={MapPin}
                options={[
                  { value: 'All', label: 'All Locations' },
                  ...availableLocations.filter((l) => l !== 'All').map((loc) => ({ value: loc, label: loc }))
                ]}
                ariaLabel="Filter by Location"
              />

              {/* Type / BHK */}
              <GlassSelect
                value={typeFilter}
                onChange={setTypeFilter}
                icon={Building2}
                options={availableTypes.map((t) => ({ value: t, label: t === 'All' ? 'All Types / BHK' : t }))}
                ariaLabel="Filter by Property Type"
              />

              {/* Status */}
              <GlassSelect
                value={statusFilter}
                onChange={setStatusFilter}
                icon={CheckCircle2}
                options={availableStatuses.map((s) => ({ value: s, label: s === 'All' ? 'All Statuses' : s }))}
                ariaLabel="Filter by Status"
              />

              {/* Budget */}
              <GlassSelect
                value={budgetFilter}
                onChange={setBudgetFilter}
                icon={Sparkles}
                options={[
                  { value: 'All', label: 'All Budgets' },
                  { value: 'under-50L', label: 'Under ₹50 Lakhs' },
                  { value: '50L-1.3Cr', label: '₹50L – ₹1.3 Crore' },
                  { value: '1.3Cr-2Cr', label: '₹1.3Cr – ₹2 Crore' },
                  { value: '2Cr+', label: '₹2 Crore+' }
                ]}
                ariaLabel="Filter by Budget"
              />

              {/* Sort */}
              <GlassSelect
                value={sortBy}
                onChange={setSortBy}
                icon={ArrowUpDown}
                options={[
                  { value: 'relevance', label: 'Sort: Most Relevant' },
                  { value: 'price-asc', label: 'Price: Low to High' },
                  { value: 'price-desc', label: 'Price: High to Low' },
                  { value: 'newest', label: 'Newest Listed' }
                ]}
                ariaLabel="Sort Properties"
                className="props__select-wrapper--sort"
              />
            </div>
          </div>

          {/* Active Filter Chips */}
          {hasActiveFilters && (
            <div className="props__active-chips">
              <span className="props__chips-title">Active Filters:</span>
              {textSearch && (
                <span className="props__chip">
                  Search: "{textSearch}"
                  <X size={13} onClick={() => setTextSearch('')} />
                </span>
              )}
              {locationFilter !== 'All' && (
                <span className="props__chip">
                  Location: {locationFilter}
                  <X size={13} onClick={() => setLocationFilter('All')} />
                </span>
              )}
              {typeFilter !== 'All' && (
                <span className="props__chip">
                  Type: {typeFilter}
                  <X size={13} onClick={() => setTypeFilter('All')} />
                </span>
              )}
              {statusFilter !== 'All' && (
                <span className="props__chip">
                  Status: {statusFilter}
                  <X size={13} onClick={() => setStatusFilter('All')} />
                </span>
              )}
              {budgetFilter !== 'All' && (
                <span className="props__chip">
                  Budget: {budgetFilter === 'under-50L' ? 'Under ₹50L' : budgetFilter === '50L-1.3Cr' ? '₹50L–₹1.3Cr' : budgetFilter === '1.3Cr-2Cr' ? '₹1.3Cr–₹2Cr' : '₹2Cr+'}
                  <X size={13} onClick={() => setBudgetFilter('All')} />
                </span>
              )}
              <button className="props__reset-btn" onClick={resetAllFilters}>Reset All</button>
            </div>
          )}
        </div>
      </div>

      {/* Results Grid */}
      <section className="props__results-section">
        <div className="container">
          <div className="props__results-header">
            <p className="props__count">
              {isLoadingProperties && properties.length === 0 ? (
                <span>Loading verified properties...</span>
              ) : (
                <>
                  <strong>{filteredProperties.length}</strong> {filteredProperties.length === 1 ? 'property' : 'properties'} found
                  {hasActiveFilters ? ' matching your criteria' : ''}
                </>
              )}
            </p>
          </div>

          {isLoadingProperties && properties.length === 0 ? (
            <div className="props__grid">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="skeleton-card">
                  <div className="skeleton-card-img skeleton-shimmer" />
                  <div className="skeleton-card-body">
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                      <div className="skeleton-shimmer" style={{ width: '80px', height: '22px' }} />
                      <div className="skeleton-shimmer" style={{ width: '90px', height: '22px' }} />
                    </div>
                    <div className="skeleton-shimmer" style={{ width: '85%', height: '26px', marginTop: '4px' }} />
                    <div className="skeleton-shimmer" style={{ width: '60%', height: '16px' }} />
                    <div className="skeleton-shimmer" style={{ width: '45%', height: '16px' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                      <div className="skeleton-shimmer" style={{ width: '100px', height: '28px' }} />
                      <div className="skeleton-shimmer" style={{ width: '110px', height: '36px', borderRadius: '10px' }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="props__grid">
              {visibleProperties.map((p, idx) => (
                <div key={`${p._id || p.id || 'prop'}-${idx}`} className="prop-card">
                  <div className="prop-card__media-wrap" style={{ position: 'relative' }}>
                    <Link
                      to={`/properties/${p._id || p.id}`}
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
                        src={getOptimizedImageUrl(p.images?.[0] || p.img || placeholderImage, 600)}
                        alt={p.name}
                        loading="lazy"
                        decoding="async"
                        draggable={false}
                        onDragStart={(e) => e.preventDefault()}
                        onContextMenu={(e) => e.preventDefault()}
                        onError={(e) => {
                          e.currentTarget.onerror = null
                          e.currentTarget.src = placeholderImage
                        }}
                      />
                      <PropertyWatermark variant="card" />
                      <span className={`prop-card__status ${formatStatusClass(p.status)}`}>
                        {p.status || 'Verified'}
                      </span>
                    </Link>
                    <button
                      className={`prop-card__shortlist-btn${isInCart(p._id || p.id) ? ' prop-card__shortlist-btn--active' : ''}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!isSignedIn) {
                          openAuthModal();
                          return;
                        }
                        if (isInCart(p._id || p.id)) {
                          removeItem(p._id || p.id);
                        } else {
                          addItem({
                            id: p._id || p.id,
                            title: p.name,
                            image: p.images?.[0] || p.img,
                            type: p.type || p.bhk || p.configurations || p.configuration,
                            location: p.location,
                            price: p.price,
                            area: p.area
                          });
                        }
                      }}
                      aria-label="Add to shortlist"
                    >
                      <Heart size={18} fill={isInCart(p._id || p.id) ? "currentColor" : "none"} />
                    </button>
                  </div>

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
                        <Link to={`/properties/${p._id || p.id}`}>{p.name}</Link>
                      </h3>

                      <p className="prop-card__loc" title={p.location}>
                        <MapPin size={13} className="prop-card__loc-icon" />
                        <span>{p.location || 'Navi Mumbai'}</span>
                      </p>

                      <div className="prop-card__specs">
                        {p.area && (
                          <span className="prop-card__spec-item">
                            <BedDouble size={13} /> {p.area}
                          </span>
                        )}
                        {(p.images?.length > 1 || p.videos?.length > 0) && (
                          <span className="prop-card__spec-item prop-card__spec-media">
                            {p.images?.length > 1 && `${p.images.length} images`}
                            {p.videos?.length > 0 && ` • ${p.videos.length} video${p.videos.length > 1 ? 's' : ''}`}
                          </span>
                        )}
                      </div>

                      <div className="prop-card__footer">
                        <div className="prop-card__price-wrap">
                          <span className="prop-card__price-label">Price</span>
                          <div className="prop-card__price">{p.price || 'Price on Request'}</div>
                        </div>

                        {/* RERA QR Code & Link beside price */}
                        {p.reraNumber && (
                          <LazyQR
                            value={getReraUrl(p.reraNumber)}
                            reraNumber={p.reraNumber}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReraClick(e, p.reraNumber);
                            }}
                          />
                        )}

                        <Link to={`/properties/${p._id || p.id}`} className="btn-accent prop-card__cta">
                          View Details
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Infinite scroll sentinel — triggers loading next batch */}
              {visibleCount < filteredProperties.length && (
                <div
                  ref={loadMoreRef}
                  style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem 0' }}
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--gray)', fontSize: '0.88rem' }}>
                    <div className="skeleton-shimmer" style={{ width: 20, height: 20, borderRadius: '50%' }} />
                    Loading more properties...
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bottom Back to Top trigger when multiple properties are listed */}
          {!isLoadingProperties && filteredProperties.length > 4 && (
            <div className="props__bottom-action">
              <button
                type="button"
                onClick={scrollToTop}
                className="props__bottom-top-btn"
                aria-label="Scroll back to top"
              >
                <ArrowUp size={16} />
                <span>Back to Top</span>
              </button>
            </div>
          )}

          {/* Empty State */}
          {!isLoadingProperties && filteredProperties.length === 0 && (
            <div className="props__empty">
              <SlidersHorizontal size={40} style={{ color: 'var(--red)', opacity: 0.8, marginBottom: '1rem' }} />
              <h3>No Properties Match Your Search</h3>
              <p>Try adjusting your search keywords, budget range, or location filters.</p>
              <button className="btn-accent" onClick={resetAllFilters} style={{ marginTop: '1.5rem' }}>
                Reset All Filters
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Floating Scroll to Top Button */}
      <button
        type="button"
        onClick={scrollToTop}
        className={`props__scroll-top-btn ${showScrollTop ? 'props__scroll-top-btn--visible' : ''}`}
        aria-label="Scroll to top of page"
        title="Scroll to top"
      >
        <ArrowUp size={18} />
        <span className="props__scroll-top-label">Top</span>
      </button>
    </div>
  )
}
