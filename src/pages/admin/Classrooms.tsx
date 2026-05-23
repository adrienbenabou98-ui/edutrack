import { useEffect, useState } from 'react'
import AdminLayout from './AdminLayout'
import api from '../../api/client'

interface Classroom {
  id: string
  name: string
  classCode: string
  yearLevel: number | null
  archived: boolean
  createdAt: string
  teacher: { id: string; name: string; email: string | null }
  _count: { enrollments: number; assignments: number }
}

interface Student {
  id: string
  name: string
  email: string | null
  lastLoginAt: string | null
  joinedAt: string
}

function timeAgo(date: string | null) {
  if (!date) return 'Never'
  const diff = Date.now() - new Date(date).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return new Date(date).toLocaleDateString()
}

export default function Classrooms() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [archivedFilter, setArchivedFilter] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [students, setStudents] = useState<Record<string, Student[]>>({})
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (archivedFilter) params.set('archived', archivedFilter)
      const { data } = await api.get(`/admin/classrooms?${params}`)
      setClassrooms(data)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [search, archivedFilter])

  async function toggleExpand(id: string) {
    if (expanded === id) { setExpanded(null); return }
    setExpanded(id)
    if (!students[id]) {
      const { data } = await api.get(`/admin/classrooms/${id}/students`)
      setStudents(s => ({ ...s, [id]: data }))
    }
  }

  async function handleArchive(id: string) {
    await api.post(`/admin/classrooms/${id}/archive`)
    load()
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    try {
      await api.delete(`/admin/classrooms/${deleteId}`)
      setDeleteId(null)
      load()
    } finally { setDeleting(false) }
  }

  async function removeStudent(classroomId: string, studentId: string) {
    await api.delete(`/admin/classrooms/${classroomId}/students/${studentId}`)
    setStudents(s => ({ ...s, [classroomId]: s[classroomId].filter(st => st.id !== studentId) }))
  }

  const active = classrooms.filter(c => !c.archived).length

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Classrooms</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage all classrooms on the platform</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Total', value: classrooms.length, colour: 'text-gray-900 dark:text-white' },
            { label: 'Active', value: active, colour: 'text-green-600 dark:text-green-400' },
            { label: 'Archived', value: classrooms.length - active, colour: 'text-gray-400' },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.colour}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-3 mb-4">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search classrooms…"
            className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <select value={archivedFilter} onChange={e => setArchivedFilter(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">All</option>
            <option value="false">Active</option>
            <option value="true">Archived</option>
          </select>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : classrooms.length === 0 ? (
            <div className="text-center py-16 text-sm text-gray-500 dark:text-gray-400">No classrooms found</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Classroom</th>
                  <th className="px-4 py-3 text-left">Teacher</th>
                  <th className="px-4 py-3 text-left">Students</th>
                  <th className="px-4 py-3 text-left">Assignments</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {classrooms.map(c => (
                  <>
                    <tr key={c.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${c.archived ? 'opacity-60' : ''}`}>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{c.name}</p>
                        <p className="text-xs text-gray-400 font-mono">{c.classCode}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{c.teacher.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{c._count.enrollments}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{c._count.assignments}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.archived ? 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400' : 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'}`}>
                          {c.archived ? 'Archived' : 'Active'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">{new Date(c.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => toggleExpand(c.id)} className="px-2 py-1 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded">
                            {expanded === c.id ? 'Hide' : 'Students'}
                          </button>
                          <button onClick={() => handleArchive(c.id)} className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                            {c.archived ? 'Unarchive' : 'Archive'}
                          </button>
                          <button onClick={() => setDeleteId(c.id)} className="px-2 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">Delete</button>
                        </div>
                      </td>
                    </tr>
                    {expanded === c.id && (
                      <tr key={`${c.id}-students`}>
                        <td colSpan={7} className="px-4 py-3 bg-gray-50 dark:bg-gray-700/30">
                          {!students[c.id] ? (
                            <div className="text-xs text-gray-400">Loading…</div>
                          ) : students[c.id].length === 0 ? (
                            <div className="text-xs text-gray-400">No enrolled students</div>
                          ) : (
                            <div className="grid grid-cols-2 gap-2">
                              {students[c.id].map(st => (
                                <div key={st.id} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-700">
                                  <div>
                                    <p className="text-xs font-medium text-gray-900 dark:text-white">{st.name}</p>
                                    <p className="text-xs text-gray-400">{st.email ?? '—'} · Last login: {timeAgo(st.lastLoginAt)}</p>
                                  </div>
                                  <button onClick={() => removeStudent(c.id, st.id)} className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-300">Remove</button>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Delete Classroom</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">This will permanently delete the classroom and all its assignments, submissions, and grades. This cannot be undone.</p>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
