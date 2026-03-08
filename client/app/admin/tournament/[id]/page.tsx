'use client'

import { useState, useEffect, use } from 'react'
import { updateResult, deleteResult } from '@/services/admin-api'
import Link from 'next/link'
import { getAdminToken } from '@/lib/admin-auth'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://gp-tracker-hidden-rain-8594.fly.dev/api'

interface Result {
  player: { name: string; fide_id: string | null; federation: string }
  rating: number | null
  points: number
  tpr: number | null
  has_walkover: boolean
  start_rank: number | null
  result_status: string
}

interface TournamentData {
  name: string
  id: string
  start_date: string | null
  end_date: string | null
  location: string | null
  rounds: number | null
  section: string
  results: Result[]
  total: number
}

export default function AdminTournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [data, setData] = useState<TournamentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const token = getAdminToken()
      const res = await fetch(`${API_BASE}/tournament/${id}?all_results=true`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: 'no-store',
      })
      if (!res.ok) throw new Error('Failed to load')
      setData(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  const handleUpdateStatus = async (fideId: string, status: string) => {
    try {
      await updateResult(id, fideId, { result_status: status })
      await load()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Update failed')
    }
  }

  const handleDelete = async (fideId: string, name: string) => {
    if (!confirm(`Remove ${name} from this tournament?`)) return
    try {
      await deleteResult(id, fideId)
      await load()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  if (loading) return <p className="text-sm text-gray-500">Loading...</p>
  if (error) return <p className="text-sm text-red-600">{error}</p>
  if (!data) return <p className="text-sm text-gray-500">Not found</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{data.name}</h1>
          <p className="text-sm text-gray-500">
            {data.section} &middot; {data.start_date} &middot; {data.location || 'No location'} &middot; {data.rounds || '?'} rounds &middot; {data.total} players
          </p>
        </div>
        <Link href="/admin" className="text-sm text-gray-500 hover:underline">Back</Link>
      </div>

      <div className="bg-white border-2 border-black overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-black bg-gray-50">
              <th className="text-left px-3 py-2 font-medium">#</th>
              <th className="text-left px-3 py-2 font-medium">Name</th>
              <th className="text-left px-3 py-2 font-medium">FIDE ID</th>
              <th className="text-right px-3 py-2 font-medium">Rating</th>
              <th className="text-right px-3 py-2 font-medium">Pts</th>
              <th className="text-right px-3 py-2 font-medium">TPR</th>
              <th className="text-center px-3 py-2 font-medium">Status</th>
              <th className="text-right px-3 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {data.results.map((r, i) => (
              <tr key={r.player.fide_id || i} className={`border-b border-gray-200 hover:bg-gray-50 ${r.result_status !== 'valid' ? 'bg-amber-50' : ''}`}>
                <td className="px-3 py-1.5 text-gray-400">{i + 1}</td>
                <td className="px-3 py-1.5 font-medium">{r.player.name}</td>
                <td className="px-3 py-1.5 text-xs text-gray-500">{r.player.fide_id || '—'}</td>
                <td className="text-right px-3 py-1.5">{r.rating || '—'}</td>
                <td className="text-right px-3 py-1.5">{r.points}</td>
                <td className="text-right px-3 py-1.5">{r.tpr || '—'}</td>
                <td className="text-center px-3 py-1.5">
                  {r.player.fide_id ? (
                    <select value={r.result_status || 'valid'}
                      onChange={e => handleUpdateStatus(r.player.fide_id!, e.target.value)}
                      className={`text-xs border px-1 py-0.5 ${r.result_status !== 'valid' ? 'text-amber-700 bg-amber-50' : ''}`}>
                      <option value="valid">valid</option>
                      <option value="walkover">walkover</option>
                      <option value="incomplete">incomplete</option>
                      <option value="withdrawn">withdrawn</option>
                    </select>
                  ) : (
                    <span className="text-xs text-gray-400">{r.result_status || 'valid'}</span>
                  )}
                </td>
                <td className="text-right px-3 py-1.5">
                  {r.player.fide_id && (
                    <button onClick={() => handleDelete(r.player.fide_id!, r.player.name)}
                      className="text-red-500 hover:text-red-700 text-xs">remove</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
