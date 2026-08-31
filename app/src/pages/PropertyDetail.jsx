import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useParams, Link } from 'react-router-dom'
import { useAdmin } from '../contexts/AdminContext.jsx'
import { useCart } from '../contexts/CartContext.jsx'
import { useClientAuth } from '../contexts/ClientAuthContext.jsx'
import { usePropertyDwellLead } from '../hooks/usePropertyDwellLead'
import {
  MapPin, BedDouble, ArrowRight, Download, CheckCircle2,
  ShieldCheck, Phone, Mail, Calendar, FileText, Send,
  Share2, ChevronRight, ChevronLeft, Play, Sparkles, Car, Tag, Lock, ZoomIn, Maximize2, Heart, ShoppingBag,
  X, Loader2
} from 'lucide-react'
import ImageZoomLightbox from '../components/ImageZoomLightbox.jsx'
import { useMaskedImages, toProtectedMediaUrl } from '../utils/useMaskedImage.js'
import { formatCardRera, formatCardType, formatStatusClass, getReraUrl, handleReraClick } from '../utils/propertyUtils.js'
import { getGoogleMapsEmbedUrl, getGoogleMapsDirectUrl } from '../utils/mapUtils.js'
import { formatDirectImageUrl, getOptimizedImageUrl } from '../utils/mediaUrlUtils.js'
import PropertyWatermark from '../components/PropertyWatermark.jsx'
import './PropertyDetail.css'



const placeholderImage = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80'

