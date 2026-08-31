import { useAdmin } from '../contexts/AdminContext.jsx'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import './Blog.css'

export default function Blog() {
  const { blogs } = useAdmin()

  const placeholderImage = 'https://images.unsplash.com/photo-1494526585095-c41746248156?w=900&q=80'

  return (
    <div className="blog-page">
      <section className="page-hero">
        <div className="container">
          <p className="section-label">Latest Updates</p>
          <h1 className="headline-xl" style={{ fontSize: 'clamp(2.5rem,7vw,5.5rem)', marginTop: '0.75rem' }}>
            RE-ON <span className="text-red">Blog</span>
          </h1>
          <p style={{ color: 'var(--gray)', marginTop: '1rem', maxWidth: 520 }}>
            Read market insights, property investment tips, and local Navi Mumbai real estate updates curated by the RE-ON team.
          </p>
        </div>
      </section>

      <section className="section blog__list">
        <div className="container">
          <div className="blog__grid">
            {blogs.map((blog) => (
              <article key={blog.id} className="blog-card reveal-on-scroll">
                <div className="blog-card__media-wrap">
                  <Link to={`/blog/${blog.id}`} className="blog-card__media">
                    <img src={blog.images?.[0] || blog.img || placeholderImage} alt={blog.title} />
                  </Link>
                </div>
                <div className="blog-card__body">
                  <h2 className="blog-card__title">
                    <Link to={`/blog/${blog.id}`}>{blog.title}</Link>
                  </h2>
                  <p className="blog-card__excerpt">{blog.excerpt}</p>
                </div>
                <div className="blog-card__footer">
                  <Link to={`/blog/${blog.id}`} className="blog-card__read-more-btn">
                    <span className="blog-card__read-more-text">READ MORE</span>
                    <div className="blog-card__arrow-box">
                      <ArrowRight size={20} />
                    </div>
                  </Link>
                </div>
              </article>
            ))}
            {blogs.length === 0 && (
              <div className="blog__empty">
                <p>No blog posts available yet.</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
