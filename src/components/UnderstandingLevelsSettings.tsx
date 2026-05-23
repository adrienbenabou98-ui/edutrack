import { useEffect, useRef, useState } from 'react'
import { HexColorPicker } from 'react-colorful'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { UnderstandingLevel } from '../store/understandingLevel.store'
import { useUnderstandingLevelStore } from '../store/understandingLevel.store'
import api from '../api/client'

type Category = 'EXCEEDING' | 'MEETING' | 'SUPPORT'

function ColourSwatch({ colour, onChange, onSave }: {
  colour: string
  onChange: (c: string) => void
  onSave: (c: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const pickedRef = useRef(colour)
  pickedRef.current = colour

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        onSave(pickedRef.current)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div className="relative flex-shrink-0" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-8 h-8 rounded-lg border-2 border-white dark:border-gray-600 shadow-sm"
        style={{ backgroundColor: colour }}
        title="Change colour"
      />
      {open && (
        <div className="absolute left-0 top-10 z-50 shadow-xl rounded-xl overflow-hidden">
          <HexColorPicker color={colour} onChange={onChange} />
        </div>
      )}
    </div>
  )
}

function SortableRow({ level, onUpdateLabel, onUpdateColour, onSaveColour, onUpdateCategory, onToggleAbsent, onDelete }: {
  level: UnderstandingLevel
  onUpdateLabel: (id: string, label: string) => void
  onUpdateColour: (id: string, colour: string) => void
  onSaveColour: (id: string, colour: string) => void
  onUpdateCategory: (id: string, category: Category) => void
  onToggleAbsent: (id: string, isAbsent: boolean) => void
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: level.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 py-2.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <button
        {...attributes}
        {...listeners}
        className="text-gray-300 dark:text-gray-600 cursor-grab active:cursor-grabbing touch-none select-none text-lg leading-none px-0.5"
        title="Drag to reorder"
      >
        ⠿
      </button>

      <ColourSwatch
        colour={level.colour}
        onChange={c => onUpdateColour(level.id, c)}
        onSave={c => onSaveColour(level.id, c)}
      />

      <input
        value={level.label}
        onChange={e => onUpdateLabel(level.id, e.target.value)}
        onBlur={e => api.put(`/understanding-levels/${level.id}`, { label: e.target.value })}
        className="flex-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-0"
      />

      {!level.isAbsent && (
        <select
          value={level.category}
          onChange={e => onUpdateCategory(level.id, e.target.value as Category)}
          className="border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="EXCEEDING">Exceeding</option>
          <option value="MEETING">Meeting</option>
          <option value="SUPPORT">Needs Support</option>
        </select>
      )}
      {level.isAbsent && (
        <span className="text-xs px-2 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600">
          Absent
        </span>
      )}

      <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 cursor-pointer whitespace-nowrap" title="Marks lesson as absent — excluded from summative">
        <input
          type="checkbox"
          checked={level.isAbsent}
          onChange={e => onToggleAbsent(level.id, e.target.checked)}
          className="rounded accent-indigo-600"
        />
        Absent
      </label>

      <button
        onClick={() => onDelete(level.id)}
        className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 text-xl leading-none px-1"
        title="Delete level"
      >
        ×
      </button>
    </div>
  )
}

export default function UnderstandingLevelsSettings() {
  const { levels, loaded, load, setLevels } = useUnderstandingLevelStore()
  const [deleteWarning, setDeleteWarning] = useState<{ id: string; label: string } | null>(null)

  useEffect(() => { if (!loaded) load() }, [loaded])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = levels.findIndex(l => l.id === active.id)
    const newIdx = levels.findIndex(l => l.id === over.id)
    const reordered = arrayMove(levels, oldIdx, newIdx)
    setLevels(reordered)
    const { data } = await api.put('/understanding-levels/reorder', { orderedIds: reordered.map(l => l.id) })
    setLevels(data)
  }

  function updateLabel(id: string, label: string) {
    setLevels(levels.map(l => l.id === id ? { ...l, label } : l))
  }

  function updateColour(id: string, colour: string) {
    setLevels(levels.map(l => l.id === id ? { ...l, colour } : l))
  }

  async function saveColour(id: string, colour: string) {
    await api.put(`/understanding-levels/${id}`, { colour })
  }

  async function updateCategory(id: string, category: Category) {
    setLevels(levels.map(l => l.id === id ? { ...l, category } : l))
    await api.put(`/understanding-levels/${id}`, { category })
  }

  async function toggleAbsent(id: string, isAbsent: boolean) {
    const updated = levels.map(l => ({
      ...l,
      isAbsent: l.id === id ? isAbsent : (isAbsent ? false : l.isAbsent),
      category: (l.id === id && isAbsent ? 'ABSENT' : l.id === id ? 'SUPPORT' : l.category) as UnderstandingLevel['category'],
    }))
    setLevels(updated)
    await api.put(`/understanding-levels/${id}`, { isAbsent, ...(isAbsent ? { category: 'ABSENT' } : { category: 'SUPPORT' }) })
    const { data } = await api.get('/understanding-levels')
    setLevels(data)
  }

  async function confirmDelete() {
    if (!deleteWarning) return
    const { data } = await api.delete(`/understanding-levels/${deleteWarning.id}`)
    setLevels(levels.filter(l => l.id !== deleteWarning.id))
    setDeleteWarning(null)
    if (data.removedFromLessons > 0) {
      // cleared from lessons silently (SetNull in DB)
    }
  }

  async function addLevel() {
    const { data } = await api.post('/understanding-levels', {
      label: 'New Level',
      colour: '#94a3b8',
      isAbsent: false,
      category: 'SUPPORT',
    })
    setLevels([...levels, data])
  }

  if (!loaded) return <div className="text-center py-8 text-gray-400">Loading…</div>

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Understanding Levels</h2>
        <p className="text-sm text-gray-400 mt-1">
          Customise the levels used in the lesson tracker. Drag to reorder. Only one level can be marked as "absent" — it is excluded from the summative calculation.
        </p>
      </div>

      <div className="mb-2 grid grid-cols-[24px_32px_1fr_120px_72px_24px] gap-3 text-xs font-medium text-gray-400 uppercase tracking-wide px-1">
        <span />
        <span>Colour</span>
        <span>Label</span>
        <span>Category</span>
        <span className="text-center">Absent</span>
        <span />
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={levels.map(l => l.id)} strategy={verticalListSortingStrategy}>
          {levels.map(level => (
            <SortableRow
              key={level.id}
              level={level}
              onUpdateLabel={updateLabel}
              onUpdateColour={updateColour}
              onSaveColour={saveColour}
              onUpdateCategory={updateCategory}
              onToggleAbsent={toggleAbsent}
              onDelete={id => setDeleteWarning({ id, label: levels.find(l => l.id === id)!.label })}
            />
          ))}
        </SortableContext>
      </DndContext>

      <button
        onClick={addLevel}
        className="mt-3 w-full border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl py-2.5 text-sm text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors"
      >
        + Add level
      </button>

      {deleteWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Delete level?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              "<strong>{deleteWarning.label}</strong>" will be removed from all lesson records where it is used.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteWarning(null)}
                className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:text-white dark:hover:bg-gray-700">
                Cancel
              </button>
              <button onClick={confirmDelete}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
