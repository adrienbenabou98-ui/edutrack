import { useState } from 'react'
import api from '../api/client'

interface Props {
  classroomId: string
  assignmentId?: string
  scope?: 'assignment' | 'all'
  onClose: () => void
  onApplied: () => void
}

type CurveType = 'flat' | 'multiplier' | 'sqrt' | 'scale_max'

export default function CurveModal({ classroomId, assignmentId, scope = 'assignment', onClose, onApplied }: Props) {
  const [curveType, setCurveType] = useState<CurveType>('flat')
  const [value, setValue] = useState<string>('5')
  const [applying, setApplying] = useState(false)

  const descriptions: Record<CurveType, string> = {
    flat: 'Adds a fixed number of points to every score (capped at 100)',
    multiplier: 'Multiplies every score by a factor (e.g. 1.1 = +10%)',
    sqrt: 'Applies √(score/100)×100 — helps low scorers more',
    scale_max: 'Scales so the highest score becomes 100 proportionally',
  }

  async function apply() {
    setApplying(true)
    try {
      await api.post('/grade-tracker/curve', {
        scope,
        curveType,
        value: ['flat', 'multiplier'].includes(curveType) ? Number(value) : null,
        assignmentId,
        classroomId,
      })
      onApplied()
      onClose()
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Curve Grades</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Scope</label>
            <div className="text-sm text-gray-500 bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2">
              {scope === 'assignment' ? 'This assignment only' : 'All assignments in classroom'}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Curve type</label>
            <div className="space-y-2">
              {([['flat', 'Flat add'], ['multiplier', 'Multiplier'], ['sqrt', 'Square root'], ['scale_max', 'Scale to max']] as [CurveType, string][]).map(([t, label]) => (
                <label key={t} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${curveType === t ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-600'}`}>
                  <input type="radio" name="curveType" checked={curveType === t} onChange={() => setCurveType(t)} className="mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{descriptions[t]}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {['flat', 'multiplier'].includes(curveType) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {curveType === 'flat' ? 'Points to add' : 'Multiplier factor'}
              </label>
              <input
                type="number"
                value={value}
                onChange={e => setValue(e.target.value)}
                step={curveType === 'multiplier' ? '0.1' : '1'}
                min={curveType === 'multiplier' ? '0.1' : '1'}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                {curveType === 'flat' ? 'All scores capped at 100 after addition' : 'e.g. 1.1 adds 10% to all scores'}
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white">
            Cancel
          </button>
          <button onClick={apply} disabled={applying}
            className="btn-3d-indigo disabled:opacity-50">
            {applying ? 'Applying…' : 'Apply curve'}
          </button>
        </div>
      </div>
    </div>
  )
}
