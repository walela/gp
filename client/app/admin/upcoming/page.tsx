'use client'

import { useState, useEffect } from 'react'
import { upcomingTournaments, plannedTournaments, type Tournament } from '@/lib/active-tournaments'

export default function UpcomingPage() {
  const [upcoming, setUpcoming] = useState<Tournament[]>([])
  const [planned, setPlanned] = useState<Tournament[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<Tournament>>({})
  const [showJson, setShowJson] = useState(false)

  useEffect(() => {
    setUpcoming([...upcomingTournaments])
    setPlanned([...plannedTournaments])
  }, [])

  const allTournaments = [...upcoming, ...planned]

  const startEdit = (t: Tournament) => {
    setEditingId(t.id)
    setEditData({ ...t })
  }

  const saveEdit = () => {
    if (!editingId || !editData) return
    const updated = { ...editData } as Tournament
    setUpcoming(prev => prev.map(t => t.id === editingId ? updated : t))
    setPlanned(prev => prev.map(t => t.id === editingId ? updated : t))
    setEditingId(null)
  }

  const removeTournament = (id: string) => {
    if (!confirm('Remove this tournament?')) return
    setUpcoming(prev => prev.filter(t => t.id !== id))
    setPlanned(prev => prev.filter(t => t.id !== id))
  }

  const generateCode = () => {
    const formatTournament = (t: Tournament) => {
      const lines = [`  {`]
      lines.push(`    id: '${t.id}',`)
      lines.push(`    name: '${t.name}',`)
      if (t.short_name) lines.push(`    short_name: '${t.short_name}',`)
      if (t.startDate) lines.push(`    startDate: '${t.startDate}',`)
      if (t.endDate) lines.push(`    endDate: '${t.endDate}',`)
      if (t.month) lines.push(`    month: '${t.month}',`)
      lines.push(`    location: '${t.location}',`)
      if (t.locationUrl) lines.push(`    locationUrl: '${t.locationUrl}',`)
      if (t.rounds) lines.push(`    rounds: ${t.rounds},`)
      lines.push(`    confirmed: ${t.confirmed},`)
      if (t.registrationUrl) lines.push(`    registrationUrl: '${t.registrationUrl}',`)
      lines.push(`    detailsUrl: ${t.detailsUrl === null ? 'null' : `'${t.detailsUrl}'`}`)
      lines.push(`  }`)
      return lines.join('\n')
    }

    const upcomingCode = upcoming.map(formatTournament).join(',\n')
    const plannedCode = planned.map(formatTournament).join(',\n')

    return `export const upcomingTournaments: Tournament[] = [\n${upcomingCode}\n]\n\nexport const plannedTournaments: Tournament[] = [\n${plannedCode}\n]`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Upcoming Tournaments</h1>
        <button onClick={() => setShowJson(!showJson)}
          className="border-2 border-black px-3 py-1.5 text-sm font-medium hover:bg-gray-100">
          {showJson ? 'Hide Code' : 'Generate Code'}
        </button>
      </div>

      <p className="text-sm text-gray-500">
        Edit upcoming and planned tournaments here. Use &quot;Generate Code&quot; to get the updated TypeScript for <code className="text-xs bg-gray-100 px-1">active-tournaments.ts</code>.
      </p>

      {showJson && (
        <div className="bg-gray-900 text-green-400 p-4 border-2 border-black overflow-x-auto">
          <pre className="text-xs whitespace-pre-wrap">{generateCode()}</pre>
          <button onClick={() => navigator.clipboard.writeText(generateCode())}
            className="mt-2 text-xs text-gray-400 hover:text-white underline">Copy to clipboard</button>
        </div>
      )}

      {[
        { label: 'Upcoming (next 60 days)', items: upcoming, setItems: setUpcoming },
        { label: 'Planned (beyond 60 days)', items: planned, setItems: setPlanned },
      ].map(({ label, items }) => (
        <div key={label} className="space-y-2">
          <h2 className="text-lg font-bold">{label}</h2>
          <div className="bg-white border-2 border-black overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-black bg-gray-50">
                  <th className="text-left px-3 py-2 font-medium">Name</th>
                  <th className="text-left px-3 py-2 font-medium">Date</th>
                  <th className="text-left px-3 py-2 font-medium">Location</th>
                  <th className="text-right px-3 py-2 font-medium">Rds</th>
                  <th className="text-center px-3 py-2 font-medium">Confirmed</th>
                  <th className="text-right px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map(t => (
                  <tr key={t.id} className="border-b border-gray-200 hover:bg-gray-50">
                    {editingId === t.id ? (
                      <>
                        <td className="px-3 py-2">
                          <input value={editData.name || ''} onChange={e => setEditData(d => ({...d, name: e.target.value}))}
                            className="border px-1 py-0.5 text-sm w-full" />
                          <input value={editData.short_name || ''} onChange={e => setEditData(d => ({...d, short_name: e.target.value}))}
                            className="border px-1 py-0.5 text-sm w-full mt-1" placeholder="Short name" />
                        </td>
                        <td className="px-3 py-2">
                          <input type="date" value={editData.startDate || ''} onChange={e => setEditData(d => ({...d, startDate: e.target.value}))}
                            className="border px-1 py-0.5 text-sm" />
                          <input type="date" value={editData.endDate || ''} onChange={e => setEditData(d => ({...d, endDate: e.target.value}))}
                            className="border px-1 py-0.5 text-sm mt-1" />
                        </td>
                        <td className="px-3 py-2">
                          <input value={editData.location || ''} onChange={e => setEditData(d => ({...d, location: e.target.value}))}
                            className="border px-1 py-0.5 text-sm w-full" />
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" value={editData.rounds || ''} onChange={e => setEditData(d => ({...d, rounds: parseInt(e.target.value) || undefined}))}
                            className="border px-1 py-0.5 text-sm w-16 text-right" />
                        </td>
                        <td className="text-center px-3 py-2">
                          <input type="checkbox" checked={editData.confirmed ?? true} onChange={e => setEditData(d => ({...d, confirmed: e.target.checked}))} />
                        </td>
                        <td className="text-right px-3 py-2 space-x-2">
                          <button onClick={saveEdit} className="text-green-700 hover:underline text-xs">Save</button>
                          <button onClick={() => setEditingId(null)} className="text-gray-500 hover:underline text-xs">Cancel</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-2 font-medium">{t.short_name || t.name}</td>
                        <td className="px-3 py-2 text-xs whitespace-nowrap">
                          {t.startDate || t.month || 'TBA'}
                          {t.endDate && t.endDate !== t.startDate && ` — ${t.endDate}`}
                        </td>
                        <td className="px-3 py-2 text-xs">{t.location}</td>
                        <td className="text-right px-3 py-2">{t.rounds || '—'}</td>
                        <td className="text-center px-3 py-2">
                          {t.confirmed ? <span className="text-green-600">Yes</span> : <span className="text-gray-400">No</span>}
                        </td>
                        <td className="text-right px-3 py-2 space-x-2">
                          <button onClick={() => startEdit(t)} className="text-blue-600 hover:underline text-xs">Edit</button>
                          <button onClick={() => removeTournament(t.id)} className="text-red-600 hover:underline text-xs">Remove</button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td colSpan={6} className="px-3 py-4 text-center text-gray-400 text-sm">No tournaments</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}
