import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor — attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor — handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
      const isAdminPath = window.location.pathname.startsWith('/admin')
      const redirectTo = isAdminPath ? '/admin/login' : '/login'
      if (window.location.pathname !== redirectTo) {
        window.location.href = redirectTo
      }
    }
    return Promise.reject(error)
  }
)

export default api
