export interface Boundary { label: string; minScore: number; maxScore: number; colour: string }

export const DEFAULT_BOUNDARIES: Omit<Boundary, 'id' | 'teacherId' | 'createdAt'>[] = [
  { label: 'A', minScore: 85, maxScore: 100, colour: '#22c55e' },
  { label: 'B', minScore: 70, maxScore: 84, colour: '#84cc16' },
  { label: 'C', minScore: 55, maxScore: 69, colour: '#eab308' },
  { label: 'D', minScore: 40, maxScore: 54, colour: '#f97316' },
  { label: 'F', minScore: 0,  maxScore: 39, colour: '#ef4444' },
]

export function getGrade(score: number | null | undefined, boundaries: Boundary[]): { label: string; colour: string } | null {
  if (score === null || score === undefined) return null
  const sorted = [...boundaries].sort((a, b) => b.minScore - a.minScore)
  const match = sorted.find(b => score >= b.minScore && score <= b.maxScore)
  return match ? { label: match.label, colour: match.colour } : null
}

export function effectiveScore(totalScore: number | null, curvedScore: number | null): number | null {
  if (curvedScore !== null) return curvedScore
  return totalScore
}

export function applyFlat(score: number, delta: number): number {
  return Math.min(100, Math.max(score, score + delta))
}

export function applyScaleToMax(scores: number[]): number[] {
  const max = Math.max(...scores)
  if (max === 0) return scores
  return scores.map(s => Math.min(100, (s / max) * 100))
}

export function applySqrt(score: number): number {
  return Math.round(Math.sqrt(score / 100) * 100 * 10) / 10
}

export function applyMultiplier(score: number, factor: number): number {
  return Math.min(100, Math.round(score * factor * 10) / 10)
}

export function avg(scores: (number | null)[]): number | null {
  const valid = scores.filter((s): s is number => s !== null)
  if (valid.length === 0) return null
  return Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 10) / 10
}

export interface UnderstandingLevelRecord {
  id: string
  label: string
  colour: string
  order: number
  isAbsent: boolean
  category?: string
}

export function lessonSummativeColour(
  levelIds: (string | null)[],
  teacherLevels: UnderstandingLevelRecord[],
): { colour: string; label: string } | null {
  const nonAbsent = [...teacherLevels]
    .filter(l => !l.isAbsent)
    .sort((a, b) => a.order - b.order)

  if (nonAbsent.length === 0) return null

  const maxPoints = nonAbsent.length - 1

  const attended = levelIds
    .map(id => id ? teacherLevels.find(l => l.id === id) ?? null : null)
    .filter((l): l is UnderstandingLevelRecord => l !== null && !l.isAbsent)

  if (attended.length === 0) return null

  const points = attended.reduce((s, l) => {
    const idx = nonAbsent.findIndex(nl => nl.id === l.id)
    return s + (idx === -1 ? 0 : maxPoints - idx)
  }, 0)

  const ratio = maxPoints > 0 ? points / (attended.length * maxPoints) : 1
  const midIdx = Math.floor((nonAbsent.length - 1) / 2)

  if (ratio >= 0.75) return { colour: nonAbsent[0].colour, label: nonAbsent[0].label }
  if (ratio >= 0.40) return { colour: nonAbsent[midIdx].colour, label: nonAbsent[midIdx].label }
  return { colour: nonAbsent[nonAbsent.length - 1].colour, label: nonAbsent[nonAbsent.length - 1].label }
}

/**
 * Blends quiz average with weighted custom grades.
 * Each custom grade specifies what % of the total grade it represents.
 * The quiz/submission average fills the remaining percentage.
 * If weights exceed 100%, they're normalised so they sum to 100%.
 */
export function computeBlendedOverall(
  quizAvg: number | null,
  gradedCustom: { scorePct: number; weight: number }[],
): number | null {
  const rawCustomTotal = gradedCustom.reduce((s, g) => s + g.weight, 0)
  const customTotal = Math.min(100, rawCustomTotal)
  const quizWeight = Math.max(0, 100 - customTotal)

  // Normalise custom weights if they overflow 100%
  const normalise = rawCustomTotal > 100 ? 100 / rawCustomTotal : 1

  const parts: { score: number; weight: number }[] = gradedCustom.map(g => ({
    score: g.scorePct,
    weight: g.weight * normalise,
  }))
  if (quizAvg !== null && quizWeight > 0) parts.push({ score: quizAvg, weight: quizWeight })

  if (parts.length === 0) return null
  const totalW = parts.reduce((s, p) => s + p.weight, 0)
  if (totalW === 0) return null
  return Math.round(parts.reduce((s, p) => s + p.score * p.weight, 0) / totalW * 10) / 10
}

export function categoryFromGrade(label: string | null): 'needs_support' | 'meeting' | 'exceeding' | null {
  if (!label) return null
  if (['D', 'F'].includes(label)) return 'needs_support'
  if (['C'].includes(label)) return 'meeting'
  return 'exceeding'
}
