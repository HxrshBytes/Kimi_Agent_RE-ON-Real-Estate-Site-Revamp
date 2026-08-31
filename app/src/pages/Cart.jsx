import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../contexts/CartContext.jsx'
import { useAdmin } from '../contexts/AdminContext.jsx'
import {
  Trash2,
  ShoppingBag,
  ArrowLeft,
  MapPin,
  IndianRupee,
  Bed,
  Bath,
  Maximize,
  Phone,
  ArrowRight,
  Scale,
  Check,
  X,
  Sparkles,
  Building2,
  Calendar,
  ShieldCheck,
  ExternalLink,
  SlidersHorizontal,
  Layers,
  Printer,
  CheckCircle2,
  Eye,
  CheckSquare,
  Square,
  Star,
  TrendingUp,
} from 'lucide-react'
import PropertyWatermark from '../components/PropertyWatermark.jsx'
import { formatCardRera, formatCardType, formatStatusClass, getReraUrl, handleReraClick } from '../utils/propertyUtils.js'
import './Cart.css'

export default function Cart() {
  const { items, removeItem, clearCart } = useCart()
  const { properties } = useAdmin()

  // Enriched cart items with full database properties if available
  const enrichedItems = useMemo(() => {
    return items.map((item) => {
      const itemId = String(item.id || item._id || '')
      const fullProp = (properties || []).find(
        (p) => String(p.id || p._id || '') === itemId || (p.name && item.name && p.name.toLowerCase() === item.name.toLowerCase())
      )
      return {
        ...item,
        ...(fullProp || {}),
        // Ensure core identifiers remain consistent
        id: itemId || fullProp?.id || fullProp?._id,
        title: item.title || item.name || fullProp?.title || fullProp?.name || 'Property Listing',
        name: item.name || item.title || fullProp?.name || fullProp?.title || 'Property Listing',
        image: item.image || item.images?.[0] || fullProp?.images?.[0] || fullProp?.image || '/images/placeholder.jpg',
      }
    })
  }, [items, properties])

  // Selected property IDs for comparison
  const [selectedIds, setSelectedIds] = useState(() => {
    return items.map((it) => String(it.id || it._id || ''))
  })

  // Keep selectedIds in sync if items are removed
  const activeSelectedIds = useMemo(() => {
    const validIds = new Set(enrichedItems.map((it) => String(it.id)))
    return selectedIds.filter((id) => validIds.has(id))
  }, [selectedIds, enrichedItems])

  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'compare'
  const [highlightDiffs, setHighlightDiffs] = useState(false)
  const [compareCategory, setCompareCategory] = useState('all') // 'all' | 'overview' | 'specs' | 'amenities' | 'location'

  const toggleSelect = (id) => {
    const sId = String(id)
    setSelectedIds((prev) =>
      prev.includes(sId) ? prev.filter((x) => x !== sId) : [...prev, sId]
    )
  }

  const selectAll = () => {
    setSelectedIds(enrichedItems.map((it) => String(it.id)))
  }

  const clearSelection = () => {
    setSelectedIds([])
  }

  const isSelected = (id) => activeSelectedIds.includes(String(id))

  // Properties currently chosen for the comparison matrix
  const comparedProperties = useMemo(() => {
    return enrichedItems.filter((it) => activeSelectedIds.includes(String(it.id)))
  }, [enrichedItems, activeSelectedIds])

  // Extract all distinct amenities across all compared properties
  const allUniqueAmenities = useMemo(() => {
    const set = new Set()
    comparedProperties.forEach((p) => {
      let list = []
      if (Array.isArray(p.amenities)) {
        list = p.amenities
      } else if (typeof p.amenities === 'string') {
        list = p.amenities.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean)
      }
      list.forEach((a) => {
        if (typeof a === 'string' && a.trim()) {
          set.add(a.trim())
        } else if (a && typeof a === 'object' && (a.name || a.label)) {
          set.add((a.name || a.label).trim())
        }
      })
    })

    // If no custom amenities found, provide standard real estate amenities for comparison
    if (set.size === 0 && comparedProperties.length > 0) {
      return [
        'Club House',
        'Swimming Pool',
        'Gymnasium',
        '24/7 Security & CCTV',
        'Children\'s Play Area',
        'Landscaped Gardens',
        'Power Backup',
        'Reserved Parking',
        'High Speed Elevators',
        'Jogging Track'
      ]
    }

    return Array.from(set)
  }, [comparedProperties])

  // Helper to check if a property has a specific amenity
  const propertyHasAmenity = (prop, amenityName) => {
    if (!prop) return false
    const target = amenityName.toLowerCase()
    let list = []
    if (Array.isArray(prop.amenities)) {
      list = prop.amenities
    } else if (typeof prop.amenities === 'string') {
      list = prop.amenities.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean)
    }
    return list.some((a) => {
      const name = typeof a === 'string' ? a : (a?.name || a?.label || '')
      return name.toLowerCase().includes(target) || target.includes(name.toLowerCase())
    })
  }

  // Format price helper
  const formatPrice = (price) => {
    if (!price) return 'Price on Request'
    if (typeof price === 'number') {
      return `₹${price.toLocaleString('en-IN')}`
    }
    const clean = String(price).trim()
    if (!clean || clean.toLowerCase() === 'price on request') return 'Price on Request'
    if (clean.startsWith('₹') || clean.startsWith('Rs')) return clean
    const num = Number(clean.replace(/[^0-9.]/g, ''))
    if (!isNaN(num) && num > 0) {
      return `₹${num.toLocaleString('en-IN')}`
    }
    return clean
  }

  // Helper to check if a row differs across properties
  const isRowDifferent = (values) => {
    if (values.length <= 1) return false
    const first = String(values[0] || '').trim().toLowerCase()
    return values.some((v) => String(v || '').trim().toLowerCase() !== first)
  }

  if (items.length === 0) {
    return (
      <section className="cart-page">
        <div className="container">
          <div className="cart-empty">
            <div className="cart-empty__icon">
              <ShoppingBag size={64} strokeWidth={1.2} />
            </div>
            <h1>Your Shortlist is Empty</h1>
            <p>
              You haven't added any properties to your shortlist yet. Browse our premium properties and save your favourites here.
            </p>
            <Link to="/properties" className="cart-empty__cta">
              <ArrowLeft size={16} /> Explore Properties
            </Link>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="cart-page">
      <div className="container">
        {/* Header */}
        <div className="cart-header">
          <div className="cart-header__left">
            <div className="cart-header__icon-badge">
              <ShoppingBag size={24} strokeWidth={1.75} />
            </div>
            <div>
              <div className="cart-header__title-row">
                <h1>Your Shortlist</h1>
                <span className="cart-header__count-badge">{items.length} Saved</span>
              </div>
              <p>Compare features, prices, and amenities across your shortlisted properties.</p>
            </div>
          </div>

          <div className="cart-header__actions">
            {/* View Switcher Tabs */}
            <div className="cart-view-tabs">
              <button
                className={`cart-view-tab ${viewMode === 'grid' ? 'cart-view-tab--active' : ''}`}
                onClick={() => setViewMode('grid')}
                type="button"
              >
                <Layers size={15} /> Shortlist Cards
              </button>
              <button
                className={`cart-view-tab ${viewMode === 'compare' ? 'cart-view-tab--active' : ''}`}
                onClick={() => {
                  if (activeSelectedIds.length < 2) {
                    selectAll()
                  }
                  setViewMode('compare')
                }}
                type="button"
              >
                <Scale size={15} /> Compare Matrix
                {activeSelectedIds.length > 0 && (
                  <span className="cart-view-tab__pill">{activeSelectedIds.length}</span>
                )}
              </button>
            </div>

            <button className="cart-header__clear" onClick={clearCart} title="Clear all saved properties">
              <Trash2 size={15} /> Clear All
            </button>
          </div>
        </div>

        {/* Floating / Sticky Compare Bar (visible when 2+ items exist) */}
        {enrichedItems.length >= 2 && (
          <div className="compare-bar">
            <div className="compare-bar__info">
              <Scale size={18} className="text-emerald" />
              <div>
                <strong>{activeSelectedIds.length} of {enrichedItems.length}</strong> properties selected for comparison
              </div>
            </div>

            <div className="compare-bar__controls">
              <button
                type="button"
                className="compare-bar__btn-text"
                onClick={activeSelectedIds.length === enrichedItems.length ? clearSelection : selectAll}
              >
                {activeSelectedIds.length === enrichedItems.length ? (
                  <>
                    <Square size={14} /> Deselect All
                  </>
                ) : (
                  <>
                    <CheckSquare size={14} /> Select All ({enrichedItems.length})
                  </>
                )}
              </button>

              {viewMode === 'grid' ? (
                <button
                  type="button"
                  className="compare-bar__btn-cta"
                  disabled={activeSelectedIds.length < 2}
                  onClick={() => setViewMode('compare')}
                >
                  <Scale size={16} />
                  <span>Compare Selected ({activeSelectedIds.length})</span>
                  <ArrowRight size={15} />
                </button>
              ) : (
                <button
                  type="button"
                  className="compare-bar__btn-secondary"
                  onClick={() => setViewMode('grid')}
                >
                  <Layers size={15} /> Back to Cards Grid
                </button>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════
            VIEW 1: GRID CARDS VIEW
            ═══════════════════════════════════════════════ */}
        {viewMode === 'grid' && (
          <div className="cart-items">
            {enrichedItems.map((item, i) => {
              const selected = isSelected(item.id)
              return (
                <div
                  className={`cart-card ${selected ? 'cart-card--selected' : ''}`}
                  key={item.id || i}
                  style={{ animationDelay: `${i * 0.06}s` }}
                >
                  <div className="cart-card__image" style={{ position: 'relative', overflow: 'hidden' }}>
                    <img
                      src={item.image || item.images?.[0] || '/images/placeholder.jpg'}
                      alt={item.title || item.name}
                      loading="lazy"
                    />
                    <PropertyWatermark variant="card" />

                    {/* Compare Select Checkbox Badge */}
                    <button
                      type="button"
                      className={`cart-card__compare-toggle ${selected ? 'cart-card__compare-toggle--active' : ''}`}
                      onClick={() => toggleSelect(item.id)}
                      title={selected ? 'Remove from comparison' : 'Select for comparison'}
                    >
                      <span className="cart-card__checkbox-box">
                        {selected ? <Check size={12} strokeWidth={3} /> : null}
                      </span>
                      <span>Compare</span>
                    </button>

                    <span className={`cart-card__badge ${formatStatusClass(item.status)}`}>
                      {formatCardType(item.type || item.propertyType || item.configurations || 'Property')}
                    </span>
                  </div>

                  <div className="cart-card__body">
                    <h3 className="cart-card__title">
                      <Link to={`/properties/${item.id || item._id}`}>
                        {item.title || item.name}
                      </Link>
                    </h3>

                    {(item.location || item.address) && (
                      <p className="cart-card__location">
                        <MapPin size={14} />
                        {item.location || item.address}
                      </p>
                    )}

                    <div className="cart-card__specs">
                      {item.bedrooms ? (
                        <span><Bed size={14} /> {item.bedrooms} BHK/Beds</span>
                      ) : (
                        <span><Bed size={14} /> {formatCardType(item.type || item.configurations || '2 BHK')}</span>
                      )}
                      {item.bathrooms && (
                        <span><Bath size={14} /> {item.bathrooms} Baths</span>
                      )}
                      {(item.area || item.sqft) && (
                        <span><Maximize size={14} /> {item.area || item.sqft} sq.ft</span>
                      )}
                      {(item.possession || item.possessionDate) && (
                        <span><Calendar size={14} /> {item.possession || item.possessionDate}</span>
                      )}
                    </div>

                    <div className="cart-card__footer">
                      <div className="cart-card__price-col">
                        <span className="cart-card__price">
                          <IndianRupee size={16} />
                          {item.price ? (typeof item.price === 'number' ? item.price.toLocaleString('en-IN') : item.price) : 'Price on Request'}
                        </span>
                        {item.reraNumber && (
                          <span className="cart-card__rera">
                            <ShieldCheck size={12} /> {formatCardRera(item.reraNumber)}
                          </span>
                        )}
                      </div>

                      <div className="cart-card__actions">
                        <Link
                          to={`/properties/${item.id || item._id}`}
                          className="cart-card__view-btn"
                          title="View property details"
                        >
                          <Eye size={14} /> Details
                        </Link>
                        <button
                          className="cart-card__remove"
                          onClick={() => removeItem(item.id)}
                          aria-label="Remove from shortlist"
                          title="Remove from shortlist"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ═══════════════════════════════════════════════
            VIEW 2: SIDE-BY-SIDE COMPARISON MATRIX
            ═══════════════════════════════════════════════ */}
        {viewMode === 'compare' && (
          <div className="compare-view">
            {comparedProperties.length < 2 ? (
              <div className="compare-empty">
                <div className="compare-empty__icon">
                  <Scale size={48} />
                </div>
                <h2>Select At Least 2 Properties to Compare</h2>
                <p>
                  You currently have {comparedProperties.length} property selected. Select 2 or more shortlisted properties to view their specs, amenities, pricing, and possession side-by-side.
                </p>
                <div className="compare-empty__actions">
                  <button type="button" className="btn-accent" onClick={selectAll}>
                    <CheckSquare size={16} /> Select All ({enrichedItems.length}) & Compare
                  </button>
                  <button type="button" className="btn-outline" onClick={() => setViewMode('grid')}>
                    <ArrowLeft size={16} /> Back to Shortlist Cards
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Comparison Toolbar */}
                <div className="compare-toolbar">
                  <div className="compare-toolbar__left">
                    <div className="compare-category-pills">
                      {[
                        { id: 'all', label: 'All Details' },
                        { id: 'overview', label: 'Overview & Pricing' },
                        { id: 'specs', label: 'Specifications' },
                        { id: 'amenities', label: `Amenities (${allUniqueAmenities.length})` },
                        { id: 'location', label: 'Location & Highlights' },
                      ].map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          className={`compare-category-pill ${compareCategory === cat.id ? 'compare-category-pill--active' : ''}`}
                          onClick={() => setCompareCategory(cat.id)}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="compare-toolbar__right">
                    <label className="compare-diff-toggle" title="Highlight rows where properties differ">
                      <input
                        type="checkbox"
                        checked={highlightDiffs}
                        onChange={(e) => setHighlightDiffs(e.target.checked)}
                      />
                      <span className="compare-diff-toggle__slider" />
                      <span className="compare-diff-toggle__label">
                        <Sparkles size={14} /> Highlight Differences
                      </span>
                    </label>

                    <button
                      type="button"
                      className="compare-print-btn"
                      onClick={() => window.print()}
                      title="Print or export comparison"
                    >
                      <Printer size={15} /> Print
                    </button>
                  </div>
                </div>

                {/* Comparison Matrix Table */}
                <div className="compare-table-wrapper">
                  <table className="compare-table">
                    <thead>
                      <tr>
                        {/* Sticky Feature Column Header */}
                        <th className="compare-th-feature">
                          <div className="compare-th-feature__content">
                            <span className="compare-th-feature__title">Comparing</span>
                            <span className="compare-th-feature__count">{comparedProperties.length} Properties</span>
                          </div>
                        </th>

                        {/* Property Column Headers */}
                        {comparedProperties.map((prop) => (
                          <th key={prop.id} className="compare-th-prop">
                            <div className="compare-prop-card">
                              <button
                                type="button"
                                className="compare-prop-card__remove"
                                onClick={() => toggleSelect(prop.id)}
                                title="Remove from comparison"
                              >
                                <X size={14} />
                              </button>

                              <div className="compare-prop-card__img">
                                <img
                                  src={prop.image || prop.images?.[0] || '/images/placeholder.jpg'}
                                  alt={prop.title || prop.name}
                                />
                                <PropertyWatermark variant="card" />
                                <span className={`compare-prop-card__badge ${formatStatusClass(prop.status)}`}>
                                  {prop.status || 'Verified'}
                                </span>
                              </div>

                              <div className="compare-prop-card__meta">
                                <h4 className="compare-prop-card__title">
                                  <Link to={`/properties/${prop.id || prop._id}`}>
                                    {prop.title || prop.name}
                                  </Link>
                                </h4>

                                <p className="compare-prop-card__location">
                                  <MapPin size={13} /> {prop.location || prop.address || 'Navi Mumbai'}
                                </p>

                                <div className="compare-prop-card__price">
                                  <IndianRupee size={15} />
                                  <span>{formatPrice(prop.price)}</span>
                                </div>

                                <div className="compare-prop-card__actions">
                                  <Link
                                    to={`/properties/${prop.id || prop._id}`}
                                    className="compare-prop-card__btn-view"
                                  >
                                    <Eye size={13} /> View Page
                                  </Link>
                                  <a
                                    href="tel:+918591944460"
                                    className="compare-prop-card__btn-contact"
                                    title="Call RE-ON advisor"
                                  >
                                    <Phone size={13} /> Call
                                  </a>
                                </div>
                              </div>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {/* ──────── SECTION 1: OVERVIEW & PRICING ──────── */}
                      {(compareCategory === 'all' || compareCategory === 'overview') && (
                        <>
                          <tr className="compare-section-header">
                            <td colSpan={comparedProperties.length + 1}>
                              <div className="compare-section-title">
                                <Building2 size={16} /> Overview & Commercials
                              </div>
                            </td>
                          </tr>

                          {/* Starting Price */}
                          <tr
                            className={
                              highlightDiffs &&
                              isRowDifferent(comparedProperties.map((p) => formatPrice(p.price)))
                                ? 'compare-row--diff'
                                : ''
                            }
                          >
                            <td className="compare-td-label">Starting Price</td>
                            {comparedProperties.map((p) => (
                              <td key={p.id} className="compare-td-value compare-td-price">
                                <strong className="text-emerald">{formatPrice(p.price)}</strong>
                              </td>
                            ))}
                          </tr>

                          {/* Configurations */}
                          <tr
                            className={
                              highlightDiffs &&
                              isRowDifferent(
                                comparedProperties.map((p) =>
                                  formatCardType(p.type || p.configurations || p.bhk || '')
                                )
                              )
                                ? 'compare-row--diff'
                                : ''
                            }
                          >
                            <td className="compare-td-label">Configuration</td>
                            {comparedProperties.map((p) => (
                              <td key={p.id} className="compare-td-value">
                                <span className="compare-pill">
                                  {formatCardType(p.type || p.configurations || p.bhk || '2 BHK')}
                                </span>
                              </td>
                            ))}
                          </tr>

                          {/* Carpet / Built-up Area */}
                          <tr
                            className={
                              highlightDiffs &&
                              isRowDifferent(comparedProperties.map((p) => p.area || p.sqft || ''))
                                ? 'compare-row--diff'
                                : ''
                            }
                          >
                            <td className="compare-td-label">Area (Sq. Ft)</td>
                            {comparedProperties.map((p) => (
                              <td key={p.id} className="compare-td-value">
                                {p.area || p.sqft ? `${p.area || p.sqft} sq.ft` : 'On Request'}
                              </td>
                            ))}
                          </tr>

                          {/* Project Status */}
                          <tr
                            className={
                              highlightDiffs &&
                              isRowDifferent(comparedProperties.map((p) => p.status || ''))
                                ? 'compare-row--diff'
                                : ''
                            }
                          >
                            <td className="compare-td-label">Project Status</td>
                            {comparedProperties.map((p) => (
                              <td key={p.id} className="compare-td-value">
                                <span className={`compare-status-badge ${formatStatusClass(p.status)}`}>
                                  {p.status || 'Ready to Move'}
                                </span>
                              </td>
                            ))}
                          </tr>

                          {/* Possession Date */}
                          <tr
                            className={
                              highlightDiffs &&
                              isRowDifferent(
                                comparedProperties.map((p) => p.possession || p.possessionDate || '')
                              )
                                ? 'compare-row--diff'
                                : ''
                            }
                          >
                            <td className="compare-td-label">Possession Timeline</td>
                            {comparedProperties.map((p) => (
                              <td key={p.id} className="compare-td-value">
                                <div className="compare-val-with-icon">
                                  <Calendar size={14} className="text-gray" />
                                  <span>{p.possession || p.possessionDate || 'Immediate / Ready'}</span>
                                </div>
                              </td>
                            ))}
                          </tr>

                          {/* Developer */}
                          <tr
                            className={
                              highlightDiffs &&
                              isRowDifferent(
                                comparedProperties.map((p) => p.developer || p.developedBy || '')
                              )
                                ? 'compare-row--diff'
                                : ''
                            }
                          >
                            <td className="compare-td-label">Developer / Builder</td>
                            {comparedProperties.map((p) => (
                              <td key={p.id} className="compare-td-value">
                                <strong>{p.developer || p.developedBy || 'RE-ON Partner Developer'}</strong>
                              </td>
                            ))}
                          </tr>

                          {/* MahaRERA Registration */}
                          <tr
                            className={
                              highlightDiffs &&
                              isRowDifferent(comparedProperties.map((p) => p.reraNumber || ''))
                                ? 'compare-row--diff'
                                : ''
                            }
                          >
                            <td className="compare-td-label">MahaRERA Registration</td>
                            {comparedProperties.map((p) => (
                              <td key={p.id} className="compare-td-value">
                                {p.reraNumber ? (
                                  <a
                                    href={getReraUrl(p.reraNumber)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="compare-rera-link"
                                    onClick={(e) => handleReraClick(e, p.reraNumber)}
                                    title="Click to view MahaRERA registration & copy number"
                                  >
                                    <ShieldCheck size={14} className="text-emerald" />
                                    <span>{p.reraNumber}</span>
                                    <ExternalLink size={11} />
                                  </a>
                                ) : (
                                  <span className="text-muted">RERA in Progress / Verified</span>
                                )}
                              </td>
                            ))}
                          </tr>
                        </>
                      )}

                      {/* ──────── SECTION 2: SPECIFICATIONS & LAYOUT ──────── */}
                      {(compareCategory === 'all' || compareCategory === 'specs') && (
                        <>
                          <tr className="compare-section-header">
                            <td colSpan={comparedProperties.length + 1}>
                              <div className="compare-section-title">
                                <SlidersHorizontal size={16} /> Unit Specifications & Layout
                              </div>
                            </td>
                          </tr>

                          {/* Bedrooms */}
                          <tr
                            className={
                              highlightDiffs &&
                              isRowDifferent(comparedProperties.map((p) => p.bedrooms || ''))
                                ? 'compare-row--diff'
                                : ''
                            }
                          >
                            <td className="compare-td-label">Bedrooms / BHK</td>
                            {comparedProperties.map((p) => (
                              <td key={p.id} className="compare-td-value">
                                <div className="compare-val-with-icon">
                                  <Bed size={14} />
                                  <span>{p.bedrooms ? `${p.bedrooms} BHK` : formatCardType(p.type || p.configurations || '2 BHK')}</span>
                                </div>
                              </td>
                            ))}
                          </tr>

                          {/* Bathrooms */}
                          <tr
                            className={
                              highlightDiffs &&
                              isRowDifferent(comparedProperties.map((p) => p.bathrooms || ''))
                                ? 'compare-row--diff'
                                : ''
                            }
                          >
                            <td className="compare-td-label">Bathrooms</td>
                            {comparedProperties.map((p) => (
                              <td key={p.id} className="compare-td-value">
                                <div className="compare-val-with-icon">
                                  <Bath size={14} />
                                  <span>{p.bathrooms ? `${p.bathrooms} Bathrooms` : 'Standard En-Suite'}</span>
                                </div>
                              </td>
                            ))}
                          </tr>

                          {/* Property Type */}
                          <tr
                            className={
                              highlightDiffs &&
                              isRowDifferent(comparedProperties.map((p) => p.propertyType || p.type || ''))
                                ? 'compare-row--diff'
                                : ''
                            }
                          >
                            <td className="compare-td-label">Asset Type</td>
                            {comparedProperties.map((p) => (
                              <td key={p.id} className="compare-td-value">
                                {p.propertyType || p.type || 'Residential Apartment'}
                              </td>
                            ))}
                          </tr>
                        </>
                      )}

                      {/* ──────── SECTION 3: AMENITIES MATRIX ──────── */}
                      {(compareCategory === 'all' || compareCategory === 'amenities') && (
                        <>
                          <tr className="compare-section-header">
                            <td colSpan={comparedProperties.length + 1}>
                              <div className="compare-section-title">
                                <Sparkles size={16} /> Amenities Comparison Matrix ({allUniqueAmenities.length})
                              </div>
                            </td>
                          </tr>

                          {allUniqueAmenities.map((amenity) => {
                            const presenceList = comparedProperties.map((p) =>
                              propertyHasAmenity(p, amenity)
                            )
                            const isDiff = isRowDifferent(presenceList)

                            return (
                              <tr
                                key={amenity}
                                className={highlightDiffs && isDiff ? 'compare-row--diff' : ''}
                              >
                                <td className="compare-td-label">{amenity}</td>
                                {comparedProperties.map((p, idx) => {
                                  const hasIt = presenceList[idx]
                                  return (
                                    <td key={p.id} className="compare-td-value compare-td-amenity">
                                      {hasIt ? (
                                        <div className="amenity-badge amenity-badge--yes">
                                          <CheckCircle2 size={16} className="text-emerald" />
                                          <span>Included</span>
                                        </div>
                                      ) : (
                                        <div className="amenity-badge amenity-badge--no">
                                          <span className="amenity-dash">—</span>
                                        </div>
                                      )}
                                    </td>
                                  )
                                })}
                              </tr>
                            )
                          })}
                        </>
                      )}

                      {/* ──────── SECTION 4: LOCATION & HIGHLIGHTS ──────── */}
                      {(compareCategory === 'all' || compareCategory === 'location') && (
                        <>
                          <tr className="compare-section-header">
                            <td colSpan={comparedProperties.length + 1}>
                              <div className="compare-section-title">
                                <MapPin size={16} /> Locality & Key Highlights
                              </div>
                            </td>
                          </tr>

                          {/* Full Address */}
                          <tr>
                            <td className="compare-td-label">Locality / Address</td>
                            {comparedProperties.map((p) => (
                              <td key={p.id} className="compare-td-value">
                                <p className="compare-text-sm">{p.address || p.location || 'Navi Mumbai Prime Location'}</p>
                              </td>
                            ))}
                          </tr>

                          {/* Project Highlights */}
                          <tr>
                            <td className="compare-td-label">Key Highlights</td>
                            {comparedProperties.map((p) => {
                              const highlights = Array.isArray(p.highlights)
                                ? p.highlights
                                : typeof p.highlights === 'string'
                                ? p.highlights.split('\n').filter(Boolean)
                                : []

                              return (
                                <td key={p.id} className="compare-td-value">
                                  {highlights.length > 0 ? (
                                    <ul className="compare-bullet-list">
                                      {highlights.slice(0, 4).map((h, i) => (
                                        <li key={i}>
                                          <Check size={12} className="text-emerald" />
                                          <span>{h}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <span className="text-muted">Prime Residential Community</span>
                                  )}
                                </td>
                              )
                            })}
                          </tr>

                          {/* Connectivity */}
                          <tr>
                            <td className="compare-td-label">Connectivity</td>
                            {comparedProperties.map((p) => {
                              const conn = Array.isArray(p.connectivity)
                                ? p.connectivity
                                : typeof p.connectivity === 'string'
                                ? p.connectivity.split('\n').filter(Boolean)
                                : []

                              return (
                                <td key={p.id} className="compare-td-value">
                                  {conn.length > 0 ? (
                                    <ul className="compare-bullet-list">
                                      {conn.slice(0, 3).map((c, i) => (
                                        <li key={i}>
                                          <MapPin size={12} className="text-emerald" />
                                          <span>{c}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <span className="text-muted">Close to Highway & Transport Hubs</span>
                                  )}
                                </td>
                              )
                            })}
                          </tr>
                        </>
                      )}

                      {/* ──────── SECTION 5: ACTIONS & INQUIRY ──────── */}
                      <tr className="compare-actions-row">
                        <td className="compare-td-label">
                          <strong>Next Step</strong>
                        </td>
                        {comparedProperties.map((p) => (
                          <td key={p.id} className="compare-td-value">
                            <div className="compare-col-actions">
                              <Link
                                to={`/properties/${p.id || p._id}`}
                                className="btn-accent compare-col-btn"
                              >
                                View Full Details <ArrowRight size={14} />
                              </Link>
                              <a
                                href="tel:+918591944460"
                                className="btn-outline compare-col-btn"
                              >
                                <Phone size={14} /> Call Advisor
                              </a>
                            </div>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* Bottom CTA */}
        <div className="cart-bottom">
          <Link to="/properties" className="cart-bottom__browse">
            <ArrowLeft size={16} /> Continue Browsing
          </Link>
          <a href="tel:+918591944460" className="cart-bottom__contact">
            <Phone size={16} /> Contact for Shortlisted Properties <ArrowRight size={16} />
          </a>
        </div>
      </div>
    </section>
  )
}
