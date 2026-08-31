import { useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAdmin } from '../contexts/AdminContext.jsx'
import {
  Calendar, User, Share2, ChevronRight, ArrowRight,
  CheckCircle2, MessageSquare, Copy, Twitter, Linkedin
} from 'lucide-react'
import './BlogDetail.css'

const placeholderImage = 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=1200&q=80'

export default function BlogDetail() {
  const { id } = useParams()
  const { blogs, isLoadingProperties, fetchBlogById, submitContactInquiry } = useAdmin()

  const [directBlog, setDirectBlog] = useState(null)
  const [isFetchingDirect, setIsFetchingDirect] = useState(false)

  const blog = useMemo(() => {
    if (directBlog) return directBlog
    if (!blogs || blogs.length === 0) return null
    const cleanId = String(id || '').trim()
    const decodedId = decodeURIComponent(cleanId).toLowerCase()
    return (
      blogs.find(
        (b) =>
          String(b.id) === cleanId ||
          String(b._id) === cleanId ||
          (b.title && b.title.toLowerCase() === decodedId)
      ) || null
    )
  }, [blogs, id, directBlog])

  useEffect(() => {
    if (!blog && id && fetchBlogById) {
      let isMounted = true
      setIsFetchingDirect(true)
      fetchBlogById(id)
        .then((found) => {
          if (isMounted) {
            if (found) setDirectBlog(found)
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
  }, [blog, id, fetchBlogById])

  const [phoneInput, setPhoneInput] = useState('')
  const [subscribed, setSubscribed] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  if (!blog && (isLoadingProperties || isFetchingDirect)) {
    return (
      <div className="blog-detail-page" style={{ paddingTop: '5.5rem', minHeight: '80vh' }}>
        <div className="container" style={{ maxWidth: '840px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="skeleton-shimmer" style={{ width: '100px', height: '24px', borderRadius: '20px' }} />
          <div className="skeleton-shimmer" style={{ width: '80%', height: '40px', borderRadius: '8px' }} />
          <div className="skeleton-shimmer" style={{ width: '40%', height: '18px', borderRadius: '6px' }} />
          <div className="skeleton-shimmer" style={{ width: '100%', height: '360px', borderRadius: '16px' }} />
          <div className="skeleton-shimmer" style={{ width: '100%', height: '20px' }} />
          <div className="skeleton-shimmer" style={{ width: '95%', height: '20px' }} />
          <div className="skeleton-shimmer" style={{ width: '88%', height: '20px' }} />
        </div>
      </div>
    )
  }

  if (!blog) {
    return (
      <div className="page-content" style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
        <div className="container text-center">
          <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Blog Article Not Found</h2>
          <p style={{ color: 'var(--gray)', marginBottom: '1.5rem' }}>
            The requested article could not be loaded or may have been updated.
          </p>
          <Link to="/blog" className="btn-accent">
            Return to Blog <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    )
  }

  const mainImage = blog.images?.[0] || blog.img || placeholderImage

  const handleSubscribe = async (e) => {
    e.preventDefault()
    if (!phoneInput) return

    await submitContactInquiry({
      phone: phoneInput,
      type: 'Blog Advisory Newsletter Subscription',
      blogTitle: blog.title,
      date: new Date().toISOString(),
    })
    setSubscribed(true)
    setPhoneInput('')
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2500)
  }

  const shareText = encodeURIComponent(blog.title)
  const shareUrl = encodeURIComponent(window.location.href)

  const relatedBlogs = blogs
    .filter((b) => String(b.id) !== String(id))
    .slice(0, 3)

  // Parse and render article content cleanly
  const renderArticleContent = () => {
    const rawContent = blog.content || ''
    if (!rawContent.trim()) {
      return (
        <p className="blog-detail__paragraph">
          {blog.excerpt || 'No additional content provided for this article.'}
        </p>
      )
    }

    // Split by paragraphs / double newlines
    const blocks = rawContent.split(/\r?\n\r?\n/).filter(Boolean)

    return blocks.map((block, idx) => {
      const trimmed = block.trim()

      // Check for Markdown-style headings or numbered headings
      if (trimmed.startsWith('# ')) {
        return <h2 key={idx} className="blog-detail__heading-1">{trimmed.replace(/^#\s+/, '')}</h2>
      }
      if (trimmed.startsWith('## ')) {
        return <h3 key={idx} className="blog-detail__heading-2">{trimmed.replace(/^##\s+/, '')}</h3>
      }
      if (trimmed.startsWith('### ')) {
        return <h4 key={idx} className="blog-detail__heading-3">{trimmed.replace(/^###\s+/, '')}</h4>
      }
      if (/^\d+\.\s+[A-Z]/.test(trimmed) && trimmed.length < 100 && !trimmed.includes('\n')) {
        return <h3 key={idx} className="blog-detail__heading-2">{trimmed}</h3>
      }

      // Check for bullet lists
      if (trimmed.includes('\n- ') || trimmed.includes('\n* ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const lines = trimmed.split(/\r?\n/).filter(Boolean)
        return (
          <ul key={idx} className="blog-detail__list">
            {lines.map((line, lIdx) => (
              <li key={lIdx}>{line.replace(/^[-*]\s+/, '')}</li>
            ))}
          </ul>
        )
      }

      // Standard paragraph (handle inline line breaks)
      return (
        <p key={idx} className="blog-detail__paragraph">
          {trimmed.split(/\r?\n/).map((line, lIdx, arr) => (
            <span key={lIdx}>
              {line}
              {lIdx < arr.length - 1 && <br />}
            </span>
          ))}
        </p>
      )
    })
  }

  return (
    <div className="blog-detail-page">
      {/* Breadcrumb Navigation */}
      <div className="blog-detail__breadcrumbs-wrap">
        <div className="container">
          <nav className="blog-detail__breadcrumbs">
            <Link to="/">Home</Link>
            <ChevronRight size={13} />
            <Link to="/blog">Blog</Link>
            <ChevronRight size={13} />
            <span>{blog.category || 'Article'}</span>
            <ChevronRight size={13} />
            <span className="current">{blog.title}</span>
          </nav>
        </div>
      </div>

      {/* Main Header */}
      <section className="blog-detail__hero">
        <div className="container">
          <div className="blog-detail__meta-top">
            <span className="badge">{blog.category || 'Real Estate'}</span>
            <span className="blog-detail__date"><Calendar size={13} /> {blog.date || 'August 2026'}</span>
          </div>

          <h1 className="blog-detail__title">{blog.title}</h1>

          <div className="blog-detail__author-bar">
            <div className="blog-detail__author">
              <div className="author-avatar"><User size={16} /></div>
              <div>
                <strong>Written by RE-ON Advisory Team</strong>
                <span>Real Estate Market Insights</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content Layout with Social Share + Main Body + Sidebar Widget */}
      <section className="section blog-detail__main-section">
        <div className="container blog-detail__layout">
          {/* Left Social Share Bar */}
          <div className="blog-detail__share-col">
            <div className="blog-detail__share-sticky">
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
          <article className="blog-detail__content-col">
            {/* Featured Image */}
            <div className="blog-detail__hero-img">
              <img src={mainImage} alt={blog.title} />
            </div>

            {/* Lead Excerpt */}
            {blog.excerpt && (
              <p className="blog-detail__lead">
                {blog.excerpt}
              </p>
            )}

            {/* Article Body */}
            <div className="blog-detail__body-text">
              {renderArticleContent()}

              {/* Extra Images Gallery if present */}
              {blog.images?.length > 1 && (
                <div className="blog-detail__extra-media">
                  <h4>Article Media Gallery</h4>
                  <div className="blog-media-grid">
                    {blog.images.slice(1).map((imgUrl, index) => (
                      <img key={index} src={imgUrl} alt={`Article media ${index + 2}`} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </article>

          {/* Right Consultation Widget */}
          <div className="blog-detail__sidebar-col">
            <div className="blog-detail__expert-widget">
              <div className="widget-header">
                <div className="widget-avatar">
                  <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&q=80" alt="Home Advisor" />
                </div>
                <h3>Your Expert Home Journey!</h3>
                <p>Join <strong>78%</strong> of our readers who found their dream home with a free consultation. 😊</p>
              </div>

              {subscribed ? (
                <div className="widget-success">
                  <CheckCircle2 size={32} color="#4ade80" />
                  <h4>Thank You!</h4>
                  <p>Our senior real estate consultant will call you shortly.</p>
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="widget-form">
                  <span className="widget-form-label">Get expert advice now!</span>
                  <input
                    type="tel"
                    required
                    placeholder="Phone Number"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                  />
                  <button type="submit" className="btn-accent widget-btn">
                    Subscribe <ArrowRight size={16} />
                  </button>
                  <p className="widget-disclaimer">
                    By clicking "Subscribe" you agree to allow RE-ON Real Estate to contact you regarding property guidance & market updates.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Related Blogs */}
      {relatedBlogs.length > 0 && (
        <section className="section blog-detail__related-section">
          <div className="container">
            <h2 className="headline-lg" style={{ marginBottom: '2rem' }}>
              More Market Insights from <span className="text-red">RE-ON</span>
            </h2>
            <div className="blog__grid">
              {relatedBlogs.map((b) => (
                <article key={b.id} className="blog-card">
                  <div className="blog-card__media-wrap">
                    <Link to={`/blog/${b.id}`} className="blog-card__media">
                      <img src={b.images?.[0] || b.img || placeholderImage} alt={b.title} />
                    </Link>
                  </div>
                  <div className="blog-card__body">
                    <h2 className="blog-card__title">
                      <Link to={`/blog/${b.id}`}>{b.title}</Link>
                    </h2>
                    <p className="blog-card__excerpt">{b.excerpt}</p>
                  </div>
                  <div className="blog-card__footer">
                    <Link to={`/blog/${b.id}`} className="blog-card__read-more-btn">
                      <span className="blog-card__read-more-text">READ MORE</span>
                      <div className="blog-card__arrow-box">
                        <ArrowRight size={20} />
                      </div>
                    </Link>
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
