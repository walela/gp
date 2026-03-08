'use client'

import { useState, useEffect } from 'react'
import { getAdminTournaments, deleteTournament, updateTournament, type AdminTournament } from '@/services/admin-api'
import Link from 'next/link'

export default function AdminDashboard() {
  const [tournaments, setTournaments] = useState<AdminTournament[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Record<string, string>>({})

  const load = async () => {
    setLoading(true)
    try {
      const data = await getAdminTournaments()
      setTournaments(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}" and all its results?`)) return
    try {
      await deleteTournament(id)
      await load()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  const startEdit = (t: AdminTournament) => {
    setEditingId(t.id)
    setEditData({
      name: t.name || '',
      short_name: t.short_name || '',
      location: t.location || '',
      rounds: String(t.rounds || ''),
      start_date: t.start_date || '',
      end_date: t.end_date || '',
    })
  }

  const saveEdit = async () => {
    if (!editingId) return
    try {
      const payload: Record<string, unknown> = { ...editData }
      if (editData.rounds) payload.rounds = parseInt(editData.rounds)
      await updateTournament(editingId, payload)
      setEditingId(null)
      await load()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Update failed')
    }
  }

  if (loading) return <p className="text-sm text-gray-500">Loading tournaments...</p>
  if (error) return <p className="text-sm text-red-600">{error}</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tournaments</h1>
        <Link href="/admin/scrape" className="bg-black text-white px-4 py-2 text-sm font-medium hover:bg-gray-800">
          + Scrape New
        </Link>
      </div>

      <div className="bg-white border-2 border-black overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-black bg-gray-50">
              <th className="text-left px-3 py-2 font-medium">Name</th>
              <th className="text-left px-3 py-2 font-medium">Section</th>
              <th className="text-left px-3 py-2 font-medium">Date</th>
              <th className="text-left px-3 py-2 font-medium">Location</th>
              <th className="text-right px-3 py-2 font-medium">Rds</th>
              <th className="text-right px-3 py-2 font-medium">Players</th>
              <th className="text-right px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tournaments.map(t => (
              <tr key={t.id} className="border-b border-gray-200 hover:bg-gray-50">
                {editingId === t.id ? (
                  <>
                    <td className="px-3 py-2">
                      <input value={editData.name} onChange={e => setEditData(d => ({...d, name: e.target.value}))}
                        className="border px-1 py-0.5 text-sm w-full" />
                      <input value={editData.short_name} onChange={e => setEditData(d => ({...d, short_name: e.target.value}))}
                        className="border px-1 py-0.5 text-sm w-full mt-1" placeholder="Short name" />
                    </td>
                    <td className="px-3 py-2 text-xs">{t.section}</td>
                    <td className="px-3 py-2">
                      <input type="date" value={editData.start_date} onChange={e => setEditData(d => ({...d, start_date: e.target.value}))}
                        className="border px-1 py-0.5 text-sm" />
                      <input type="date" value={editData.end_date} onChange={e => setEditData(d => ({...d, end_date: e.target.value}))}
                        className="border px-1 py-0.5 text-sm mt-1" />
                    </td>
                    <td className="px-3 py-2">
                      <input value={editData.location} onChange={e => setEditData(d => ({...d, location: e.target.value}))}
                        className="border px-1 py-0.5 text-sm w-full" />
                    </td>
                    <td className="px-3 py-2">
                      <input value={editData.rounds} onChange={e => setEditData(d => ({...d, rounds: e.target.value}))}
                        className="border px-1 py-0.5 text-sm w-16 text-right" type="number" />
                    </td>
                    <td className="text-right px-3 py-2">{t.results_count}</td>
                    <td className="text-right px-3 py-2 space-x-2">
                      <button onClick={saveEdit} className="text-green-700 hover:underline text-xs">Save</button>
                      <button onClick={() => setEditingId(null)} className="text-gray-500 hover:underline text-xs">Cancel</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-3 py-2">
                      <Link href={`/admin/tournament/${t.id}`} className="hover:underline font-medium">
                        {t.short_name || t.name}
                      </Link>
                      {t.short_name && t.short_name !== t.name && (
                        <span className="block text-xs text-gray-400 truncate max-w-xs">{t.name}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`text-xs px-1.5 py-0.5 ${t.section === 'ladies' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'}`}>
                        {t.section}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs whitespace-nowrap">{t.start_date || '—'}</td>
                    <td className="px-3 py-2 text-xs">{t.location || '—'}</td>
                    <td className="text-right px-3 py-2">{t.rounds || '—'}</td>
                    <td className="text-right px-3 py-2">{t.results_count}</td>
                    <td className="text-right px-3 py-2 space-x-2">
                      <button onClick={() => startEdit(t)} className="text-blue-600 hover:underline text-xs">Edit</button>
                      <button onClick={() => handleDelete(t.id, t.name)} className="text-red-600 hover:underline text-xs">Delete</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
