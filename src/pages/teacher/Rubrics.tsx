import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import api from '../../api/client'
import NotificationBell from '../../components/NotificationBell'

interface Criteria {
  id?: string
  name: string
  description: string
  maxPoints: number
  order: number
}

interface Rubric {
  id: string
  name: string
  criteria: Criteria[]
  createdAt: string
}

function SortableCriteriaRow({
  item, index, onChange, onRemove,
}: {
  item: Criteria; index: number
  onChange: (field: keyof Criteria, value: any) => void
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id ?? `new-${index}`,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2">
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab text-gray-300 dark:text-gray-600 hover:text-gray-500 px-1 py-2"
      >
        ⠿
      </button>
      <input
        value={item.name}
        onChange={e => onChange('name', e.target.value)}
        placeholder="Criterion name"
        className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <input
        value={item.description}
        onChange={e => onChange('description', e.target.value)}
        placeholder="Description (optional)"
        className="flex-[2] border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <input
        type="number" min={0} value={item.maxPoints}
        onChange={e => onChange('maxPoints', Number(e.target.value))}
        placeholder="pts"
        className="w-16 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <button
        type="button"
        onClick={onRemove}
        className="text-red-400 hover:text-red-600 text-sm px-1"
      >
        Remove
      </button>
    </div>
  )
}

const emptyCriteria = (): Criteria => ({ name: '', description: '', maxPoints: 10, order: 0 })

export default function Rubrics() {
  const [rubrics, setRubrics] = useState<Rubric[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [criteria, setCriteria] = useState<Criteria[]>([emptyCriteria()])
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  useEffect(() => {
    api.get('/rubrics').then(r => { setRubrics(r.data); setLoading(false) })
  }, [])

  function openCreate() {
    setEditId(null); setName(''); setCriteria([emptyCriteria()]); setShowForm(true)
  }

  function openEdit(r: Rubric) {
    setEditId(r.id); setName(r.name)
    setCriteria(r.criteria.length ? r.criteria.map(c => ({ ...c })) : [emptyCriteria()])
    setShowForm(true)
  }

  function updateCriteria(i: number, field: keyof Criteria, value: any) {
    setCriteria(cs => cs.map((c, idx) => idx === i ? { ...c, [field]: value } : c))
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = criteria.findIndex((c, i) => (c.id ?? `new-${i}`) === active.id)
    const newIdx = criteria.findIndex((c, i) => (c.id ?? `new-${i}`) === over.id)
    if (oldIdx !== -1 && newIdx !== -1) {
      setCriteria(prev => arrayMove(prev, oldIdx, newIdx))
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { name, criteria: criteria.filter(c => c.name.trim()) }
      if (editId) {
        const { data } = await api.put(`/rubrics/${editId}`, payload)
        setRubrics(rs => rs.map(r => r.id === editId ? data : r))
      } else {
        const { data } = await api.post('/rubrics', payload)
        setRubrics(rs => [data, ...rs])
      }
      setShowForm(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    await api.delete(`/rubrics/${deleteId}`)
    setRubrics(rs => rs.filter(r => r.id !== deleteId))
    setDeleteId(null)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/teacher" className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400">← Back</Link>
          <span className="text-lg font-semibold text-indigo-700">Rubrics</span>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell accent="indigo" />
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">My Rubrics</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Create reusable grading rubrics for assignments</p>
          </div>
          <button onClick={openCreate} className="btn-3d-indigo">+ New Rubric</button>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading…</div>
        ) : rubrics.length === 0 && !showForm ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <p className="text-gray-400">No rubrics yet</p>
            <p className="text-sm text-gray-400 mt-1">Create a rubric to attach to assignments</p>
          </div>
        ) : null}

        {/* Create / Edit Form */}
        {showForm && (
          <form onSubmit={handleSave} className="mb-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rubric name</label>
              <input
                value={name} onChange={e => setName(e.target.value)} required
                placeholder="e.g. Essay Rubric"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Criteria</label>
                <button
                  type="button"
                  onClick={() => setCriteria(cs => [...cs, emptyCriteria()])}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800"
                >
                  + Add criterion
                </button>
              </div>
              <div className="text-xs text-gray-400 flex gap-2 pl-6">
                <span className="flex-1">Name</span>
                <span className="flex-[2]">Description</span>
                <span className="w-16">Points</span>
                <span className="w-12"></span>
              </div>
              <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                <SortableContext
                  items={criteria.map((c, i) => c.id ?? `new-${i}`)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {criteria.map((c, i) => (
                      <SortableCriteriaRow
                        key={c.id ?? `new-${i}`}
                        item={c}
                        index={i}
                        onChange={(field, value) => updateCriteria(i, field, value)}
                        onRemove={() => setCriteria(cs => cs.filter((_, j) => j !== i))}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>

            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
              <button type="submit" disabled={saving} className="btn-3d-indigo disabled:opacity-50">{saving ? 'Saving…' : editId ? 'Update' : 'Create'}</button>
            </div>
          </form>
        )}

        {/* Rubric list */}
        <div className="space-y-3">
          {rubrics.map(r => (
            <div key={r.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900 dark:text-white">{r.name}</h3>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(r)} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">Edit</button>
                  <button onClick={() => setDeleteId(r.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                </div>
              </div>
              {r.criteria.length > 0 ? (
                <div className="space-y-1 mt-2">
                  {r.criteria.map(c => (
                    <div key={c.id} className="flex items-center gap-2 text-xs">
                      <span className="font-medium text-gray-700 dark:text-gray-300">{c.name}</span>
                      {c.description && <span className="text-gray-400 dark:text-gray-500">— {c.description}</span>}
                      <span className="ml-auto text-gray-500 dark:text-gray-400">{c.maxPoints} pts</span>
                    </div>
                  ))}
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 pt-1 border-t border-gray-100 dark:border-gray-700">
                    Total: {r.criteria.reduce((s, c) => s + c.maxPoints, 0)} pts
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400 dark:text-gray-500">No criteria defined</p>
              )}
            </div>
          ))}
        </div>
      </main>

      {/* Delete confirm modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Delete Rubric</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">This rubric will be removed from any assignments it's attached to.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
              <button onClick={handleDelete} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
