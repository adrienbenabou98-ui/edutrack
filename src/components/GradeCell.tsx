import { useMemo } from 'react'
import { getGrade } from '../store/gradeBoundary.store'
import type { Boundary } from '../store/gradeBoundary.store'

interface Props {
  value: number | null
  boundaries: Boundary[]
  readOnly?: boolean
  onChange?: (v: number | null) => void
  size?: 'sm' | 'md'
}

export default function GradeCell({ value, boundaries, readOnly = false, onChange, size = 'md' }: Props) {
  const grade = useMemo(() => getGrade(value, boundaries), [value, boundaries])

  const bg = grade?.colour ?? '#e5e7eb'
  const textColor = grade ? 'white' : '#6b7280'

  const padding = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm'

  if (readOnly) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 rounded-lg font-medium ${padding}`}
        style={{ backgroundColor: bg, color: textColor }}
      >
        <span>{value !== null ? `${value.toFixed(1)}%` : '—'}</span>
        {grade && <span className="opacity-80 text-xs font-bold">{grade.label}</span>}
      </div>
    )
  }

  return (
    <div className="relative inline-flex items-center">
      <input
        type="number"
        min={0}
        max={100}
        value={value ?? ''}
        onChange={e => onChange?.(e.target.value === '' ? null : Math.min(100, Math.max(0, Number(e.target.value))))}
        className={`w-20 rounded-lg border-0 font-medium text-center focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-400 ${padding}`}
        style={{ backgroundColor: bg, color: textColor }}
        placeholder="—"
      />
      {grade && (
        <span className="absolute right-1.5 text-xs font-bold opacity-70" style={{ color: textColor }}>
          {grade.label}
        </span>
      )}
    </div>
  )
}
