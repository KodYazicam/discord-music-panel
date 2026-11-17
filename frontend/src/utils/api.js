import axios from 'axios'
import { useAuthStore } from '../stores/authStore.js'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Authentication endpoints answer 401 for bad input (wrong password, duplicate
// account), so they must not be treated as an expired session.
const AUTH_ENTRY_POINTS = ['/auth/login', '/auth/register']

function isAuthEntryPoint(url = '') {
  const path = url.split('?')[0].split('#')[0].replace(/\/+$/, '')
  return AUTH_ENTRY_POINTS.some(
    (endpoint) => path === endpoint || path.endsWith(`/api${endpoint}`)
  )
}

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized on protected endpoints
    if (error.response?.status === 401 && !isAuthEntryPoint(error.config?.url)) {
      useAuthStore.getState().logout()
      if (typeof window !== 'undefined' && window.location?.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    
    // Handle network errors
    if (!error.response) {
      error.message = 'Sunucuya bağlanılamıyor'
    }
    
    return Promise.reject(error)
  }
)

export default api
