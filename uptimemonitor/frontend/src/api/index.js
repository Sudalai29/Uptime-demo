import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || ''
const api  = axios.create({ baseURL: BASE, headers: { 'Content-Type': 'application/json' } })

export const monitorsApi = {
  getAll:      ()           => api.get('/monitors/'),
  create:      (data)       => api.post('/monitors/', data),
  remove:      (id)         => api.delete(`/monitors/${id}`),
  togglePause: (id)         => api.patch(`/monitors/${id}/pause`),
}

export const checksApi = {
  getHistory: (id, hours=24) => api.get(`/checks/${id}?hours=${hours}`),
}