export default function PropertyDetail() {
  const { id } = useParams()
  const { properties, isLoadingProperties, fetchPropertyById, submitContactInquiry, currentUserRole, updateProperty } = useAdmin()
  const { addItem, removeItem, isInCart, lastActionToast } = useCart()
  const { isSignedIn, openAuthModal } = useClientAuth()

  const [directProperty, setDirectProperty] = useState(null)
  const [isFetchingDirect, setIsFetchingDirect] = useState(false)

  const property = useMemo(() => {
    if (directProperty) return directProperty
    const cleanId = String(id || '').trim()
    const decodedId = decodeURIComponent(cleanId).toLowerCase()

    const propList = properties && properties.length > 0 ? properties : null
    if (propList) {
      const found = propList.find(
        (p) =>
          String(p.id) === cleanId ||
          String(p._id) === cleanId ||
          (p.name && p.name.toLowerCase() === decodedId) ||
          (p.slug && p.slug === cleanId)
      )
      if (found) return found
    }

    // Instant synchronous hydration from localStorage cache
    try {
      const stored = localStorage.getItem('reon_admin_data')
      if (stored) {
        const raw = JSON.parse(stored)
        const localProps = raw.properties || []
        const localFound = localProps.find(
          (p) =>
            String(p.id) === cleanId ||
            String(p._id) === cleanId ||
            (p.name && p.name.toLowerCase() === decodedId) ||
            (p.slug && p.slug === cleanId)
        )
        if (localFound) return localFound
      }
    } catch {}

    return null
  }, [properties, id, directProperty])

  useEffect(() => {
    if (!property && id && fetchPropertyById) {
      let isMounted = true
      setIsFetchingDirect(true)
      fetchPropertyById(id)
        .then((found) => {
          if (isMounted) {
            if (found) setDirectProperty(found)
            setIsFetchingDirect(false)
          }
        })
        .catch(() => {
          if (isMounted) setIsFetchingDirect(false)
        })
      return () => {
        isMounted = false
      }
    }
  }, [property, id, fetchPropertyById])

  // Lead Tracking Algorithm: Auto-submit lead if client stays on property >30s
  usePropertyDwellLead(property)



  const handleToggleCart = useCallback(() => {
    if (!property) return
    const propId = String(property.id || property._id)

    if (!isSignedIn) {
      try {
        localStorage.setItem('reon_pending_cart_item', JSON.stringify({
          id: propId,
          _id: propId,
          name: property.name || property.title,
          title: property.title || property.name,
          price: property.price,
          location: property.location,
          image: property.images?.[0] || property.img || '',
          type: property.type || property.bhk,
          area: property.area,
          status: property.status,
          reraNumber: property.reraNumber,
        }))
      } catch { }
      openAuthModal()
      return
    }

    if (isInCart(propId)) {
      removeItem(propId)
    } else {
      addItem({
        id: propId,
        _id: propId,
        name: property.name || property.title,
        title: property.title || property.name,
        price: property.price,
        location: property.location,
        image: property.images?.[0] || property.img || '',
        type: property.type || property.bhk,
        area: property.area,
        status: property.status,
        reraNumber: property.reraNumber,
      })
    }
  }, [isSignedIn, property, isInCart, addItem, removeItem, openAuthModal])

  const [activeMediaIndex, setActiveMediaIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [inquiryForm, setInquiryForm] = useState({ name: '', phone: '', email: '', message: '' })
  const [inquirySubmitted, setInquirySubmitted] = useState(false)
  const [showBrochureModal, setShowBrochureModal] = useState(false)
  const [brochureForm, setBrochureForm] = useState({ name: '', email: '', phone: '' })
  const [brochureSubmitting, setBrochureSubmitting] = useState(false)
  const [brochureSuccess, setBrochureSuccess] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  // Touch and drag swipe state for image gallery
  const [touchStart, setTouchStart] = useState(null)
  const [touchEnd, setTouchEnd] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const thumbsRef = useRef(null)

  const openLightbox = (index = activeMediaIndex) => {
    setLightboxIndex(index)
    setLightboxOpen(true)
  }

  if (!property && (isLoadingProperties || isFetchingDirect)) {
    return (
      <div className="prop-detail-page" style={{ paddingTop: '5.5rem', minHeight: '100vh' }}>
        <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '4rem' }}>
          {/* Breadcrumb skeleton */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div className="skeleton-shimmer" style={{ width: '60px', height: '16px' }} />
            <div className="skeleton-shimmer" style={{ width: '12px', height: '16px' }} />
            <div className="skeleton-shimmer" style={{ width: '90px', height: '16px' }} />
            <div className="skeleton-shimmer" style={{ width: '12px', height: '16px' }} />
            <div className="skeleton-shimmer" style={{ width: '140px', height: '16px' }} />
          </div>

          {/* Header skeleton */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '700px', width: '100%' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div className="skeleton-shimmer" style={{ width: '90px', height: '24px', borderRadius: '20px' }} />
                <div className="skeleton-shimmer" style={{ width: '110px', height: '24px', borderRadius: '20px' }} />
              </div>
              <div className="skeleton-shimmer" style={{ width: '75%', height: '38px', borderRadius: '8px' }} />
              <div className="skeleton-shimmer" style={{ width: '50%', height: '20px', borderRadius: '6px' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
              <div className="skeleton-shimmer" style={{ width: '160px', height: '36px', borderRadius: '8px' }} />
              <div className="skeleton-shimmer" style={{ width: '120px', height: '18px', borderRadius: '6px' }} />
            </div>
          </div>

          {/* Gallery + Sidebar Layout skeleton */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
            {/* Gallery area */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', gridColumn: 'span 2' }}>
              <div className="skeleton-shimmer" style={{ width: '100%', height: '480px', borderRadius: '16px' }} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="skeleton-shimmer" style={{ width: '100%', height: '80px', borderRadius: '10px' }} />
                ))}
              </div>
            </div>

            {/* Sidebar area */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="skeleton-shimmer" style={{ width: '100%', height: '380px', borderRadius: '16px' }} />
              <div className="skeleton-shimmer" style={{ width: '100%', height: '180px', borderRadius: '16px' }} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!property) {
    return (
      <div className="page-content" style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
        <div className="container text-center">
          <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Property Not Found</h2>
          <p style={{ color: 'var(--gray)', marginBottom: '1.5rem' }}>
            The requested property details could not be loaded or may have been removed.
          </p>
          <Link to="/properties" className="btn-accent">
            View All Properties <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    )
  }

  const allImages = property.images && property.images.length > 0
    ? property.images
    : [property.img || placeholderImage]

  const maskedImages = useMaskedImages(allImages, property.id || property._id)
  const displayImages = maskedImages && maskedImages.length === allImages.length ? maskedImages : allImages

  const allVideos = property.videos || []

  const overviewDescription = property.description || ''

  const highlightsList = useMemo(() => {
    if (Array.isArray(property.highlights) && property.highlights.length > 0) {
      return property.highlights
    }
    if (typeof property.highlights === 'string' && property.highlights.trim()) {
      return property.highlights.split(/\r?\n/).map(s => s.trim()).filter(Boolean)
    }
    return []
  }, [property.highlights])

  const connectivityList = useMemo(() => {
    let raw = property.connectivity
    if (!raw || (Array.isArray(raw) && raw.length === 0)) {
      return []
    }
    if (typeof raw === 'string') {
      raw = raw.split(/\r?\n/).filter(Boolean)
    }
    return raw.map((item) => {
      if (typeof item === 'object' && item !== null) {
        let label = item.label || item.title || item.key || ''
        if (label && !label.endsWith(':')) label += ':'
        return { label, detail: item.detail || item.value || item.text || '' }
      }
      const str = String(item).trim()
      const colonIdx = str.indexOf(':')
      if (colonIdx !== -1) {
        let label = str.substring(0, colonIdx).trim()
        if (label && !label.endsWith(':')) label += ':'
        return {
          label,
          detail: str.substring(colonIdx + 1).trim()
        }
      }
      return { label: '', detail: str }
    }).filter(i => i.label || i.detail)
  }, [property.connectivity])

  const handleInquirySubmit = async (e) => {
    e.preventDefault()
    if (!inquiryForm.name || !inquiryForm.phone) return

    await submitContactInquiry({
      name: inquiryForm.name.trim(),
      phone: inquiryForm.phone.trim(),
      email: (inquiryForm.email || '').trim(),
      preferredDate: (inquiryForm.message || '').trim(),
      message: inquiryForm.message?.trim() || `Requested free site visit consultation for ${property.name}`,
      type: 'Schedule Site Visit',
      propertyName: property.name,
      propertyId: property.id || property._id,
      propertyLocation: property.location,
      location: property.location,
      source: 'Property Detail Sidebar',
      submittedAt: new Date().toISOString(),
    })
    setInquirySubmitted(true)
    setInquiryForm({ name: '', phone: '', email: '', message: '' })
  }

  const handleBrochureSubmit = async (e) => {
    e.preventDefault()
    if (!brochureForm.name || !brochureForm.phone) return
    setBrochureSubmitting(true)
    await submitContactInquiry({
      name: brochureForm.name.trim(),
      email: (brochureForm.email || '').trim(),
      phone: brochureForm.phone.trim(),
      propertyName: property.name,
      propertyId: property.id || property._id,
      propertyLocation: property.location,
      location: property.location,
      type: 'Brochure Download Request',
      source: 'Brochure Modal',
      message: `Downloaded brochure and requested callback for ${property.name}`,
      submittedAt: new Date().toISOString(),
    })
    setBrochureSubmitting(false)
    setBrochureSuccess(true)
    setTimeout(() => {
      setShowBrochureModal(false)
      setBrochureSuccess(false)
      setBrochureForm({ name: '', email: '', phone: '' })
    }, 2500)
  }

  const handlePrevMedia = () => {
    setActiveMediaIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1))
  }

  const handleNextMedia = () => {
    setActiveMediaIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1))
  }

  // Minimum swipe distance threshold (in px)
  const minSwipeDistance = 45

  const onTouchStart = (e) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance
    if (isLeftSwipe && allImages.length > 1) {
      handleNextMedia()
    } else if (isRightSwipe && allImages.length > 1) {
      handlePrevMedia()
    }
  }

  // Mouse Drag Support
  const onMouseDown = (e) => {
    setIsDragging(true)
    setTouchStart(e.clientX)
    setTouchEnd(null)
  }

  const onMouseMove = (e) => {
    if (!isDragging) return
    setTouchEnd(e.clientX)
  }

  const onMouseUp = () => {
    if (!isDragging) return
    setIsDragging(false)
    if (!touchStart) return
    if (!touchEnd || Math.abs(touchStart - touchEnd) < 8) {
      openLightbox(activeMediaIndex)
      return
    }
    const distance = touchStart - touchEnd
    if (distance > minSwipeDistance && allImages.length > 1) {
      handleNextMedia()
    } else if (distance < -minSwipeDistance && allImages.length > 1) {
      handlePrevMedia()
    }
  }

  // Keyboard navigation support (Arrow keys)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (allImages.length <= 1) return
      if (e.key === 'ArrowLeft') handlePrevMedia()
      if (e.key === 'ArrowRight') handleNextMedia()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [allImages.length])

  // Scroll active thumbnail into view
  useEffect(() => {
    if (thumbsRef.current) {
      const activeThumb = thumbsRef.current.children[activeMediaIndex]
      if (activeThumb) {
        activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
      }
    }
  }, [activeMediaIndex])

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: property.name, url: window.location.href })
    } else {
      navigator.clipboard.writeText(window.location.href)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2500)
    }
  }

  const relatedProperties = properties
    .filter((p) => String(p.id) !== String(id))
    .slice(0, 3)

  return (
    <div className="property-detail-page">
      {/* Breadcrumb Navigation */}
      <div className="prop-detail__breadcrumbs-wrap">
        <div className="container">
          <nav className="prop-detail__breadcrumbs">
            <Link to="/">Home</Link>
            <ChevronRight size={13} />
            <Link to="/properties">Properties</Link>
            <ChevronRight size={13} />
            <span>{property.location || 'Navi Mumbai'}</span>
            <ChevronRight size={13} />
            <span className="current">{property.name}</span>
          </nav>
        </div>
      </div>

      {/* Main Header — Title & Badges */}
      <section className="prop-detail__hero-header">
        <div className="container">
          <div className="prop-detail__badges">
            <a
              href={property.reraNumber ? getReraUrl(property.reraNumber) : undefined}
              target={property.reraNumber ? "_blank" : undefined}
              rel={property.reraNumber ? "noopener noreferrer" : undefined}
              className={`badge-rera ${property.reraNumber ? 'badge-rera--link' : 'badge-rera--pending'}`}
              title={property.reraNumber ? `Verify RERA on MahaRERA: ${property.reraNumber} (Copies to clipboard)` : 'RERA Registration Coming Soon'}
              onClick={(e) => {
                if (property.reraNumber) handleReraClick(e, property.reraNumber)
              }}
            >
              <ShieldCheck size={13} /> {property.reraNumber ? `RERA: ${property.reraNumber}` : 'RERA No: Coming Soon'}
            </a>
            <span className={`badge-status ${formatStatusClass(property.status)}`}>
              {property.status || 'Active'}
            </span>
            <span className="badge-type">{property.type || 'Residential'}</span>
          </div>
          <h1 className="prop-detail__title">{property.name}</h1>
          <p className="prop-detail__developer">Developed by {property.developer || property.developedBy || 'RE-ON Premier Developer Network'}</p>
          <p className="prop-detail__location" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span><MapPin size={16} /> {property.location}, Navi Mumbai, Maharashtra</span>
          </p>
        </div>
      </section>

      {/* 1. Image Gallery Section (On top of pricing card) */}
      <section className="prop-detail__gallery-section">
        <div className="container">
          <div className="prop-detail__gallery-grid">
            <div
              className="prop-detail__gallery-main"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={() => isDragging && setIsDragging(false)}
              onContextMenu={(e) => e.preventDefault()}
            >
              <img
                src={getOptimizedImageUrl(displayImages[activeMediaIndex] || property.img || placeholderImage, 1200)}
                alt={`${property.name} view ${activeMediaIndex + 1}`}
                fetchpriority="high"
                decoding="async"
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
                onContextMenu={(e) => e.preventDefault()}
                onError={(e) => {
                  const raw = allImages[activeMediaIndex] || property.img || ''
                  const direct = getOptimizedImageUrl(raw, 1200)
                  if (direct && e.currentTarget.src !== direct) {
                    e.currentTarget.src = direct
                  } else {
                    e.currentTarget.onerror = null
                    e.currentTarget.src = property.img || placeholderImage
                  }
                }}
              />

              <PropertyWatermark variant="hero" />

              <button
                type="button"
                className="gallery-zoom-trigger"
                onClick={(e) => {
                  e.stopPropagation()
                  openLightbox(activeMediaIndex)
                }}
                title="Click to Zoom & View Fullscreen"
                aria-label="Zoom image"
              >
                <ZoomIn size={15} /> Click to Zoom
              </button>

              {displayImages.length > 1 && (
                <>
                  <button
                    type="button"
                    className="gallery-nav-btn gallery-nav-btn--prev"
                    onClick={(e) => {
                      e.stopPropagation()
                      handlePrevMedia()
                    }}
                    onTouchStart={(e) => e.stopPropagation()}
                    onTouchEnd={(e) => {
                      e.stopPropagation()
                      handlePrevMedia()
                    }}
                    aria-label="Previous image"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <button
                    type="button"
                    className="gallery-nav-btn gallery-nav-btn--next"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleNextMedia()
                    }}
                    onTouchStart={(e) => e.stopPropagation()}
                    onTouchEnd={(e) => {
                      e.stopPropagation()
                      handleNextMedia()
                    }}
                    aria-label="Next image"
                  >
                    <ChevronRight size={24} />
                  </button>
                  <div className="gallery-counter">
                    {activeMediaIndex + 1} / {displayImages.length}
                  </div>
                </>
              )}
            </div>

            {displayImages.length > 1 && (
              <div
                className="prop-detail__gallery-thumbs"
                ref={thumbsRef}
                onContextMenu={(e) => e.preventDefault()}
              >
                {displayImages.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`prop-detail__thumb ${activeMediaIndex === idx ? 'active' : ''}`}
                    onClick={() => setActiveMediaIndex(idx)}
                    onDoubleClick={() => openLightbox(idx)}
                    onContextMenu={(e) => e.preventDefault()}
                    title={`View photo ${idx + 1} (Double-click to zoom)`}
                  >
                    <img
                      src={getOptimizedImageUrl(img, 240)}
                      alt={`Thumbnail ${idx + 1}`}
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                      onDragStart={(e) => e.preventDefault()}
                      onContextMenu={(e) => e.preventDefault()}
                      onError={(e) => {
                        const raw = allImages[idx] || property.img || ''
                        const direct = getOptimizedImageUrl(raw, 240)
                        if (direct && e.currentTarget.src !== direct) {
                          e.currentTarget.src = direct
                        } else {
                          e.currentTarget.onerror = null
                          e.currentTarget.src = property.img || placeholderImage
                        }
                      }}
                    />
                    <PropertyWatermark variant="thumb" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 2. Pricing & Action Card (Below image gallery) */}
      <section className="prop-detail__price-action-section">
        <div className="container">
          <div className="prop-detail__price-box">
            <div className="prop-detail__price-left-block">
              <div className="prop-detail__price-col">
                <span className="prop-detail__price-label">Starting Price</span>
                <h2 className="prop-detail__price">{property.price}</h2>
                <p className="prop-detail__price-note">*Price excludes SDR, GST &amp; Govt Taxes</p>
              </div>

              {/* RERA Link & QR Code beside the Price */}
              {property.reraNumber && (
                <div className="prop-detail__price-rera-card">
                  <div
                    className="prop-detail__price-rera-qr"
                    title={`Scan to verify ${property.reraNumber} on MahaRERA portal`}
                  >
                    <QRCodeSVG
                      value={getReraUrl(property.reraNumber)}
                      size={56}
                      bgColor="#ffffff"
                      fgColor="#1a1a2e"
                      level="M"
                      includeMargin={false}
                    />
                  </div>
                  <div className="prop-detail__price-rera-meta">
                    <span className="prop-detail__price-rera-label">
                      <ShieldCheck size={13} color="#86efac" /> MahaRERA
                    </span>
                    <a
                      href={getReraUrl(property.reraNumber)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="prop-detail__price-rera-number"
                      title={`Click to copy & verify on MahaRERA: ${property.reraNumber}`}
                      onClick={(e) => handleReraClick(e, property.reraNumber)}
                    >
                      {property.reraNumber} ↗
                    </a>
                    <span className="prop-detail__price-rera-subtext">Scan QR to verify</span>
                  </div>
                </div>
              )}
            </div>

            <div className="prop-detail__header-actions">
              <div className="prop-detail__action-row-top">
                <button className="btn-accent prop-detail__brochure-btn" onClick={() => setShowBrochureModal(true)}>
                  <Download size={16} /> Download Brochure
                </button>
                <button className="btn-outline prop-detail__share-btn" onClick={handleShare}>
                  <Share2 size={16} /> {copiedLink ? 'Link Copied!' : 'Share'}
                </button>
              </div>
              <button
                className={`btn-outline prop-detail__shortlist-btn${isInCart(property.id || property._id) ? ' prop-detail__shortlist-btn--active' : ''}`}
                onClick={() => {
                  if (!isSignedIn) {
                    openAuthModal();
                    return;
                  }
                  if (isInCart(property.id || property._id)) {
                    removeItem(property.id || property._id);
                  } else {
                    addItem({
                      id: property.id || property._id,
                      title: property.name,
                      image: property.images?.[0] || property.img,
                      type: property.type || property.bhk || property.configurations || property.configuration,
                      location: property.location,
                      price: property.price,
                      area: property.area
                    });
                  }
                }}
              >
                <Heart size={16} fill={isInCart(property.id || property._id) ? "currentColor" : "none"} />
                {isInCart(property.id || property._id) ? 'Shortlisted' : 'Add to Shortlist'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Overview Specs Bar */}
      <section className="prop-detail__specs-section">
        <div className="container">
          <div className="prop-detail__specs-grid">
            <div className="prop-spec-card">
              <Calendar size={22} className="prop-spec-icon" />
              <div>
                <span className="prop-spec-label">Possession</span>
                <strong className="prop-spec-val">
                  {property.possessionDate || property.possession || ((property.status === 'Ready to Move' || property.status === 'Resell' || property.status === 'Resale') ? 'Immediate / Ready' : 'Dec 2026')}
                </strong>
              </div>
            </div>
            <div className="prop-spec-card">
              <BedDouble size={22} className="prop-spec-icon" />
              <div>
                <span className="prop-spec-label">Configurations</span>
                <strong className="prop-spec-val">
                  {(() => {
                    const raw = property.type || property.bhk || property.configurations || '2 & 3 BHK'
                    const clean = String(raw).trim()
                    if (/\/\s*more/i.test(clean)) return clean
                    return `${clean} / more`
                  })()}
                </strong>
              </div>
            </div>
            <div className="prop-spec-card">
              <FileText size={22} className="prop-spec-icon" />
              <div>
                <span className="prop-spec-label">Carpet Area</span>
                <strong className="prop-spec-val">{property.area || '950 – 1550 sqft'}</strong>
              </div>
            </div>
            <div className="prop-spec-card prop-spec-card--rera">
              <ShieldCheck size={22} className="prop-spec-icon" />
              <div>
                <span className="prop-spec-label">MahaRERA ID</span>
                {property.reraNumber ? (
                  <a
                    href={getReraUrl(property.reraNumber)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="prop-spec-val prop-spec-val--link prop-spec-rera-id"
                    title={`Click to verify ${property.reraNumber} on MahaRERA portal (Copies to clipboard)`}
                    onClick={(e) => handleReraClick(e, property.reraNumber)}
                  >
                    {property.reraNumber} ↗
                  </a>
                ) : (
                  <strong className="prop-spec-val" style={{ color: '#fbbf24' }}>Coming Soon</strong>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Special Offer Banner */}
      <section className="prop-detail__offer-section">
        <div className="container">
          <div className="prop-detail__offer-banner">
            <div className="prop-detail__offer-content">
              <span className="offer-tag"><Sparkles size={14} /> EXCLUSIVE RE-ON OFFER</span>
              <h3>Zero Brokerage + Spot Booking Cash Discount</h3>
              <p>Book your site visit today and unlock up to ₹2,50,000 spot booking benefits & 0% processing fee home loan assistance.</p>
            </div>
            <button className="btn-accent" onClick={() => document.getElementById('inquiry-form-section')?.scrollIntoView({ behavior: 'smooth' })}>
              Claim Offer Now <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* Add to Cart & Property Comparison Banner */}
      <section className="prop-detail__cart-compare-section">
        <div className="container">
          <div className="prop-detail__cart-compare-card">
            <div className="prop-detail__cart-compare-left">
              <div className="prop-detail__cart-compare-icon-badge">
                <ShoppingBag size={24} color="#86efac" />
              </div>
              <div>
                <div className="prop-detail__cart-compare-heading-row">
                  <h4>Save to Shortlist &amp; Compare Properties</h4>
                </div>
                <p>
                  Add <strong>{property.name || 'this property'}</strong> to your shortlist to compare pricing, configurations, carpet area &amp; amenities side-by-side with other properties in your cart.
                </p>
              </div>
            </div>

            <div className="prop-detail__cart-compare-actions">
              <button
                className={`prop-detail__cart-btn${isInCart(property.id || property._id) ? ' prop-detail__cart-btn--active' : ''}`}
                onClick={handleToggleCart}
              >
                <Heart size={18} fill={isInCart(property.id || property._id) ? '#86efac' : 'none'} color="#86efac" />
                {isInCart(property.id || property._id) ? '✓ Shortlisted in Cart' : 'Add to Shortlist / Cart'}
              </button>

              <Link to="/cart" className="prop-detail__compare-link-btn">
                <ShoppingBag size={16} /> View &amp; Compare Cart <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Grid: Info & Contact Sticky Sidebar */}
      <section className="section prop-detail__main-content">
        <div className="container prop-detail__layout">
          {/* Left Column: Details & Highlights */}
          <div className="prop-detail__info-col">
            <div className="prop-detail__card">
              <h3>Property Overview</h3>
              {overviewDescription && (
                <p className="prop-detail__desc">
                  {overviewDescription}
                </p>
              )}

              {highlightsList.length > 0 && (
                <>
                  <h4 style={{ marginTop: '1.75rem', marginBottom: '1rem', fontFamily: 'Montserrat', color: 'var(--cream)' }}>Key Highlights & Amenities</h4>
                  <ul className="prop-detail__amenities-list">
                    {highlightsList.map((item, idx) => (
                      <li key={idx}>
                        <CheckCircle2 size={16} /> {item}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            {/* Videos Section if available */}
            {allVideos.length > 0 && (
              <div className="prop-detail__card" style={{ marginTop: '2rem' }}>
                <h3>Virtual Tour & Videos</h3>
                <div className="prop-detail__videos-grid">
                  {allVideos.map((videoUrl, idx) => (
                    <div key={idx} className="prop-detail__video-wrapper">
                      <iframe
                        src={videoUrl.replace('watch?v=', 'embed/')}
                        title={`Property video ${idx + 1}`}
                        allowFullScreen
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Location Advantage */}
            {connectivityList.length > 0 && (
              <div className="prop-detail__card" style={{ marginTop: '2rem' }}>
                <h3>Location Connectivity</h3>
                <div className="prop-detail__loc-features">
                  {connectivityList.map((item, idx) => (
                    <div key={idx} className="loc-feature-item">
                      {item.label && <strong>{item.label}</strong>} {item.detail}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Interactive Embedded Google Maps Section */}
            {(() => {
              const fallbackQuery = `${property.name || ''}, ${property.location || ''}, Navi Mumbai, Maharashtra`
              const embedUrl = getGoogleMapsEmbedUrl(property.mapLink, fallbackQuery)
              const directMapUrl = getGoogleMapsDirectUrl(property.mapLink, fallbackQuery)

              return (
                <div className="prop-detail__card" style={{ marginTop: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
                    <div>
                      <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <MapPin size={22} color="#4ade80" /> Property Map &amp; Location
                      </h3>
                      <p style={{ fontSize: '0.85rem', color: 'var(--gray)', margin: '0.25rem 0 0 0' }}>
                        {property.name} — {property.location}, Navi Mumbai, Maharashtra
                      </p>
                    </div>
                    <a
                      href={directMapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-accent"
                      style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      📍 Open Directions on Google Maps ↗
                    </a>
                  </div>

                  <div style={{ width: '100%', height: '360px', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
                    <iframe
                      title={`Map location for ${property.name}`}
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      loading="lazy"
                      allowFullScreen
                      referrerPolicy="no-referrer-when-downgrade"
                      src={embedUrl}
                    />
                  </div>
                </div>
              )
            })()}


          </div>

          {/* Right Column: Sticky Consultation Lead Form */}
          <div className="prop-detail__sidebar-col" id="inquiry-form-section">
            <div className="prop-detail__sidebar-card">
              <h3>Schedule Free Site Visit</h3>
              <p style={{ color: 'var(--gray)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                Get instant callback from our senior real estate advisor & free private cab pickup for site visit.
              </p>

              {inquirySubmitted ? (
                <div className="prop-detail__inquiry-success">
                  <CheckCircle2 size={36} color="#4ade80" />
                  <h4>Inquiry Sent Successfully!</h4>
                  <p>Our Navi Mumbai real estate expert will reach out to you within 15 minutes.</p>
                  <button className="btn-outline" onClick={() => setInquirySubmitted(false)} style={{ marginTop: '1rem', width: '100%' }}>
                    Send Another Inquiry
                  </button>
                </div>
              ) : (
                <form onSubmit={handleInquirySubmit} className="prop-detail__inquiry-form">
                  <div className="form-field">
                    <label>Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sameer Sharma"
                      value={inquiryForm.name}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, name: e.target.value })}
                    />
                  </div>
                  <div className="form-field">
                    <label>Phone Number *</label>
                    <input
                      type="tel"
                      required
                      placeholder="+91 98765 43210"
                      value={inquiryForm.phone}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, phone: e.target.value })}
                    />
                  </div>
                  <div className="form-field">
                    <label>Email Address</label>
                    <input
                      type="email"
                      placeholder="sameer@example.com"
                      value={inquiryForm.email}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, email: e.target.value })}
                    />
                  </div>
                  <div className="form-field">
                    <label>Preferred Visit Date / Note</label>
                    <textarea
                      rows={2}
                      placeholder="I want to schedule a weekend site visit..."
                      value={inquiryForm.message}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, message: e.target.value })}
                    />
                  </div>
                  <button type="submit" className="btn-accent" style={{ width: '100%', justifyContent: 'center' }}>
                    <Send size={16} /> Request Callback & Brochure
                  </button>
                </form>
              )}

              <div className="prop-detail__contact-quick">
                <a href="tel:+918591944460" className="quick-call-btn">
                  <Phone size={15} /> Call Advisor: +91 85919 44460
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Related Properties */}
      {relatedProperties.length > 0 && (
        <section className="section prop-detail__related-section">
          <div className="container">
            <h2 className="headline-lg" style={{ marginBottom: '2rem' }}>
              Similar Properties in <span className="text-red">Navi Mumbai</span>
            </h2>
            <div className="props__grid">
              {relatedProperties.map((p) => (
                <div key={p.id || p._id} className="prop-card">
                  <Link to={`/properties/${p.id || p._id}`} target="_blank" rel="noopener noreferrer" className="prop-card__img" onContextMenu={(e) => e.preventDefault()}>
                    <img
                      src={toProtectedMediaUrl(p.images?.[0] || p.img || placeholderImage, p.id || p._id)}
                      alt={p.name}
                      loading="lazy"
                      draggable={false}
                      onDragStart={(e) => e.preventDefault()}
                      onContextMenu={(e) => e.preventDefault()}
                    />
                    <PropertyWatermark variant="card" />
                    <span className={`prop-card__status ${formatStatusClass(p.status)}`}>
                      {p.status || 'Verified'}
                    </span>
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
                        <Link to={`/properties/${p.id || p._id}`} target="_blank" rel="noopener noreferrer" className="btn-accent prop-card__cta">
                          View Details
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Download Brochure Modal */}
      {showBrochureModal && (
        <div className="modal-overlay" onClick={() => setShowBrochureModal(false)}>
          <div className="brochure-modal" onClick={(e) => e.stopPropagation()}>
            <button className="brochure-modal__close" onClick={() => setShowBrochureModal(false)}>✕</button>

            <div className="brochure-modal__header">
              <h3>Download Brochure</h3>
              <p className="brochure-modal__subtitle">
                {property.name}
              </p>
            </div>

            {brochureSuccess ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                <CheckCircle2 size={54} color="#4ade80" style={{ margin: '0 auto 1rem auto' }} />
                <h4 style={{ fontSize: '1.25rem', color: '#fff', marginBottom: '0.5rem' }}>Brochure Request Received!</h4>
                <p style={{ color: 'var(--gray)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                  The brochure for <strong>{property.name}</strong> is being sent to your mobile &amp; email. Our advisor will also contact you shortly.
                </p>
              </div>
            ) : (
              <>
                {/* Feature Icons Row */}
                <div className="brochure-modal__perks">
                  <div className="brochure-perk">
                    <span className="brochure-perk__icon"><Phone size={22} color="#fb7185" /></span>
                    <span>Instant Call<br />Back</span>
                  </div>
                  <div className="brochure-perk">
                    <span className="brochure-perk__icon"><Car size={22} color="#fb7185" /></span>
                    <span>Free Site<br />Visit</span>
                  </div>
                  <div className="brochure-perk">
                    <span className="brochure-perk__icon"><Tag size={22} color="#fb7185" /></span>
                    <span>Unmatched<br />Price</span>
                  </div>
                </div>

                <p className="brochure-modal__tagline">
                  Register Here &amp; Avail The <span className="text-red"><strong>Best Offer!!</strong></span>
                </p>

                <form className="brochure-modal__form" onSubmit={handleBrochureSubmit}>
                  <div className="brochure-form-field">
                    <label>Name <span className="required">*</span></label>
                    <input
                      name="brochure_name"
                      type="text"
                      required
                      placeholder="Your full name"
                      value={brochureForm.name}
                      onChange={(e) => setBrochureForm({ ...brochureForm, name: e.target.value })}
                    />
                  </div>
                  <div className="brochure-form-field">
                    <label>Email Address</label>
                    <input
                      name="brochure_email"
                      type="email"
                      placeholder="your@email.com"
                      value={brochureForm.email}
                      onChange={(e) => setBrochureForm({ ...brochureForm, email: e.target.value })}
                    />
                  </div>
                  <div className="brochure-form-field">
                    <label>Mobile Number <span className="required">*</span></label>
                    <input
                      name="brochure_phone"
                      type="tel"
                      required
                      placeholder="+91 98765 43210"
                      value={brochureForm.phone}
                      onChange={(e) => setBrochureForm({ ...brochureForm, phone: e.target.value })}
                    />
                  </div>
                  <button type="submit" className="brochure-modal__submit" disabled={brochureSubmitting}>
                    {brochureSubmitting ? 'Processing Request...' : 'Download Now'}
                  </button>
                </form>

                <p className="brochure-modal__social-proof">
                  <Lock size={14} style={{ display: 'inline', verticalAlign: '-1px', marginRight: '4px' }} /> <strong>37,901+</strong> Customers Downloaded Already
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Fullscreen Interactive Zoom Lightbox */}
      <ImageZoomLightbox
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        images={displayImages}
        initialIndex={lightboxIndex}
        title={property.name}
      />

      {/* Floating Action Toast Notification */}
      {lastActionToast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: 'linear-gradient(135deg, rgba(13,31,22,0.98), rgba(8,24,17,0.99))',
          border: '1px solid rgba(134,239,172,0.4)',
          borderRadius: '100px',
          padding: '12px 24px',
          color: '#86efac',
          fontWeight: 600,
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          zIndex: 99999,
          animation: 'slideUpFade 0.3s ease forwards',
        }}>
          <CheckCircle2 size={18} /> {lastActionToast}
        </div>
      )}
    </div>
  )
}
