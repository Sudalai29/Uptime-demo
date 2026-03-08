import { useState } from 'react'

export default function AddMonitorModal({ onClose, onAdd }) {
  const [form, setForm]     = useState({ name: '', url: '', interval_minutes: 5 })
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.name || !form.url) { setError('Name and URL are required.'); return }

    // Auto-add https:// if missing
    let url = form.url
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url

    setLoading(true)
    setError('')
    try {
      await onAdd({ ...form, url })
      onClose()
    } catch (e) {
      setError('Failed to add monitor. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Monitor</h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        {error && <div className="error-box">{error}</div>}

        <div className="form-group">
          <label>NAME</label>
          <input placeholder="My Website" value={form.name} onChange={e => set('name', e.target.value)} />
        </div>
        <div className="form-group">
          <label>URL</label>
          <input placeholder="https://example.com" value={form.url} onChange={e => set('url', e.target.value)} />
        </div>
        <div className="form-group">
          <label>CHECK INTERVAL</label>
          <select value={form.interval_minutes} onChange={e => set('interval_minutes', Number(e.target.value))}>
            <option value={1}>Every 1 minute</option>
            <option value={5}>Every 5 minutes</option>
            <option value={10}>Every 10 minutes</option>
            <option value={30}>Every 30 minutes</option>
          </select>
        </div>

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Adding...' : 'Add Monitor'}
          </button>
        </div>
      </div>
    </div>
  )
}
