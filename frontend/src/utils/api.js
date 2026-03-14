import axios from 'axios'

// In production, frontend is served by the same server as the API
// so we use relative URLs - no domain needed
const API_BASE = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
})

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) window.dispatchEvent(new CustomEvent('auth:logout'))
    return Promise.reject(err)
  }
)

export default api
export { API_BASE }
