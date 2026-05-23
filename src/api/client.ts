import axios from 'axios'

const api = axios.create({ baseURL: 'http://localhost:4000/api' })

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
          const { data } = await axios.post('http://localhost:4000/api/auth/refresh', { refreshToken: refresh })
          localStorage.setItem('access_token', data.access)
          localStorage.setItem('refresh_token', data.refresh)
          error.config.headers.Authorization = `Bearer ${data.access}`
          return api.request(error.config)
        } catch {
          localStorage.clear()
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

export default api
