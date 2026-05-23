import { create } from 'zustand'
import api from '../api/client'

export interface UnderstandingLevel {
  id: string
  label: string
  colour: string
  order: number
  isAbsent: boolean
  category: 'EXCEEDING' | 'MEETING' | 'SUPPORT' | 'ABSENT'
}

interface UnderstandingLevelStore {
  levels: UnderstandingLevel[]
  loaded: boolean
  load: () => Promise<void>
  setLevels: (levels: UnderstandingLevel[]) => void
}

export const useUnderstandingLevelStore = create<UnderstandingLevelStore>((set) => ({
  levels: [],
  loaded: false,
  load: async () => {
    const { data } = await api.get('/understanding-levels')
    set({ levels: data, loaded: true })
  },
  setLevels: (levels) => set({ levels }),
}))
