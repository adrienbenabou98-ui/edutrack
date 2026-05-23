interface Segment {
  label: string
  weight: number
  score: number | null
  colour: string
}

interface Props {
  quizWeight: number
  quizScore: number | null
  customItems: { title: string; weight: number; scorePct: number | null }[]
  boundaries: { minScore: number; colour: string }[]
}

function scoreColour(score: number | null, boundaries: { minScore: number; colour: string }[]): string {
  if (score === null) return '#d1d5db'
  const sorted = [...boundaries].sort((a, b) => b.minScore - a.minScore)
  return sorted.find(b => score >= b.minScore)?.colour ?? '#d1d5db'
}

export default function GradeBreakdownBar({ quizWeight, quizScore, customItems, boundaries }: Props) {
  const segments: Segment[] = []

  for (const item of customItems) {
    if (item.weight > 0) {
      segments.push({ label: item.title, weight: item.weight, score: item.scorePct, colour: scoreColour(item.scorePct, boundaries) })
    }
  }
  if (quizWeight > 0) {
    segments.push({ label: 'Quizzes/Assignments', weight: quizWeight, score: quizScore, colour: scoreColour(quizScore, boundaries) })
  }

  const totalWeight = segments.reduce((s, g) => s + g.weight, 0)
  if (totalWeight === 0 || segments.length === 0) return null

  return (
    <div className="space-y-2">
      <div className="flex rounded-lg overflow-hidden h-5 gap-px">
        {segments.map((seg, i) => (
          <div
            key={i}
            style={{ width: `${(seg.weight / totalWeight) * 100}%`, backgroundColor: seg.colour }}
            title={`${seg.label}: ${seg.score !== null ? `${seg.score.toFixed(1)}%` : 'No grade'} (${seg.weight}% of grade)`}
            className="transition-all"
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: seg.colour }} />
            <span className="truncate max-w-[120px]">{seg.label}</span>
            <span className="text-gray-400">·</span>
            <span className="font-medium">{seg.weight}%</span>
            {seg.score !== null && <span className="text-gray-400">({seg.score.toFixed(1)}%)</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
