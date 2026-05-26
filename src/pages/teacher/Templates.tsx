import { useEffect, useState } from 'react'
import TeacherNav from '../../components/TeacherNav'
import api from '../../api/client'

const TYPES = ['ASSIGNMENT', 'QUIZ', 'EXAM']
const QTYPES = ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER', 'LONG_ANSWER']
const QLABELS: Record<string, string> = { MULTIPLE_CHOICE: 'Multiple Choice', TRUE_FALSE: 'True/False', SHORT_ANSWER: 'Short Answer', LONG_ANSWER: 'Long Answer' }

interface Template { id: string; title: string; type: string; subject: string | null; yearLevel: number | null; questions: any[]; createdAt: string }
interface Classroom { id: string; name: string }

export default function Templates() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [useModal, setUseModal] = useState<Template | null>(null)
  const [editModal, setEditModal] = useState<Template | null>(null)
  const [loading, setLoading] = useState(true)

  const [form, setForm] = useState({ title: '', type: 'ASSIGNMENT', subject: '', yearLevel: '', instructions: '' })
  const [questions, setQuestions] = useState<any[]>([])
  const [useForm, setUseForm] = useState({ classroomId: '', title: '', dueDate: '' })

  useEffect(() => {
    Promise.all([api.get('/templates'), api.get('/classrooms')]).then(([tr, cr]) => {
      setTemplates(tr.data); setClassrooms(cr.data); setLoading(false)
    })
  }, [])

  function addQuestion() {
    setQuestions(q => [...q, { text: '', type: 'SHORT_ANSWER', options: ['', '', '', ''], correctAnswer: '', points: 10 }])
  }
  function removeQuestion(i: number) { setQuestions(q => q.filter((_, idx) => idx !== i)) }
  function updateQuestion(i: number, field: string, val: any) {
    setQuestions(q => q.map((q2, idx) => idx === i ? { ...q2, [field]: val } : q2))
  }

  async function saveTemplate() {
    if (!form.title) return
    const payload = { ...form, yearLevel: form.yearLevel ? Number(form.yearLevel) : null, questions }
    if (editModal) {
      const { data } = await api.put(`/templates/${editModal.id}`, payload)
      setTemplates(ts => ts.map(t => t.id === editModal.id ? data : t))
      setEditModal(null)
    } else {
      const { data } = await api.post('/templates', payload)
      setTemplates(ts => [data, ...ts])
      setShowCreate(false)
    }
    setForm({ title: '', type: 'ASSIGNMENT', subject: '', yearLevel: '', instructions: '' })
    setQuestions([])
  }

  async function deleteTemplate(id: string) {
    await api.delete(`/templates/${id}`)
    setTemplates(ts => ts.filter(t => t.id !== id))
  }

  async function useTemplate() {
    if (!useForm.classroomId || !useModal) return
    await api.post(`/templates/${useModal.id}/use`, useForm)
    setUseModal(null)
    setUseForm({ classroomId: '', title: '', dueDate: '' })
  }

  function openEdit(t: Template) {
    setForm({ title: t.title, type: t.type, subject: t.subject ?? '', yearLevel: t.yearLevel?.toString() ?? '', instructions: '' })
    setQuestions(t.questions.map(q => ({ ...q, options: q.options ?? ['', '', '', ''] })))
    setEditModal(t)
    setShowCreate(false)
  }

  const isEditing = showCreate || !!editModal

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <TeacherNav activePage="templates" />

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Assignment Templates</h1>
          {!isEditing && <button onClick={() => setShowCreate(true)} className="btn-3d-indigo text-sm">+ New Template</button>}
        </div>

        {isEditing && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-6">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">{editModal ? 'Edit Template' : 'New Template'}</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div><label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Title</label><input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
              <div><label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Type</label><select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">{TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
              <div><label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Subject (optional)</label><input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
              <div><label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Year Level (optional)</label><input type="number" value={form.yearLevel} onChange={e => setForm(f => ({ ...f, yearLevel: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2"><span className="text-xs font-medium text-gray-500 dark:text-gray-400">Questions</span><button onClick={addQuestion} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">+ Add question</button></div>
              <div className="space-y-3">
                {questions.map((q, i) => (
                  <div key={i} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                    <div className="flex gap-3 mb-2">
                      <input value={q.text} onChange={e => updateQuestion(i, 'text', e.target.value)} placeholder="Question text" className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                      <select value={q.type} onChange={e => updateQuestion(i, 'type', e.target.value)} className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500">{QTYPES.map(t => <option key={t} value={t}>{QLABELS[t]}</option>)}</select>
                      <input type="number" value={q.points} onChange={e => updateQuestion(i, 'points', Number(e.target.value))} className="w-16 border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                      <button onClick={() => removeQuestion(i)} className="text-gray-400 hover:text-red-500 text-sm">✕</button>
                    </div>
                    {q.type === 'MULTIPLE_CHOICE' && (
                      <div className="grid grid-cols-2 gap-1.5 mt-1">
                        {(q.options || ['', '', '', '']).map((opt: string, oi: number) => (
                          <input key={oi} value={opt} onChange={e => { const o = [...(q.options || ['', '', '', ''])]; o[oi] = e.target.value; updateQuestion(i, 'options', o) }} placeholder={`Option ${oi + 1}`} className="border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-xs dark:bg-gray-700 dark:text-white focus:outline-none" />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={saveTemplate} className="btn-3d-indigo text-sm">Save Template</button>
              <button onClick={() => { setShowCreate(false); setEditModal(null); setForm({ title: '', type: 'ASSIGNMENT', subject: '', yearLevel: '', instructions: '' }); setQuestions([]) }} className="text-sm text-gray-500 hover:text-gray-700 px-3">Cancel</button>
            </div>
          </div>
        )}

        {loading ? <div className="text-center py-16 text-gray-400">Loading…</div> : templates.length === 0 && !isEditing ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <p className="text-gray-400">No templates yet — create one to reuse across classes</p>
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map(t => (
              <div key={t.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-5 py-4 flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">{t.title}</h3>
                  <p className="text-sm text-gray-400 mt-0.5">{t.type}{t.subject ? ` · ${t.subject}` : ''}{t.yearLevel ? ` · Year ${t.yearLevel}` : ''} · {t.questions.length} questions</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setUseModal(t); setUseForm({ classroomId: classrooms[0]?.id ?? '', title: t.title, dueDate: '' }) }} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium px-3 py-1.5 rounded-lg border border-indigo-200 hover:border-indigo-400 transition-colors">Use</button>
                  <button onClick={() => openEdit(t)} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5">Edit</button>
                  <button onClick={() => deleteTemplate(t.id)} className="text-sm text-red-400 hover:text-red-600 px-3 py-1.5">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {useModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Use Template: {useModal.title}</h2>
            <div className="space-y-3">
              <div><label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Class</label><select value={useForm.classroomId} onChange={e => setUseForm(f => ({ ...f, classroomId: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">{classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div><label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Title (optional override)</label><input value={useForm.title} onChange={e => setUseForm(f => ({ ...f, title: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
              <div><label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Due Date (optional)</label><input type="date" value={useForm.dueDate} onChange={e => setUseForm(f => ({ ...f, dueDate: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={useTemplate} className="btn-3d-indigo text-sm">Create Assignment</button>
              <button onClick={() => setUseModal(null)} className="text-sm text-gray-500 hover:text-gray-700 px-3">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
