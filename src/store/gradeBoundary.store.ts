import { create } from 'zustand'
import api from '../api/client'

export interface Boundary {
  id?: string
  label: string
  minScore: number
  maxScore: number
  colour: string
}

interface BoundaryState {
  boundaries: Boundary[]
  loaded: boolean
  load: () => Promise<void>
  save: (boundaries: Boundary[]) => Promise<void>
}

export function getGrade(score: number | null | undefined, boundaries: Boundary[]): { label: string; colour: string } | null {
  if (score === null || score === undefined) return null
  const sorted = [...boundaries].sort((a, b) => b.minScore - a.minScore)
  return sorted.find(b => score >= b.minScore && score <= b.maxScore) ?? null
}

export const useBoundaryStore = create<BoundaryState>((set) => ({
  boundaries: [],
  loaded: false,
  load: async () => {
    const { data } = await api.get('/grade-boundaries')
    set({ boundaries: data, loaded: true })
  },
  save: async (boundaries) => {
    const { data } = await api.put('/grade-boundaries', { boundaries })
    set({ boundaries: data })
  },
}))
