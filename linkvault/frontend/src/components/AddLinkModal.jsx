import { useState } from 'react'

export default function AddLinkModal({ onClose, onAdd }) {
  const [form, setForm] = useState({ url: '', title: '', tags: '', notes: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.url || !form.title) {
      setError('URL and Title are required.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await onAdd({
        url: form.url,
        title: form.title,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        notes: form.notes,
      })
      onClose()
    } catch (e) {
      setError('Failed to save link. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add New Link</h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <div className="form-group">
          <label>URL *</label>
          <input
            type="url"
            placeholder="https://example.com"
            value={form.url}
            onChange={e => set('url', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Title *</label>
          <input
            placeholder="My awesome link"
            value={form.title}
            onChange={e => set('title', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Tags <span className="hint">(comma separated)</span></label>
          <input
            placeholder="aws, devops, python"
            value={form.tags}
            onChange={e => set('tags', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Notes</label>
          <textarea
            rows={3}
            placeholder="Optional notes..."
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
          />
        </div>

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Saving...' : 'Save Link'}
          </button>
        </div>
      </div>
    </div>
  )
}
