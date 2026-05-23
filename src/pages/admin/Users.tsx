import { useEffect, useState } from 'react'
import AdminLayout from './AdminLayout'
import api from '../../api/client'
import { useAuthStore } from '../../store/auth.store'

type Role = 'TEACHER' | 'STUDENT' | 'ADMIN'

interface AdminUser {
  id: string
  name: string
  email: string | null
  role: Role
  suspended: boolean
  lastLoginAt: string | null
  createdAt: string
  _count: { taughtClassrooms: number; enrollments: number; submissions: number }
}

interface Totals { role: Role; _count: { id: number } }

const ROLE_COLOURS: Record<Role, string> = {
  ADMIN:   'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  TEACHER: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  STUDENT: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
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

type Modal = 'create' | 'edit' | 'reset' | 'delete' | null

export default function Users() {
  const currentUser = useAuthStore(s => s.user)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [totals, setTotals] = useState<Totals[]>([])
  const [suspendedCount, setSuspendedCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [modal, setModal] = useState<Modal>(null)
  const [selected, setSelected] = useState<AdminUser | null>(null)
  const [saving, setSaving] = useState(false)
  const [newPassword, setNewPassword] = useState('')

  // Create / edit form
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'TEACHER' as Role })
  const [formError, setFormError] = useState('')

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (roleFilter) params.set('role', roleFilter)
      if (statusFilter) params.set('status', statusFilter)
      const { data } = await api.get(`/admin/users?${params}`)
      setUsers(data.users)
      setTotals(data.totals)
      setSuspendedCount(data.suspended)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [search, roleFilter, statusFilter])

  function openCreate() {
    setForm({ name: '', email: '', password: '', role: 'TEACHER' })
    setFormError('')
    setModal('create')
  }

  function openEdit(u: AdminUser) {
    setSelected(u)
    setForm({ name: u.name, email: u.email ?? '', password: '', role: u.role })
    setFormError('')
    setModal('edit')
  }

  function openReset(u: AdminUser) {
    setSelected(u)
    setNewPassword('')
    setModal('reset')
  }

  function openDelete(u: AdminUser) {
    setSelected(u)
    setModal('delete')
  }

  async function handleCreate() {
    setFormError('')
    if (!form.name || !form.email || !form.password) { setFormError('All fields required'); return }
    setSaving(true)
    try {
      await api.post('/admin/users', form)
      setModal(null)
      load()
    } catch (e: any) {
      setFormError(e.response?.data?.error ?? 'Failed to create user')
    } finally { setSaving(false) }
  }

  async function handleEdit() {
    if (!selected) return
    setFormError('')
    setSaving(true)
    try {
      await api.put(`/admin/users/${selected.id}`, { name: form.name, email: form.email, role: form.role })
      setModal(null)
      load()
    } catch (e: any) {
      setFormError(e.response?.data?.error ?? 'Failed to update user')
    } finally { setSaving(false) }
  }

  async function handleReset() {
    if (!selected) return
    setSaving(true)
    try {
      const { data } = await api.post(`/admin/users/${selected.id}/reset-password`)
      setNewPassword(data.newPassword)
    } finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!selected) return
    setSaving(true)
    try {
      await api.delete(`/admin/users/${selected.id}`)
      setModal(null)
      load()
    } finally { setSaving(false) }
  }

  async function handleSuspend(u: AdminUser) {
    await api.post(`/admin/users/${u.id}/suspend`)
    load()
  }

  const totalUsers = totals.reduce((s, t) => s + t._count.id, 0)
  const teacherCount = totals.find(t => t.role === 'TEACHER')?._count.id ?? 0
  const studentCount = totals.find(t => t.role === 'STUDENT')?._count.id ?? 0

  return (
    <AdminLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Management</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Create, edit, and manage all accounts</p>
          </div>
          <button
            onClick={openCreate}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            + Create User
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Users',  value: totalUsers,     colour: 'text-gray-900 dark:text-white' },
            { label: 'Teachers',     value: teacherCount,   colour: 'text-blue-600 dark:text-blue-400' },
            { label: 'Students',     value: studentCount,   colour: 'text-teal-600 dark:text-teal-400' },
            { label: 'Suspended',    value: suspendedCount, colour: 'text-red-600 dark:text-red-400' },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.colour}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-4">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name or email…"
            className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All roles</option>
            <option value="ADMIN">Admin</option>
            <option value="TEACHER">Teacher</option>
            <option value="STUDENT">Student</option>
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-16 text-gray-500 dark:text-gray-400 text-sm">No users found</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">User</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Activity</th>
                  <th className="px-4 py-3 text-left">Last Login</th>
                  <th className="px-4 py-3 text-left">Joined</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {initials(u.name)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{u.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{u.email ?? '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLOURS[u.role]}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.suspended ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' : 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'}`}>
                        {u.suspended ? 'Suspended' : 'Active'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                      {u.role === 'TEACHER' ? `${u._count.taughtClassrooms} class${u._count.taughtClassrooms !== 1 ? 'es' : ''}` : u.role === 'STUDENT' ? `${u._count.submissions} submission${u._count.submissions !== 1 ? 's' : ''}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{timeAgo(u.lastLoginAt)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(u)} className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">Edit</button>
                        <button onClick={() => openReset(u)} className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">Reset PW</button>
                        {u.id !== currentUser?.id && (
                          <button
                            onClick={() => handleSuspend(u)}
                            className={`px-2 py-1 text-xs rounded transition-colors ${u.suspended ? 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20' : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20'}`}
                          >
                            {u.suspended ? 'Unsuspend' : 'Suspend'}
                          </button>
                        )}
                        {u.id !== currentUser?.id && (
                          <button onClick={() => openDelete(u)} className="px-2 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors">Delete</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {modal === 'create' && (
        <ModalShell title="Create User" onClose={() => setModal(null)}>
          <UserForm form={form} setForm={setForm} showPassword error={formError} />
          <ModalFooter onClose={() => setModal(null)} onConfirm={handleCreate} confirmLabel="Create" saving={saving} />
        </ModalShell>
      )}

      {/* Edit Modal */}
      {modal === 'edit' && selected && (
        <ModalShell title={`Edit ${selected.name}`} onClose={() => setModal(null)}>
          <UserForm form={form} setForm={setForm} showPassword={false} error={formError} />
          <ModalFooter onClose={() => setModal(null)} onConfirm={handleEdit} confirmLabel="Save" saving={saving} />
        </ModalShell>
      )}

      {/* Reset Password Modal */}
      {modal === 'reset' && selected && (
        <ModalShell title="Reset Password" onClose={() => setModal(null)}>
          {newPassword ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">New password for <strong>{selected.name}</strong>:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2 text-sm font-mono text-gray-900 dark:text-white">{newPassword}</code>
                <button
                  onClick={() => navigator.clipboard.writeText(newPassword)}
                  className="px-3 py-2 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >Copy</button>
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-400">Share this with the user — it won't be shown again.</p>
            </div>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-400">Generate a new random password for <strong>{selected.name}</strong>?</p>
          )}
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              {newPassword ? 'Close' : 'Cancel'}
            </button>
            {!newPassword && (
              <button onClick={handleReset} disabled={saving} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                {saving ? 'Generating…' : 'Generate'}
              </button>
            )}
          </div>
        </ModalShell>
      )}

      {/* Delete Modal */}
      {modal === 'delete' && selected && (
        <ModalShell title="Delete User" onClose={() => setModal(null)}>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Permanently delete <strong>{selected.name}</strong>? This cannot be undone and will remove all their data.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
            <button onClick={handleDelete} disabled={saving} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
              {saving ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </ModalShell>
      )}
    </AdminLayout>
  )
}

// ── Shared modal components ──────────────────────────────────────────────────

function ModalShell({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

interface FormState { name: string; email: string; password: string; role: Role }

function UserForm({ form, setForm, showPassword, error }: {
  form: FormState
  setForm: (f: FormState) => void
  showPassword: boolean
  error: string
}) {
  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
        <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Full name" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
        <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="user@school.com" />
      </div>
      {showPassword && (
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
          <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="••••••••" />
        </div>
      )}
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
        <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value as Role })}
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="TEACHER">Teacher</option>
          <option value="STUDENT">Student</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>
    </div>
  )
}

function ModalFooter({ onClose, onConfirm, confirmLabel, saving }: {
  onClose: () => void
  onConfirm: () => void
  confirmLabel: string
  saving: boolean
}) {
  return (
    <div className="flex justify-end gap-2 mt-4">
      <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
      <button onClick={onConfirm} disabled={saving} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
        {saving ? 'Saving…' : confirmLabel}
      </button>
    </div>
  )
}
