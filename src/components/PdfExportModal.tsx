import { useState } from 'react'
import api from '../api/client'

interface Unit { id: string; name: string }

interface Props {
  studentId: string
  studentName: string
  classroomId: string
  units: Unit[]
  onClose: () => void
}

interface Sections {
  assignments: boolean
  lessons: boolean
  assessment: boolean
  comments: boolean
}

export default function PdfExportModal({ studentId, studentName, classroomId, units, onClose }: Props) {
  const [selectedUnitIds, setSelectedUnitIds] = useState<Set<string>>(new Set(units.map(u => u.id)))
  const [sections, setSections] = useState<Sections>({ assignments: true, lessons: true, assessment: true, comments: true })
  const [generating, setGenerating] = useState(false)

  function toggleUnit(id: string) {
    setSelectedUnitIds(s => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function selectAll() { setSelectedUnitIds(new Set(units.map(u => u.id))) }
  function deselectAll() { setSelectedUnitIds(new Set()) }

  function toggleSection(key: keyof Sections) {
    setSections(s => ({ ...s, [key]: !s[key] }))
  }

  async function download() {
    setGenerating(true)
    try {
      const res = await api.post(
        `/export/student/${studentId}/pdf`,
        { classroomId, unitIds: [...selectedUnitIds], sections },
        { responseType: 'blob' },
      )
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `${studentName.replace(/\s+/g, '_')}_Report.pdf`
      a.click()
      URL.revokeObjectURL(url)
      onClose()
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Download Report</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-5">
          {/* Unit selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Units to include</label>
              <div className="flex gap-2">
                <button onClick={selectAll} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">Select all</button>
                <span className="text-gray-300 dark:text-gray-600">·</span>
                <button onClick={deselectAll} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">Deselect all</button>
              </div>
            </div>
            {units.length === 0 ? (
              <p className="text-sm text-gray-400 py-2">No units in this classroom yet.</p>
            ) : (
              <div className="space-y-1.5 border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                {units.map(u => (
                  <label key={u.id} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedUnitIds.has(u.id)}
                      onChange={() => toggleUnit(u.id)}
                      className="w-4 h-4 rounded accent-indigo-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{u.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Section toggles */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Include sections</label>
            <div className="space-y-2">
              {([
                ['lessons', 'Lesson Understanding'],
                ['assessment', 'End of Unit Assessment'],
                ['assignments', 'Assignment Grades'],
                ['comments', 'Teacher Notes'],
              ] as [keyof Sections, string][]).map(([key, label]) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={sections[key]} onChange={() => toggleSection(key)}
                    className="w-4 h-4 rounded accent-indigo-600" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:text-white dark:hover:bg-gray-700">
            Cancel
          </button>
          <button
            onClick={download}
            disabled={generating || selectedUnitIds.size === 0}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {generating ? 'Generating…' : `Download PDF${selectedUnitIds.size > 0 ? ` (${selectedUnitIds.size} unit${selectedUnitIds.size !== 1 ? 's' : ''})` : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}
