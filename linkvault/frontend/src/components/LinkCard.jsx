export default function LinkCard({ link, onDelete, onTagClick }) {
  const domain = (() => {
    try { return new URL(link.url).hostname }
    catch { return link.url }
  })()

  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`

  const formatDate = (iso) => {
    try {
      return new Date(iso).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
      })
    } catch { return '' }
  }

  return (
    <div className="link-card">
      <div className="link-card-header">
        <img
          src={faviconUrl}
          alt=""
          className="favicon"
          onError={e => { e.target.style.display = 'none' }}
        />
        <div className="link-card-title">
          <a href={link.url} target="_blank" rel="noopener noreferrer">
            {link.title}
          </a>
          <span className="link-domain">{domain}</span>
        </div>
        <button
          className="btn-icon btn-delete"
          onClick={() => onDelete(link.id)}
          title="Delete"
        >
          🗑
        </button>
      </div>

      {link.notes && <p className="link-notes">{link.notes}</p>}

      <div className="link-card-footer">
        <div className="tags">
          {link.tags?.map(tag => (
            <button
              key={tag}
              className="tag"
              onClick={() => onTagClick(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
        <span className="link-date">{formatDate(link.created_at)}</span>
      </div>
    </div>
  )
}
