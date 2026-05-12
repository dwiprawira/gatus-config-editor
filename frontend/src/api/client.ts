import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

// Module-level CSRF token — set after login, included in all mutating requests.
let _csrfToken = ''

export function setCsrfToken(token: string) {
  _csrfToken = token
}

export function clearCsrfToken() {
  _csrfToken = ''
}

// Attach CSRF token to all non-GET requests.
api.interceptors.request.use((config) => {
  const method = (config.method ?? '').toUpperCase()
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && _csrfToken) {
    config.headers['X-CSRF-Token'] = _csrfToken
  }
  return config
})

// Redirect to login on 401.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && window.location.pathname !== '/login') {
      clearCsrfToken()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
