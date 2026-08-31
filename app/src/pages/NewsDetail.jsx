import { useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAdmin } from '../contexts/AdminContext.jsx'
import {
  Calendar, Globe, Share2, ChevronRight, ArrowRight,
  CheckCircle2, Sparkles, Phone, MessageSquare, Copy, Twitter, Linkedin
} from 'lucide-react'
import './NewsDetail.css'

const placeholderImage = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&q=80'

export default function NewsDetail() {
  const { id } = useParams()
  const { news, isLoadingProperties, fetchNewsById, submitContactInquiry } = useAdmin()

  const [directNews, setDirectNews] = useState(null)
  const [isFetchingDirect, setIsFetchingDirect] = useState(false)

  const newsItem = useMemo(() => {
    if (directNews) return directNews
    if (!news || news.length === 0) return null
    const cleanId = String(id || '').trim()
    const decodedId = decodeURIComponent(cleanId).toLowerCase()
    return (
      news.find(
        (n) =>
          String(n.id) === cleanId ||
          String(n._id) === cleanId ||
          (n.title && n.title.toLowerCase() === decodedId)
      ) || null
    )
  }, [news, id, directNews])

  useEffect(() => {
    if (!newsItem && id && fetchNewsById) {
      let isMounted = true
      setIsFetchingDirect(true)
      fetchNewsById(id)
        .then((found) => {
          if (isMounted) {
            if (found) setDirectNews(found)
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
  }, [newsItem, id, fetchNewsById])

  const [phoneInput, setPhoneInput] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  if (!newsItem && (isLoadingProperties || isFetchingDirect)) {
    return (
      <div className="news-detail-page" style={{ paddingTop: '5.5rem', minHeight: '80vh' }}>
        <div className="container" style={{ maxWidth: '840px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="skeleton-shimmer" style={{ width: '120px', height: '24px', borderRadius: '20px' }} />
          <div className="skeleton-shimmer" style={{ width: '85%', height: '40px', borderRadius: '8px' }} />
          <div className="skeleton-shimmer" style={{ width: '35%', height: '18px', borderRadius: '6px' }} />
          <div className="skeleton-shimmer" style={{ width: '100%', height: '360px', borderRadius: '16px' }} />
          <div className="skeleton-shimmer" style={{ width: '100%', height: '20px' }} />
          <div className="skeleton-shimmer" style={{ width: '95%', height: '20px' }} />
          <div className="skeleton-shimmer" style={{ width: '90%', height: '20px' }} />
        </div>
      </div>
    )
  }

  if (!newsItem) {
    return (
      <div className="page-content" style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
        <div className="container text-center">
          <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>News Article Not Found</h2>
          <p style={{ color: 'var(--gray)', marginBottom: '1.5rem' }}>
            The requested news update could not be found or may have been updated.
          </p>
          <Link to="/news" className="btn-accent">
            Back to All News <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    )
  }

  const mainImage = newsItem.images?.[0] || newsItem.img || placeholderImage

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!phoneInput) return

    await submitContactInquiry({
      phone: phoneInput,
      type: 'News Market Report Request',
      newsTitle: newsItem.title,
      date: new Date().toISOString(),
    })
    setSubmitted(true)
    setPhoneInput('')
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2500)
  }

  const shareText = encodeURIComponent(newsItem.title)
  const shareUrl = encodeURIComponent(window.location.href)

  const relatedNews = news
    .filter((n) => String(n.id) !== String(id))
    .slice(0, 3)

  return (
    <div className="news-detail-page">
      {/* Breadcrumb Navigation */}
      <div className="news-detail__breadcrumbs-wrap">
        <div className="container">
          <nav className="news-detail__breadcrumbs">
            <Link to="/">Home</Link>
            <ChevronRight size={13} />
            <Link to="/news">News</Link>
            <ChevronRight size={13} />
            <span>{newsItem.category || 'Intelligence'}</span>
            <ChevronRight size={13} />
            <span className="current">{newsItem.title}</span>
          </nav>
        </div>
      </div>

      {/* Main Header */}
      <section className="news-detail__hero">
        <div className="container">
          <div className="news-detail__meta-top">
            <span className="badge">{newsItem.category || 'Infrastructure'}</span>
            <span className="news-detail__source"><Globe size={13} /> {newsItem.source || 'RE-ON Intelligence'}</span>
            <span className="news-detail__date"><Calendar size={13} /> {newsItem.date}</span>
          </div>

          <h1 className="news-detail__title">{newsItem.title}</h1>
        </div>
      </section>

      {/* Content Layout with Social Share + Main Body + Sidebar Widget */}
      <section className="section news-detail__main-section">
        <div className="container news-detail__layout">
          {/* Left Social Share Bar */}
          <div className="news-detail__share-col">
            <div className="news-detail__share-sticky">
              <span className="share-label"><Share2 size={14} /> Share</span>
              <a
                href={`https://api.whatsapp.com/send?text=${shareText}%20${shareUrl}`}
                target="_blank"
                rel="noreferrer"
                className="share-btn whatsapp"
                title="Share on WhatsApp"
              >
                <MessageSquare size={16} />
              </a>
              <a
                href={`https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`}
                target="_blank"
                rel="noreferrer"
                className="share-btn twitter"
                title="Share on Twitter"
              >
                <Twitter size={16} />
              </a>
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`}
                target="_blank"
                rel="noreferrer"
                className="share-btn linkedin"
                title="Share on LinkedIn"
              >
                <Linkedin size={16} />
              </a>
              <button onClick={handleCopyLink} className="share-btn copy" title="Copy Link">
                <Copy size={16} />
              </button>
              {copiedLink && <span className="copied-tooltip">Copied!</span>}
            </div>
          </div>

          {/* Middle Main Content */}
          <article className="news-detail__content-col">
            {/* Hero Image */}
            <div className="news-detail__hero-img">
              <img src={mainImage} alt={newsItem.title} />
            </div>

            {/* Table of Contents */}
            <div className="news-detail__toc-card">
              <h4>Table of Contents</h4>
              <ul>
                <li><a href="#summary">1. Headline Summary & Key Findings</a></li>
                <li><a href="#impact">2. Impact on Navi Mumbai Property Values & Buyers</a></li>
                <li><a href="#action">3. Recommended Actions for Homebuyers</a></li>
              </ul>
            </div>

            {/* Article Body */}
            <div className="news-detail__body-text">
              <p className="news-detail__lead">
                {newsItem.excerpt || 'Verified real estate news coverage and policy analysis for Navi Mumbai homebuyers and investors.'}
              </p>

              <div id="summary">
                <h3>1. Headline Summary & Key Findings</h3>
                <p>
                  {newsItem.content ||
                    `The latest announcement marks a major milestone for Navi Mumbai real estate. Capital value growth across Kharghar, Panvel, Ulwe, and Taloja has accelerated as modern connectivity projects near final phase completion.`}
                </p>
              </div>

              <blockquote className="news-detail__quote">
                "Infrastructure developments of this scale directly influence neighborhood livability scores, driving 12–18% capital appreciation over 24-month horizon."
              </blockquote>

              <div id="impact">
                <h3>2. Impact on Navi Mumbai Property Values & Buyers</h3>
                <p>
                  Home loan rates, developer incentives, and localized inventory are converging to create an advantageous buying window for discerning property seekers. Key highlights:
                </p>
                <ul>
                  <li><strong>Infrastructure Boost:</strong> 15-minute average commute reduction.</li>
                  <li><strong>High Rental Demand:</strong> Tech professionals driving 10%+ rental yield increases.</li>
                  <li><strong>Regulatory Transparency:</strong> MahaRERA approvals ensuring buyer security.</li>
                </ul>
              </div>

              {/* Extra Media Gallery if available */}
              {newsItem.images?.length > 1 && (
                <div className="news-detail__extra-media">
                  <h4>News Media & Charts</h4>
                  <div className="news-media-grid">
                    {newsItem.images.slice(1).map((imgUrl, index) => (
                      <img key={index} src={imgUrl} alt={`News media ${index + 2}`} />
                    ))}
                  </div>
                </div>
              )}

              <div id="action">
                <h3>3. Recommended Actions for Homebuyers</h3>
                <p>
                  We recommend consulting with verified real estate advisors before locking down property investments to ensure optimal loan terms, spot booking discounts, and verified title clearance.
                </p>
              </div>
            </div>
          </article>

          {/* Right Consultation Widget */}
          <div className="news-detail__sidebar-col">
            <div className="news-detail__expert-widget">
              <div className="widget-header">
                <div className="widget-icon">
                  <Sparkles size={24} color="var(--red)" />
                </div>
                <h3>Get Expert Market Report</h3>
                <p>Speak directly with our senior market analyst regarding this news development & its impact on your home purchase. 📈</p>
              </div>

              {submitted ? (
                <div className="widget-success">
                  <CheckCircle2 size={32} color="#4ade80" />
                  <h4>Callback Scheduled!</h4>
                  <p>Our market research analyst will connect with you within 15 minutes.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="widget-form">
                  <span className="widget-form-label">Request Free Advisory Callback</span>
                  <input
                    type="tel"
                    required
                    placeholder="Phone Number"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                  />
                  <button type="submit" className="btn-accent widget-btn">
                    Get Free Report <ArrowRight size={16} />
                  </button>
                  <p className="widget-disclaimer">
                    100% Free Consultation • No Spam • Verified Navi Mumbai Experts
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Related News */}
      {relatedNews.length > 0 && (
        <section className="section news-detail__related-section">
          <div className="container">
            <h2 className="headline-lg" style={{ marginBottom: '2rem' }}>
              More Real Estate <span className="text-red">News</span>
            </h2>
            <div className="news-grid">
              {relatedNews.map((n) => (
                <article key={n.id} className="news-card">
                  <div className="news-card__media">
                    <img src={n.images?.[0] || n.img || placeholderImage} alt={n.title} />
                    <span className="news-card__category">{n.category}</span>
                  </div>
                  <div className="news-card__body">
                    <h3 className="news-card__title">{n.title}</h3>
                    <p className="news-card__excerpt">{n.excerpt}</p>
                    <div className="news-card__footer">
                      <Link to={`/news/${n.id}`} className="btn-accent">Read Full Story</Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
