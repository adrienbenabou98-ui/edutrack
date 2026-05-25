import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../api/client'

type QuestionType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'LONG_ANSWER'

interface Question {
  text: string; type: QuestionType; options: string[]; correctAnswer: string; tags: string; points: number
}

const emptyQuestion = (): Question => ({
  text: '', type: 'MULTIPLE_CHOICE', options: ['', '', '', ''], correctAnswer: '', tags: '', points: 10
})

export default function NewAssignment() {
  const { id: classroomId } = useParams()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [instructions, setInstructions] = useState('')
  const [type, setType] = useState('ASSIGNMENT')
  const [dueDate, setDueDate] = useState('')
  const [subject, setSubject] = useState('')
  const [unitName, setUnitName] = useState('')
  const [questions, setQuestions] = useState<Question[]>([emptyQuestion()])
  const [saving, setSaving] = useState(false)

  function updateQuestion(i: number, field: keyof Question, value: any) {
    setQuestions(qs => qs.map((q, idx) => idx === i ? { ...q, [field]: value } : q))
  }

  function updateOption(qi: number, oi: number, value: string) {
    setQuestions(qs => qs.map((q, idx) => idx === qi
      ? { ...q, options: q.options.map((o, j) => j === oi ? value : o) } : q))
  }

  async function handleSubmit(status: 'DRAFT' | 'PUBLISHED') {
    setSaving(true)
    try {
      const payload = {
        classroomId,
        title,
        instructions,
        type,
        dueDate: dueDate || null,
        subject: subject || null,
        unitName: unitName || null,
        questions: questions.map(q => ({
          text: q.text,
          type: q.type,
          options: (q.type === 'MULTIPLE_CHOICE') ? q.options.filter(Boolean) : null,
          correctAnswer: (q.type === 'MULTIPLE_CHOICE' || q.type === 'TRUE_FALSE') ? q.correctAnswer : null,
          tags: q.tags.split(',').map(t => t.trim()).filter(Boolean),
          points: q.points,
        })),
      }
      const { data } = await api.post('/assignments', payload)
      if (status === 'PUBLISHED') await api.patch(`/assignments/${data.id}`, { status: 'PUBLISHED' })
      navigate(`/teacher/classroom/${classroomId}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-700">← Back</button>
        <span className="text-lg font-semibold text-gray-900">New Assignment</span>
      </nav>
      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Assignment title" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
            <textarea value={instructions} onChange={e => setInstructions(e.target.value)} rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Instructions for students…" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject <span className="text-gray-400 font-normal">(optional)</span></label>
              <input value={subject} onChange={e => setSubject(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. Biology" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit <span className="text-gray-400 font-normal">(optional)</span></label>
              <input value={unitName} onChange={e => setUnitName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. Cell Biology" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select value={type} onChange={e => setType(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="ASSIGNMENT">Assignment</option>
                <option value="QUIZ">Quiz</option>
                <option value="EXAM">Exam</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due date</label>
              <input type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="font-semibold text-gray-900">Questions</h2>
          {questions.map((q, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-500">Q{i + 1}</span>
                <select value={q.type} onChange={e => updateQuestion(i, 'type', e.target.value)}
                  className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                  <option value="TRUE_FALSE">True / False</option>
                  <option value="SHORT_ANSWER">Short Answer</option>
                  <option value="LONG_ANSWER">Long Answer</option>
                </select>
                <input type="number" value={q.points} onChange={e => updateQuestion(i, 'points', Number(e.target.value))}
                  className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="pts" min={1} />
                {questions.length > 1 && (
                  <button onClick={() => setQuestions(qs => qs.filter((_, j) => j !== i))}
                    className="ml-auto text-red-400 hover:text-red-600 text-sm">Remove</button>
                )}
              </div>
              <textarea value={q.text} onChange={e => updateQuestion(i, 'text', e.target.value)} rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Question text…" />
              {q.type === 'MULTIPLE_CHOICE' && (
                <div className="space-y-2">
                  {q.options.map((o, j) => (
                    <div key={j} className="flex items-center gap-2">
                      <input type="radio" name={`correct-${i}`} checked={q.correctAnswer === o} onChange={() => updateQuestion(i, 'correctAnswer', o)} />
                      <input value={o} onChange={e => updateOption(i, j, e.target.value)}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder={`Option ${j + 1}`} />
                    </div>
                  ))}
                  <p className="text-xs text-gray-400">Select the radio button next to the correct answer</p>
                </div>
              )}
              {q.type === 'TRUE_FALSE' && (
                <div className="flex gap-4">
                  {['True', 'False'].map(v => (
                    <label key={v} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" name={`tf-${i}`} checked={q.correctAnswer === v} onChange={() => updateQuestion(i, 'correctAnswer', v)} />
                      {v}
                    </label>
                  ))}
                </div>
              )}
              <input value={q.tags} onChange={e => updateQuestion(i, 'tags', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Tags (comma separated): fractions, algebra…" />
            </div>
          ))}
          <button onClick={() => setQuestions(qs => [...qs, emptyQuestion()])}
            className="w-full border-2 border-dashed border-gray-300 rounded-xl py-3 text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors">
            + Add question
          </button>
        </div>

        <div className="flex gap-3 justify-end pb-8">
          <button onClick={() => handleSubmit('DRAFT')} disabled={saving}
            className="px-5 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            Save as Draft
          </button>
          <button onClick={() => handleSubmit('PUBLISHED')} disabled={saving || !title}
            className="btn-3d-indigo px-5 disabled:opacity-50">
            Publish
          </button>
        </div>
      </main>
    </div>
  )
}
