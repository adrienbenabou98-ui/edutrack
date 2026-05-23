import { create } from 'zustand'

interface ThemeState {
  dark: boolean
  toggle: () => void
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  dark: localStorage.getItem('theme') === 'dark',
  toggle: () => {
    const next = !get().dark
    localStorage.setItem('theme', next ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', next)
    set({ dark: next })
  },
}))

if (localStorage.getItem('theme') === 'dark') {
  document.documentElement.classList.add('dark')
}
