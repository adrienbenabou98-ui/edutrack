import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import api from '../../api/client'

interface StudentStat {
  studentId: string; studentName: string; averageScore: number | null
  submissionCount: number; trend: string; weakTags: string[]; atRisk: boolean
}
interface AnalyticsData {
  studentStats: StudentStat[]; overallAverage: number | null
  totalStudents: number; atRiskCount: number; assignmentCount: number
}

export default function Analytics({ classroomId: propId }: { classroomId?: string }) {
  const { id: paramId } = useParams()
  const classroomId = propId ?? paramId
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [insight, setInsight] = useState<string | null>(null)
  const [loadingInsight, setLoadingInsight] = useState(false)
  const [insightError, setInsightError] = useState<string | null>(null)

  useEffect(() => {
    if (classroomId) api.get(`/analytics/classroom/${classroomId}`).then(r => setData(r.data))
  }, [classroomId])

  async function loadInsight() {
    setLoadingInsight(true)
    setInsightError(null)
    try {
      const r = await api.get(`/analytics/classroom/${classroomId}/insight`)
      setInsight(r.data.insight)
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? err?.message ?? 'Failed to generate insight. Please try again.'
      setInsightError(msg)
    } finally {
      setLoadingInsight(false)
    }
  }

  async function exportCSV() {
    const token = localStorage.getItem('access_token')
    const base = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000') as string
    const res = await fetch(`${base}/api/export/classroom/${classroomId}/csv`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `classroom-${classroomId}-grades.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!data) return <div className="py-16 text-center text-gray-400">Loading analytics…</div>

  const chartData = data.studentStats
    .filter(s => s.averageScore !== null)
    .map(s => ({ name: s.studentName.split(' ')[0], score: s.averageScore }))

  return (
    <div className="space-y-6">
      <div className="flex justify-end mb-2">
        <button onClick={exportCSV} className="text-sm border border-gray-300 px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-50 flex items-center gap-1">
          ↓ Export CSV
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Students', value: data.totalStudents },
          { label: 'Assignments', value: data.assignmentCount },
          { label: 'Class average', value: data.overallAverage ? `${data.overallAverage}%` : '—' },
          { label: 'At risk', value: data.atRiskCount, alert: data.atRiskCount > 0 },
        ].map(card => (
          <div key={card.label} className={`bg-white border rounded-xl p-4 ${card.alert ? 'border-orange-300 bg-orange-50' : 'border-gray-200'}`}>
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className={`text-2xl font-bold mt-1 ${card.alert ? 'text-orange-600' : 'text-gray-900'}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {chartData.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Score by student</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
              <Tooltip formatter={(v) => [`${Number(v)}%`, 'Average']} />
              <Bar dataKey="score" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">AI Class Insight</h3>
          <button onClick={loadInsight} disabled={loadingInsight}
            className="btn-3d-indigo px-3 py-1.5 disabled:opacity-50">
            {loadingInsight ? 'Generating…' : 'Generate insight'}
          </button>
        </div>
        {insightError ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <span className="text-xs font-semibold text-red-700 uppercase tracking-wide bg-red-100 px-2 py-0.5 rounded">Error</span>
            <p className="text-sm text-red-800 leading-relaxed mt-2">{insightError}</p>
          </div>
        ) : insight ? (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wide bg-indigo-100 px-2 py-0.5 rounded">AI Insight</span>
            <p className="text-sm text-indigo-900 leading-relaxed mt-2">{insight}</p>
          </div>
        ) : (
          <p className="text-sm text-gray-400">Click "Generate insight" to get an AI summary of your class performance.</p>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Student breakdown</h3>
        <div className="space-y-2">
          {data.studentStats.map(s => (
            <div key={s.studentId} className={`flex items-center justify-between px-4 py-3 rounded-lg border ${s.atRisk ? 'border-orange-200 bg-orange-50' : 'border-gray-100 bg-gray-50'}`}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-medium text-sm">
                  {s.studentName[0]}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{s.studentName}</p>
                  <p className="text-xs text-gray-400">{s.submissionCount} submission{s.submissionCount !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                {s.weakTags.length > 0 && (
                  <span className="text-xs text-orange-600 bg-orange-100 px-2 py-0.5 rounded">
                    Weak: {s.weakTags.slice(0, 2).join(', ')}
                  </span>
                )}
                <span className={`font-medium ${s.atRisk ? 'text-orange-600' : 'text-gray-700'}`}>
                  {s.averageScore !== null ? `${s.averageScore}%` : '—'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
