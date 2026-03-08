import axios from 'axios'

// In production (ECS), VITE_API_URL is set to https://api.linkvault.yourdomain.com
// In local dev, vite proxy forwards /links → http://localhost:8000
const BASE_URL = import.meta.env.VITE_API_URL || ''

const client = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

export const linksApi = {
  getAll:    (params = {}) => client.get('/links/', { params }),
  getById:   (id)          => client.get(`/links/${id}`),
  create:    (data)        => client.post('/links/', data),
  update:    (id, data)    => client.put(`/links/${id}`, data),
  remove:    (id)          => client.delete(`/links/${id}`),
  getTags:   ()            => client.get('/links/tags/all'),
}
