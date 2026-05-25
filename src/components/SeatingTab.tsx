import { useEffect, useState } from 'react'
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { useDroppable, useDraggable } from '@dnd-kit/core'
import api from '../api/client'

interface Student {
  id: string
  name: string
}

interface Seat {
  row: number
  col: number
  studentId: string | null
}

function DraggableStudent({ id, name }: { id: string; name: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id })
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`px-2 py-1.5 rounded-lg border text-xs font-medium cursor-grab select-none transition-colors ${
        isDragging
          ? 'opacity-30'
          : 'bg-white dark:bg-gray-700 border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
      }`}
    >
      {name}
    </div>
  )
}

function DroppableDesk({
  row, col, studentName, onClear,
}: {
  row: number; col: number; studentName: string | null; onClear: () => void
}) {
  const { isOver, setNodeRef } = useDroppable({ id: `desk-${row}-${col}` })
  return (
    <div
      ref={setNodeRef}
      className={`relative flex items-center justify-center min-h-[52px] rounded-lg border-2 transition-colors text-xs font-medium ${
        studentName
          ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
          : isOver
          ? 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-400 dark:border-indigo-600 border-dashed'
          : 'bg-gray-50 dark:bg-gray-700/50 border-dashed border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500'
      }`}
    >
      {studentName ? (
        <>
          <span className="px-1 text-center leading-tight">{studentName}</span>
          <button
            onClick={onClear}
            className="absolute top-0.5 right-0.5 w-4 h-4 flex items-center justify-center text-indigo-400 hover:text-red-500 text-xs leading-none"
          >×</button>
        </>
      ) : (
        <span>+</span>
      )}
    </div>
  )
}

export default function SeatingTab({ classroomId, students }: { classroomId: string; students: Student[] }) {
  const [rows, setRows] = useState(5)
  const [cols, setCols] = useState(6)
  const [seats, setSeats] = useState<Seat[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  useEffect(() => {
    api.get(`/classrooms/${classroomId}/seating`).then(r => {
      setRows(r.data.rows ?? 5)
      setCols(r.data.cols ?? 6)
      setSeats(r.data.seats ?? [])
    }).catch(() => {})
  }, [classroomId])

  function getStudentAtSeat(row: number, col: number): string | null {
    return seats.find(s => s.row === row && s.col === col)?.studentId ?? null
  }

  function getStudentName(id: string | null): string | null {
    if (!id) return null
    return students.find(s => s.id === id)?.name ?? null
  }

  const assignedIds = new Set(seats.filter(s => s.studentId).map(s => s.studentId!))
  const unassigned = students.filter(s => !assignedIds.has(s.id))

  function clearSeat(row: number, col: number) {
    setSeats(prev => prev.filter(s => !(s.row === row && s.col === col)))
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over) return
    const overId = String(over.id)
    if (!overId.startsWith('desk-')) return
    const [, rowStr, colStr] = overId.split('-')
    const row = parseInt(rowStr)
    const col = parseInt(colStr)
    const studentId = String(active.id)

    setSeats(prev => {
      // Remove student from any existing seat
      const without = prev.filter(s => s.studentId !== studentId && !(s.row === row && s.col === col))
      return [...without, { row, col, studentId }]
    })
  }

  async function save() {
    setSaving(true)
    try {
      await api.put(`/classrooms/${classroomId}/seating`, { rows, cols, seats })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const activeStudent = activeId ? students.find(s => s.id === activeId) : null

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-6 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Rows</label>
          <input
            type="number" min={3} max={8} value={rows}
            onChange={e => setRows(Math.min(8, Math.max(3, Number(e.target.value))))}
            className="w-14 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Columns</label>
          <input
            type="number" min={3} max={10} value={cols}
            onChange={e => setCols(Math.min(10, Math.max(3, Number(e.target.value))))}
            className="w-14 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <button onClick={save} disabled={saving} className="btn-3d-indigo ml-auto disabled:opacity-50">
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Chart'}
        </button>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4">
          {/* Grid */}
          <div className="flex-1 overflow-x-auto">
            <div
              className="grid gap-2"
              style={{ gridTemplateColumns: `repeat(${cols}, minmax(60px, 1fr))` }}
            >
              {Array.from({ length: rows }).map((_, r) =>
                Array.from({ length: cols }).map((_, c) => {
                  const studentId = getStudentAtSeat(r, c)
                  const studentName = getStudentName(studentId)
                  return (
                    <DroppableDesk
                      key={`${r}-${c}`}
                      row={r}
                      col={c}
                      studentName={studentName}
                      onClear={() => clearSeat(r, c)}
                    />
                  )
                })
              )}
            </div>
          </div>

          {/* Unassigned students */}
          <div className="w-36 shrink-0">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Unassigned</p>
            <div className="space-y-1.5">
              {unassigned.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-500">All seated</p>
              ) : (
                unassigned.map(s => (
                  <DraggableStudent key={s.id} id={s.id} name={s.name} />
                ))
              )}
            </div>
          </div>
        </div>

        <DragOverlay>
          {activeStudent ? (
            <div className="px-2 py-1.5 rounded-lg border bg-white dark:bg-gray-700 border-indigo-300 dark:border-indigo-600 text-xs font-medium text-indigo-700 dark:text-indigo-300 shadow-lg">
              {activeStudent.name}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
