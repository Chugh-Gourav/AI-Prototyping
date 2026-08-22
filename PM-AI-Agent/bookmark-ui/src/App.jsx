import { useState, useEffect } from 'react'
import { BookmarkPlus, Pin, Trash2, Link as LinkIcon, X, Clock, Sparkles, Plus, RefreshCw, Compass } from 'lucide-react'
import './index.css'

function App() {
  const [bookmarks, setBookmarks] = useState([])
  const [recommendations, setRecommendations] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [tags, setTags] = useState([])
  const [tagInput, setTagInput] = useState('')

  // Load from local storage
  useEffect(() => {
    const savedBookmarks = localStorage.getItem('gouravs-bookmarks') || localStorage.getItem('gemini-bookmarks')
    if (savedBookmarks) {
      try {
        setBookmarks(JSON.parse(savedBookmarks))
      } catch (e) {
        console.error("Failed to parse bookmarks", e)
      }
    }
    
    // Initial fetch from static JSON (fast load for GitHub Pages / offline)
    fetch('./recommendations.json')
      .then(res => {
        if (!res.ok) throw new Error('Static file not found')
        return res.json()
      })
      .then(data => setRecommendations(data))
      .catch(err => console.log("Using initial state or waiting for API:", err))
  }, [])

  const refreshRecommendations = async () => {
    setIsLoading(true)
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/recommendations'
      const response = await fetch(apiUrl)
      if (!response.ok) throw new Error('API request failed')
      const data = await response.json()
      setRecommendations(data)
    } catch (err) {
      console.error("Failed to fetch from API, make sure Python server is running.", err)
      alert("Failed to refresh. If running locally, make sure your Python API server is running on port 8000.")
    } finally {
      setIsLoading(false)
    }
  }

  // Save to local storage
  useEffect(() => {
    localStorage.setItem('gouravs-bookmarks', JSON.stringify(bookmarks))
  }, [bookmarks])

  const handleAddTag = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault()
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()])
      }
      setTagInput('')
    }
  }

  const removeTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!url.trim()) return

    const newBookmark = {
      id: Date.now().toString(),
      url: url.trim(),
      title: title.trim() || url.trim(),
      tags: [...tags],
      createdAt: new Date().toISOString(),
      pinned: false
    }

    setBookmarks([newBookmark, ...bookmarks])
    setUrl('')
    setTitle('')
    setTags([])
    setTagInput('')
  }

  const addRecommendationToBookmarks = (rec) => {
    const newBookmark = {
      id: Date.now().toString() + Math.random(),
      url: rec.source_and_url,
      title: rec.title,
      tags: [rec.pillar, 'AI Recommended'],
      createdAt: new Date().toISOString(),
      pinned: false
    }
    
    // Remove it from recommendations list visually once added
    setRecommendations(recommendations.filter(r => r.source_and_url !== rec.source_and_url))
    setBookmarks([newBookmark, ...bookmarks])
  }

  const deleteBookmark = (id) => {
    setBookmarks(bookmarks.filter(b => b.id !== id))
  }

  const togglePin = (id) => {
    setBookmarks(bookmarks.map(b => 
      b.id === id ? { ...b, pinned: !b.pinned } : b
    ))
  }

  const isExpired = (createdAt) => {
    const bookmarkDate = new Date(createdAt)
    const now = new Date()
    const diffTime = Math.abs(now - bookmarkDate)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays > 28 // 4 weeks
  }

  // Sort: Pinned first, then by date (newest first)
  const sortedBookmarks = [...bookmarks].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return new Date(b.createdAt) - new Date(a.createdAt)
  })

  return (
    <div className="app-container">
      <header>
        <div className="header-badge">
          <Compass size={14} />
          <span>Principal PM Learning Hub</span>
        </div>
        <h1 className="gradient-text">Gourav's Bookmarks</h1>
        <p>Curated reading list for AI frontier, agentic patterns & business strategy.</p>
      </header>

      <div className="glass-panel bookmark-form">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-row">
            <div className="input-group">
              <label>Article URL</label>
              <input 
                type="url" 
                placeholder="https://example.com/article" 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
            </div>
            <div className="input-group">
              <label>Custom Title (Optional)</label>
              <input 
                type="text" 
                placeholder="Key insights on AI agents..." 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
          </div>
          
          <div className="input-group">
            <label>Tags (Press Enter)</label>
            <div className="tags-input-container">
              {tags.map(tag => (
                <span key={tag} className="tag-badge">
                  #{tag}
                  <button type="button" onClick={() => removeTag(tag)}>
                    <X size={13} />
                  </button>
                </span>
              ))}
              <input 
                type="text"
                placeholder={tags.length === 0 ? "Add tags e.g. 'Agentic AI', 'Strategy'..." : ""}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-start' }}>
            <BookmarkPlus size={18} />
            Save Bookmark
          </button>
        </form>
      </div>

      <div className="split-layout">
        <div className="bookmarks-section">
          <div className="section-header">
            <h2 className="section-title">
              <BookmarkPlus size={22} style={{ color: 'var(--primary-accent)' }} /> 
              My Saved Reading
            </h2>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
              {sortedBookmarks.length} {sortedBookmarks.length === 1 ? 'item' : 'items'}
            </span>
          </div>
          <div className="bookmark-list">
            {sortedBookmarks.length === 0 ? (
              <div className="glass-panel empty-state">
                <LinkIcon size={40} className="empty-icon" />
                <h3>No bookmarks saved yet</h3>
                <p>Save articles directly or click the + on AI recommendations to add them here.</p>
              </div>
            ) : (
              sortedBookmarks.map(bookmark => {
                const expired = isExpired(bookmark.createdAt)
                
                return (
                  <div 
                    key={bookmark.id} 
                    className={`bookmark-item ${bookmark.pinned ? 'pinned' : ''} ${expired ? 'expired' : ''}`}
                  >
                    <div className="bookmark-content">
                      <a href={bookmark.url} target="_blank" rel="noopener noreferrer" className="bookmark-title">
                        {bookmark.title}
                      </a>
                      <a href={bookmark.url} target="_blank" rel="noopener noreferrer" className="bookmark-url">
                        {bookmark.url}
                      </a>
                      
                      <div className="bookmark-meta">
                        <span className="bookmark-date">
                          <Clock size={13} />
                          {new Date(bookmark.createdAt).toLocaleDateString(undefined, { 
                            year: 'numeric', month: 'short', day: 'numeric' 
                          })}
                        </span>
                        
                        {expired && (
                          <span className="expired-badge">Expired (&gt; 4 weeks)</span>
                        )}

                        {bookmark.tags && bookmark.tags.map(tag => (
                          <span key={tag} className="tag-badge">#{tag}</span>
                        ))}
                      </div>
                    </div>

                    <div className="bookmark-actions">
                      <button 
                        className={`icon-btn pin-btn ${bookmark.pinned ? 'active' : ''}`}
                        onClick={() => togglePin(bookmark.id)}
                        title={bookmark.pinned ? "Unpin bookmark" : "Pin to top"}
                      >
                        <Pin size={17} fill={bookmark.pinned ? "currentColor" : "none"} />
                      </button>
                      <button 
                        className="icon-btn delete-btn"
                        onClick={() => deleteBookmark(bookmark.id)}
                        title="Delete bookmark"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className="recommendations-section">
          <div className="section-header">
            <h2 className="section-title">
              <Sparkles size={22} style={{ color: 'var(--warm-gold)' }} /> 
              AI Weekly Picks
            </h2>
            <button 
              onClick={refreshRecommendations} 
              disabled={isLoading}
              className="btn-primary" 
              style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
            >
              <RefreshCw size={15} className={isLoading ? "spinning" : ""} />
              {isLoading ? "Curating..." : "Refresh"}
            </button>
          </div>
          <div className="bookmark-list">
            {recommendations.length === 0 ? (
              <div className="glass-panel empty-state">
                <Sparkles size={36} className="empty-icon" />
                <h3>No recommendations loaded</h3>
                <p>Click Refresh to fetch the latest curated reading list via Gemini Search.</p>
              </div>
            ) : (
              recommendations.map((rec, index) => (
                <div key={index} className="bookmark-item" style={{ borderLeft: '4px solid var(--primary-accent)' }}>
                  <div className="bookmark-content">
                    <a href={rec.source_and_url} target="_blank" rel="noopener noreferrer" className="bookmark-title">
                      {rec.title}
                    </a>
                    <span className="bookmark-url">
                      By {rec.author || 'Curated'} &bull; {rec.estimated_read_time || '10 min read'}
                    </span>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.4rem', lineHeight: '1.45' }}>
                      {rec.why_read_this}
                    </p>
                    
                    <div className="bookmark-meta">
                      {rec.difficulty && (
                        <span className="pill-badge">
                          {rec.difficulty}
                        </span>
                      )}
                      {rec.pillar && (
                        <span className="tag-badge">#{rec.pillar}</span>
                      )}
                    </div>
                  </div>

                  <div className="bookmark-actions">
                    <button 
                      className="icon-btn add-btn"
                      onClick={() => addRecommendationToBookmarks(rec)}
                      title="Add to My Saved Reading"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
