import axios from 'axios'

const API_BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000') as string

const api = axios.create({ baseURL: `${API_BASE}/api` })

api.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  res => res,
  async error => {
    if (error.response?.status === 401) {
      const refresh = localStorage.getItem('refresh_token')
      if (refresh) {
        try {
          const { data } = await axios.post(`${API_BASE}/api/auth/refresh`, { refreshToken: refresh })
          localStorage.setItem('access_token', data.access)
          localStorage.setItem('refresh_token', data.refresh)
          error.config.headers.Authorization = `Bearer ${data.access}`
          return api.request(error.config)
        } catch (refreshErr: any) {
          if (refreshErr?.response?.status === 401 || refreshErr?.response?.status === 403) {
            localStorage.clear()
            const isElectron = typeof window !== 'undefined' && (window as any).electron
            window.location.href = isElectron ? '#/login' : '/login'
          }
        }
      }
    }
    return Promise.reject(error)
  }
)

export default api
