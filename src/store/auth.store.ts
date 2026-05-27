import { create } from 'zustand'
import api from '../api/client'

interface User {
  id: string
  email: string
  name: string
  role: 'TEACHER' | 'STUDENT' | 'ADMIN'
}

interface AuthState {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  loginWithUsername: (username: string, classCode: string) => Promise<void>
  register: (email: string, password: string, name: string, role: string) => Promise<void>
  logout: () => void
  loadUser: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('access_token', data.access)
    localStorage.setItem('refresh_token', data.refresh)
    set({ user: data.user })
  },

  loginWithUsername: async (username, classCode) => {
    const { data } = await api.post('/auth/login', { username, classCode })
    localStorage.setItem('access_token', data.access)
    localStorage.setItem('refresh_token', data.refresh)
    set({ user: data.user })
  },

  register: async (email, password, name, role) => {
    const { data } = await api.post('/auth/register', { email, password, name, role })
    localStorage.setItem('access_token', data.access)
    localStorage.setItem('refresh_token', data.refresh)
    set({ user: data.user })
  },

  logout: () => {
    localStorage.clear()
    set({ user: null })
  },

  loadUser: async () => {
    const token = localStorage.getItem('access_token')
    if (!token) { set({ loading: false }); return }
    try {
      const { data } = await api.get('/auth/me')
      set({ user: data, loading: false })
    } catch {
      // Don't clear localStorage here — the refresh interceptor handles token expiry
      // and redirects to login only on confirmed 401/403 from the refresh endpoint.
      // Clearing here would log the user out on Railway cold-start network timeouts.
      set({ loading: false })
    }
  },
}))
