import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import api from '../../api/client'

interface ProgressData {
  scores: { date: string; score: number; title: string; classroom: string }[]
  weakAreas: { tag: string; errorRate: number }[]
  trend: 'improving' | 'steady' | 'declining'
  totalSubmissions: number
}

const trendConfig = {
  improving: { label: 'Improving', color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
  steady: { label: 'Steady', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
  declining: { label: 'Needs attention', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
}

export default function StudentProgress() {
  const [data, setData] = useState<ProgressData | null>(null)
  const [feedback, setFeedback] = useState<{ aiSuggestion: string | null } | null>(null)

  useEffect(() => {
    api.get('/analytics/student').then(r => setData(r.data))
    api.get('/submissions/my').then(r => {
      const latest = r.data.find((s: any) => s.feedback?.aiSuggestion)
      if (latest) setFeedback(latest.feedback)
    })
  }, [])

  if (!data) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>

  const chartData = data.scores.map(s => ({
    name: new Date(s.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    score: s.score,
    title: s.title,
  }))

  const trend = trendConfig[data.trend]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm text-gray-500">Submissions</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{data.totalSubmissions}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm text-gray-500">Average score</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {data.scores.length > 0
              ? (data.scores.reduce((a, b) => a + b.score, 0) / data.scores.length).toFixed(0)
              : '—'}%
          </p>
        </div>
        <div className={`border rounded-xl p-4 ${trend.bg}`}>
          <p className="text-sm text-gray-500">Trend</p>
          <p className={`text-2xl font-bold mt-1 ${trend.color}`}>{trend.label}</p>
        </div>
      </div>

      {chartData.length > 1 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Score history</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
              <Tooltip formatter={(v: number) => [`${v}%`, 'Score']} />
              <Line type="monotone" dataKey="score" stroke="#0d9488" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {feedback?.aiSuggestion && (
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-teal-700 uppercase tracking-wide bg-teal-100 px-2 py-0.5 rounded">AI Insight</span>
          </div>
          <p className="text-sm text-teal-900 leading-relaxed">{feedback.aiSuggestion}</p>
        </div>
      )}

      {data.weakAreas.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Focus areas</h3>
          <div className="space-y-2">
            {data.weakAreas.map(w => (
              <div key={w.tag} className="flex items-center justify-between">
                <span className="text-sm text-gray-700 capitalize">{w.tag}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-gray-100 rounded-full h-2">
                    <div className="bg-orange-400 h-2 rounded-full" style={{ width: `${w.errorRate}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 w-12 text-right">{w.errorRate}% errors</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
