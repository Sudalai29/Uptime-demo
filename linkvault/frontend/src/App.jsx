import { useState, useEffect, useCallback } from 'react'
import { linksApi } from './api/links'
import LinkCard from './components/LinkCard'
import SearchBar from './components/SearchBar'
import TagFilter from './components/TagFilter'
import AddLinkModal from './components/AddLinkModal'

export default function App() {
  const [links, setLinks]         = useState([])
  const [tags, setTags]           = useState([])
  const [search, setSearch]       = useState('')
  const [activeTag, setActiveTag] = useState('')
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [showModal, setShowModal] = useState(false)

  // ── Fetch links ──────────────────────────────────────────
  const fetchLinks = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = {}
      if (search)    params.search = search
      if (activeTag) params.tag    = activeTag
      const res = await linksApi.getAll(params)
      setLinks(res.data)
    } catch (e) {
      setError('Could not load links. Is the API running?')
    } finally {
      setLoading(false)
    }
  }, [search, activeTag])

  // ── Fetch tags ───────────────────────────────────────────
  const fetchTags = async () => {
    try {
      const res = await linksApi.getTags()
      setTags(res.data)
    } catch { /* non-critical */ }
  }

  useEffect(() => { fetchLinks() }, [fetchLinks])
  useEffect(() => { fetchTags() },  [])

  // ── Add link ─────────────────────────────────────────────
  const handleAdd = async (data) => {
    await linksApi.create(data)
    await fetchLinks()
    await fetchTags()
  }

  // ── Delete link ──────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this link?')) return
    try {
      await linksApi.remove(id)
      setLinks(l => l.filter(x => x.id !== id))
      await fetchTags()
    } catch {
      alert('Failed to delete link.')
    }
  }

  // ── Tag click from card ──────────────────────────────────
  const handleTagClick = (tag) => {
    setActiveTag(prev => prev === tag ? '' : tag)
  }

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">🔖</span>
            <span className="logo-text">LinkVault</span>
          </div>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            + Add Link
          </button>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="main">
        <div className="controls">
          <SearchBar value={search} onChange={setSearch} />
          <TagFilter tags={tags} activeTag={activeTag} onSelect={setActiveTag} />
        </div>

        {/* Stats bar */}
        <div className="stats-bar">
          <span>{links.length} link{links.length !== 1 ? 's' : ''}</span>
          {(search || activeTag) && (
            <button
              className="btn-clear"
              onClick={() => { setSearch(''); setActiveTag('') }}
            >
              Clear filters ✕
            </button>
          )}
        </div>

        {/* Content */}
        {error && <div className="error-banner">{error}</div>}

        {loading ? (
          <div className="empty-state">Loading...</div>
        ) : links.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔖</div>
            <p>{search || activeTag ? 'No links match your search.' : 'No links yet. Add your first one!'}</p>
          </div>
        ) : (
          <div className="links-grid">
            {links.map(link => (
              <LinkCard
                key={link.id}
                link={link}
                onDelete={handleDelete}
                onTagClick={handleTagClick}
              />
            ))}
          </div>
        )}
      </main>

      {/* ── Modal ── */}
      {showModal && (
        <AddLinkModal
          onClose={() => setShowModal(false)}
          onAdd={handleAdd}
        />
      )}
    </div>
  )
}
