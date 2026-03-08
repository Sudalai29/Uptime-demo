import { useState } from 'react'

export default function AddMonitorModal({ onClose, onAdd }) {
  const [form, setForm]     = useState({ name: '', url: '', interval_minutes: 5 })
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.name || !form.url) { setError('NODE IDENTIFIER AND TARGET URL ARE REQUIRED.'); return }
    let url = form.url
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url
    setLoading(true); setError('')
    try {
      await onAdd({ ...form, url })
      onClose()
    } catch {
      setError('FAILED TO REGISTER NODE. CHECK API CONNECTION.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">[+] REGISTER NODE</div>

        {error && <div className="error-box">{error}</div>}

        <div className="form-group">
          <label className="form-label">NODE IDENTIFIER</label>
          <input className="form-input" placeholder="My Website" value={form.name} onChange={e => set('name', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">TARGET URL</label>
          <input className="form-input" placeholder="https://example.com" value={form.url} onChange={e => set('url', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">CHECK INTERVAL</label>
          <select className="form-select" value={form.interval_minutes} onChange={e => set('interval_minutes', Number(e.target.value))}>
            <option value={1}>EVERY 1 MINUTE</option>
            <option value={5}>EVERY 5 MINUTES</option>
            <option value={10}>EVERY 10 MINUTES</option>
            <option value={30}>EVERY 30 MINUTES</option>
          </select>
        </div>

        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>CANCEL</button>
          <button className="btn-cyber" onClick={handleSubmit} disabled={loading}>
            {loading ? 'DEPLOYING...' : 'DEPLOY'}
          </button>
        </div>
      </div>
    </div>
  )
}
