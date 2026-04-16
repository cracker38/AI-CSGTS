import axios from 'axios'
import { getToken, logout } from './auth'

/**
 * Axios joins baseURL + url. If baseURL ends with `/api` and each request uses `/api/...`,
 * the result is `/api/api/...` → Spring returns 404. Strip a trailing `/api` from env.
 */
function normalizeApiBaseUrl(raw) {
  if (raw == null || String(raw).trim() === '') return 'http://localhost:8080'
  const trimmed = String(raw).trim().replace(/\/+$/, '')
  return trimmed.replace(/\/api$/i, '')
}

const API_BASE_URL =
  import.meta.env.DEV && String(import.meta.env.VITE_API_BASE_URL || '').trim() === ''
    ? ''
    : normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080')

export const api = axios.create({
  baseURL: API_BASE_URL
})

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status
    if (status === 401) {
      // Token expired/invalid or backend restarted with new JWT secret.
      logout()
      if (window.location.pathname !== '/login') {
        window.location.assign('/login')
      }
    }
    return Promise.reject(err)
  }
)

