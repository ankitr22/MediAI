import axios from 'axios'

// Render injects the backend host (e.g. medical-app-backend.onrender.com)
// We need to prepend https:// if it's a bare host
const rawApiUrl = import.meta.env.VITE_API_URL || ''
const baseURL = rawApiUrl.startsWith('http') ? rawApiUrl : rawApiUrl ? `https://${rawApiUrl}` : ''

const api = axios.create({
  baseURL
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('username')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
