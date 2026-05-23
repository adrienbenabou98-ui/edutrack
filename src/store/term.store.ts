import { create } from 'zustand'
import api from '../api/client'

export interface Term {
  id: string
  name: string
  startDate: string
  endDate: string
  isActive: boolean
  createdAt: string
}

interface TermState {
  activeTerm: Term | null
  terms: Term[]
  loaded: boolean
  lastAutoSwitchMessage: string | null
  load: () => Promise<void>
  loadAll: () => Promise<Term[]>
  clearMessage: () => void
  setTerms: (terms: Term[]) => void
}

export const useTermStore = create<TermState>((set) => ({
  activeTerm: null,
  terms: [],
  loaded: false,
  lastAutoSwitchMessage: null,
  load: async () => {
    try {
      const { data } = await api.get('/terms/active')
      set({
        activeTerm: data.activeTerm,
        loaded: true,
        lastAutoSwitchMessage: data.autoSwitched
          ? `${data.newTermName} has started — switched automatically`
          : null,
      })
    } catch {
      set({ loaded: true })
    }
  },
  loadAll: async () => {
    const { data } = await api.get('/terms')
    set({ terms: data })
    return data
  },
  clearMessage: () => set({ lastAutoSwitchMessage: null }),
  setTerms: (terms) => set({ terms }),
}))
