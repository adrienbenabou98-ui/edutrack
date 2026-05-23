import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBoundaryStore } from '../../store/gradeBoundary.store'
import type { Boundary } from '../../store/gradeBoundary.store'
import { useTermStore } from '../../store/term.store'
import type { Term } from '../../store/term.store'
import TermIndicator from '../../components/TermIndicator'
import NavStudentsIcon from '../../components/NavStudentsIcon'
import UnderstandingLevelsSettings from '../../components/UnderstandingLevelsSettings'
import api from '../../api/client'

type SettingsTab = 'grades' | 'terms' | 'levels'

function termStatus(term: Term): { label: string; colour: string } {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const start = new Date(term.startDate); start.setHours(0, 0, 0, 0)
  const end = new Date(term.endDate); end.setHours(23, 59, 59, 999)
  if (today >= start && today <= end) return { label: 'Active', colour: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300' }
  if (today < start) return { label: 'Upcoming', colour: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' }
  return { label: 'Past', colour: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400' }
}

interface TermModal { name: string; startDate: string; endDate: string }
const emptyTermModal = (): TermModal => ({ name: '', startDate: '', endDate: '' })

export default function Settings() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<SettingsTab>('grades')

  // Grade boundaries
  const { boundaries, loaded, load, save } = useBoundaryStore()
  const [rows, setRows] = useState<Boundary[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { if (!loaded) load() }, [loaded])
  useEffect(() => { if (loaded) setRows(boundaries.map(b => ({ ...b }))) }, [loaded, boundaries])

  function updateBoundary(i: number, field: keyof Boundary, value: string | number) {
    setRows(rs => rs.map((r, j) => j === i ? { ...r, [field]: value } : r))
  }

  async function handleSave() {
    setSaving(true)
    try { await save(rows); setSaved(true); setTimeout(() => setSaved(false), 2000) }
    finally { setSaving(false) }
  }

  // Terms
  const { terms, loadAll, setTerms } = useTermStore()
  const [termsLoaded, setTermsLoaded] = useState(false)
  const [showTermModal, setShowTermModal] = useState(false)
  const [editTermId, setEditTermId] = useState<string | null>(null)
  const [termForm, setTermForm] = useState<TermModal>(emptyTermModal())
  const [termSaving, setTermSaving] = useState(false)

  useEffect(() => {
    if (tab === 'terms' && !termsLoaded) {
      loadAll().then(() => setTermsLoaded(true))
    }
  }, [tab, termsLoaded])

  async function handleTermSave(e: React.FormEvent) {
    e.preventDefault()
    setTermSaving(true)
    try {
      if (editTermId) {
        const { data } = await api.put(`/terms/${editTermId}`, termForm)
        setTerms(terms.map(t => t.id === editTermId ? data : t))
      } else {
        const { data } = await api.post('/terms', termForm)
        setTerms([data, ...terms])
      }
      setShowTermModal(false); setEditTermId(null); setTermForm(emptyTermModal())
    } finally { setTermSaving(false) }
  }

  async function deleteTerm(id: string) {
    await api.delete(`/terms/${id}`)
    setTerms(terms.filter(t => t.id !== id))
  }

  async function setActiveTerm(id: string) {
    await api.post(`/terms/${id}/set-active`)
    setTerms(terms.map(t => ({ ...t, isActive: t.id === id })))
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/teacher')} className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400">← Dashboard</button>
          <span className="text-lg font-semibold text-indigo-700 dark:text-indigo-400">Settings</span>
        </div>
        <div className="flex items-center gap-3">
          <NavStudentsIcon />
          <TermIndicator />
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 mb-6 w-fit">
          {([['grades', 'Grade Tiers'], ['terms', 'Terms'], ['levels', 'Understanding Levels']] as [SettingsTab, string][]).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'grades' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="mb-5">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Grade Tiers</h2>
              <p className="text-sm text-gray-400 mt-1">Define score ranges and colours for each grade label.</p>
            </div>

            {!loaded ? <div className="text-center py-8 text-gray-400">Loading…</div> : (
              <div className="space-y-3">
                <div className="grid grid-cols-[80px_1fr_1fr_1fr_48px] gap-3 text-xs font-medium text-gray-400 uppercase tracking-wide px-1 mb-1">
                  <span>Colour</span><span>Label</span><span>Min %</span><span>Max %</span><span />
                </div>
                {rows.map((r, i) => (
                  <div key={i} className="grid grid-cols-[80px_1fr_1fr_1fr_48px] gap-3 items-center">
                    <div className="flex items-center gap-2">
                      <input type="color" value={r.colour} onChange={e => updateBoundary(i, 'colour', e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
                      <div className="w-8 h-8 rounded-lg flex-shrink-0" style={{ backgroundColor: r.colour }} />
                    </div>
                    <input value={r.label} onChange={e => updateBoundary(i, 'label', e.target.value)}
                      className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    <input type="number" min={0} max={100} value={r.minScore} onChange={e => updateBoundary(i, 'minScore', Number(e.target.value))}
                      className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    <input type="number" min={0} max={100} value={r.maxScore} onChange={e => updateBoundary(i, 'maxScore', Number(e.target.value))}
                      className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    <button onClick={() => setRows(rs => rs.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 text-lg font-bold leading-none" title="Remove">×</button>
                  </div>
                ))}
                <button onClick={() => setRows(rs => [...rs, { label: 'New', minScore: 0, maxScore: 10, colour: '#94a3b8' }])}
                  className="w-full border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl py-2.5 text-sm text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors">
                  + Add tier
                </button>
              </div>
            )}
            <div className="flex justify-end mt-6">
              <button onClick={handleSave} disabled={saving}
                className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                {saved ? 'Saved!' : saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        )}

        {tab === 'levels' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <UnderstandingLevelsSettings />
          </div>
        )}

        {tab === 'terms' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">Terms</h2>
                <p className="text-sm text-gray-400 mt-1">Define your school terms. The active term is shown in every page header.</p>
              </div>
              <button onClick={() => { setShowTermModal(true); setEditTermId(null); setTermForm(emptyTermModal()) }}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">Add Term</button>
            </div>

            {!termsLoaded ? <div className="text-center py-8 text-gray-400">Loading…</div> : terms.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                No terms yet. Add your first term to get started.
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {terms.map(term => {
                  const status = termStatus(term)
                  return (
                    <div key={term.id} className="py-4 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-900 dark:text-white text-sm">{term.name}</span>
                          {term.isActive && <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 font-medium">Active</span>}
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.colour}`}>{status.label}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(term.startDate).toLocaleDateString()} – {new Date(term.endDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {!term.isActive && (
                          <button onClick={() => setActiveTerm(term.id)} className="text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-700 rounded-lg px-2 py-1">
                            Set active
                          </button>
                        )}
                        <button onClick={() => { setEditTermId(term.id); setTermForm({ name: term.name, startDate: term.startDate.slice(0, 10), endDate: term.endDate.slice(0, 10) }); setShowTermModal(true) }}
                          className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1">Edit</button>
                        <button onClick={() => deleteTerm(term.id)}
                          className="text-xs text-red-500 hover:text-red-700 border border-red-200 dark:border-red-800 rounded-lg px-2 py-1">Delete</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {showTermModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">{editTermId ? 'Edit Term' : 'Add Term'}</h3>
              <button onClick={() => setShowTermModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <form onSubmit={handleTermSave} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Term name</label>
                <input value={termForm.name} onChange={e => setTermForm(f => ({ ...f, name: e.target.value }))} required
                  placeholder="e.g. Term 1 2026"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start date</label>
                <input type="date" value={termForm.startDate} onChange={e => setTermForm(f => ({ ...f, startDate: e.target.value }))} required
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End date</label>
                <input type="date" value={termForm.endDate} onChange={e => setTermForm(f => ({ ...f, endDate: e.target.value }))} required
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowTermModal(false)}
                  className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:text-white dark:hover:bg-gray-700">Cancel</button>
                <button type="submit" disabled={termSaving}
                  className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">{termSaving ? 'Saving…' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
