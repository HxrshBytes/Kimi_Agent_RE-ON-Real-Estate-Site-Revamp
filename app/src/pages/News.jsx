import { useState, useMemo } from 'react'
import { useAdmin } from '../contexts/AdminContext.jsx'
import { Link } from 'react-router-dom'
import { Search, Calendar, Globe, ArrowRight, X, Sparkles, Filter } from 'lucide-react'
import './News.css'

export default function News() {
  const { news = [] } = useAdmin()
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedArticle, setSelectedArticle] = useState(null)

  const placeholderImage = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=900&q=80'

  const categories = useMemo(() => {
    const set = new Set(['All'])
    news.forEach(item => {
      if (item.category) set.add(item.category)
    })
    return Array.from(set)
  }, [news])

  const filteredNews = useMemo(() => {
    return news.filter(item => {
      const matchCategory = selectedCategory === 'All' || item.category === selectedCategory
      const query = search.trim().toLowerCase()
      const matchSearch = !query ||
        item.title?.toLowerCase().includes(query) ||
        item.category?.toLowerCase().includes(query) ||
        item.source?.toLowerCase().includes(query) ||
        item.excerpt?.toLowerCase().includes(query) ||
        item.content?.toLowerCase().includes(query)
      return matchCategory && matchSearch
    })
  }, [news, selectedCategory, search])

  const breakingNews = useMemo(() => {
    return news.length > 0 ? news[0] : null
  }, [news])

  return (
    <div className="news-page">
      {/* Page Hero */}
      <section className="page-hero news-hero">
        <div className="container">
          <div className="news-hero__badge fade-up">
            <Sparkles size={14} /> Real Estate Intelligence
          </div>
          <h1 className="headline-xl fade-up fade-up-delay-1" style={{ fontSize: 'clamp(2.5rem, 6.5vw, 5rem)', marginTop: '0.5rem' }}>
            Real Estate <span className="text-red">News</span> & Market Updates
          </h1>
          <p className="news-hero__desc fade-up fade-up-delay-2">
            Stay ahead with verified real estate headlines, Navi Mumbai infrastructure developments, RBI rate updates, and property market analysis.
          </p>

          {/* Real-time Search */}
          <div className="news-search-bar fade-up fade-up-delay-3">
            <Search size={18} className="news-search__icon" />
            <input
              type="text"
              placeholder="Search news by keyword, location, policy, or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="news-search__clear" onClick={() => setSearch('')}>
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Category Filter */}
      <section className="news-filter-section">
        <div className="container">
          <div className="news-categories">
            <span className="news-categories__label"><Filter size={14} /> Category:</span>
            {categories.map((cat) => (
              <button
                key={cat}
                className={`news-cat-btn ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Breaking News Banner (Top Story) */}
      {breakingNews && !search && selectedCategory === 'All' && (
        <section className="section news-breaking-section">
          <div className="container">
            <div className="breaking-card reveal-on-scroll">
              <div className="breaking-card__img">
                <img src={breakingNews.images?.[0] || breakingNews.img || placeholderImage} alt={breakingNews.title} />
                <span className="breaking-card__tag">TOP STORY</span>
              </div>
              <div className="breaking-card__content">
                <div className="news-meta">
                  <span className="badge">{breakingNews.category || 'Market Update'}</span>
                  <span className="news-meta__source"><Globe size={13} /> {breakingNews.source || 'RE-ON Intelligence'}</span>
                  <span className="news-meta__date"><Calendar size={13} /> {breakingNews.date}</span>
                </div>
                <h2 className="breaking-card__title">{breakingNews.title}</h2>
                <p className="breaking-card__excerpt">{breakingNews.excerpt}</p>
                <div className="breaking-card__footer">
                  <Link to={`/news/${breakingNews.id || breakingNews._id}`} className="btn-accent">
                    Read Dedicated Page <ArrowRight size={16} />
                  </Link>
                  <button className="btn-outline" onClick={() => setSelectedArticle(breakingNews)}>
                    Quick View
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* News Grid */}
      <section className="section news-list-section">
        <div className="container">
          <div className="section-header">
            <div>
              <p className="section-label">All Headlines</p>
              <h2 className="headline-lg">
                {selectedCategory === 'All' ? 'Latest News Articles' : `${selectedCategory} News`}
                <span className="news-count-chip">{filteredNews.length}</span>
              </h2>
            </div>
          </div>

          {filteredNews.length > 0 ? (
            <div className="news-grid">
              {filteredNews.map((item) => (
                <article key={item.id || item._id} className="news-card reveal-on-scroll">
                  <Link to={`/news/${item.id || item._id}`} className="news-card__media">
                    <img src={item.images?.[0] || item.img || placeholderImage} alt={item.title} />
                    <span className="news-card__category">{item.category || 'News'}</span>
                  </Link>
                  <div className="news-card__body">
                    <div className="news-card__meta">
                      <span><Globe size={12} /> {item.source || 'RE-ON'}</span>
                      <span><Calendar size={12} /> {item.date}</span>
                    </div>
                    <h3 className="news-card__title">
                      <Link to={`/news/${item.id || item._id}`} style={{ color: 'inherit' }}>{item.title}</Link>
                    </h3>
                    <p className="news-card__excerpt">{item.excerpt}</p>
                    <div className="news-card__footer">
                      <Link to={`/news/${item.id || item._id}`} className="btn-accent news-card__btn">
                        Read Article <ArrowRight size={14} />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="news-empty">
              <h3>No news articles found</h3>
              <p>Try searching for a different keyword or select another category.</p>
              <button className="btn-accent" onClick={() => { setSearch(''); setSelectedCategory('All'); }}>
                Reset Filters
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Full Article Modal Overlay */}
      {selectedArticle && (
        <div className="news-modal-overlay" onClick={() => setSelectedArticle(null)}>
          <div className="news-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="news-modal-close" onClick={() => setSelectedArticle(null)} aria-label="Close">
              <X size={20} />
            </button>
            <div className="news-modal-header">
              <div className="news-meta">
                <span className="badge">{selectedArticle.category}</span>
                <span className="news-meta__source"><Globe size={13} /> {selectedArticle.source}</span>
                <span className="news-meta__date"><Calendar size={13} /> {selectedArticle.date}</span>
              </div>
              <h2>{selectedArticle.title}</h2>
            </div>
            {selectedArticle.images?.[0] && (
              <div className="news-modal-img">
                <img src={selectedArticle.images[0]} alt={selectedArticle.title} />
              </div>
            )}
            <div className="news-modal-body">
              <p className="news-modal-lead">{selectedArticle.excerpt}</p>
              <div className="news-modal-text">
                {selectedArticle.content || selectedArticle.excerpt}
              </div>
              {selectedArticle.images?.length > 1 && (
                <div className="news-modal-gallery">
                  <h4>Article Media ({selectedArticle.images.length})</h4>
                  <div className="news-gallery-grid">
                    {selectedArticle.images.map((imgUrl, idx) => (
                      <img key={idx} src={imgUrl} alt={`News graphic ${idx + 1}`} />
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="news-modal-footer">
              <Link to="/contact" className="btn-accent" onClick={() => setSelectedArticle(null)}>
                Inquire With Real Estate Advisor <ArrowRight size={16} />
              </Link>
              <button className="btn-outline" onClick={() => setSelectedArticle(null)}>
                Close Article
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
