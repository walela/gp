'use client'

import { useState } from 'react'
import {
  scrapeSections, scrapePreview, scrapeValidate, scrapeCommit,
  type ScrapeSection, type ScrapedResult, type ScrapePreview
} from '@/services/admin-api'
import Link from 'next/link'

type Stage = 'input' | 'audit' | 'commit' | 'done'

export default function ScrapePage() {
  const [stage, setStage] = useState<Stage>('input')
  const [tournamentId, setTournamentId] = useState('')
  const [sections, setSections] = useState<ScrapeSection[]>([])
  const [selectedSection, setSelectedSection] = useState<ScrapeSection | null>(null)
  const [roundNumber, setRoundNumber] = useState<string>('')
  const [preview, setPreview] = useState<ScrapePreview | null>(null)
  const [results, setResults] = useState<ScrapedResult[]>([])
  const [removedResults, setRemovedResults] = useState<ScrapedResult[]>([])
  const [editName, setEditName] = useState('')
  const [editMeta, setEditMeta] = useState<ScrapePreview['metadata']>({
    rounds: null, location: null, start_date: null, end_date: null, section: 'open'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [validating, setValidating] = useState(false)
  const [committedId, setCommittedId] = useState('')

  const fetchSections = async () => {
    if (!tournamentId.trim()) return
    setLoading(true)
    setError('')
    try {
      const data = await scrapeSections(tournamentId.trim())
      setSections(data.sections)
      if (data.sections.length === 1) {
        setSelectedSection(data.sections[0])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch sections')
    } finally {
      setLoading(false)
    }
  }

  const runPreview = async () => {
    if (!selectedSection) return
    setLoading(true)
    setError('')
    try {
      const rd = roundNumber ? parseInt(roundNumber) : null
      const data = await scrapePreview(selectedSection.tournament_id, selectedSection.url_param, rd, selectedSection.is_ladies)
      setPreview(data)
      setResults(data.results)
      setRemovedResults([])
      setEditName(data.name)
      setEditMeta(data.metadata)
      setStage('audit')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Scrape failed')
    } finally {
      setLoading(false)
    }
  }

  const removeByFederation = (fed: string) => {
    const toRemove = results.filter(r => r.player.federation === fed)
    setRemovedResults(prev => [...prev, ...toRemove])
    setResults(prev => prev.filter(r => r.player.federation !== fed))
  }

  const removeResult = (index: number) => {
    setRemovedResults(prev => [...prev, results[index]])
    setResults(prev => prev.filter((_, i) => i !== index))
  }

  const restoreResult = (index: number) => {
    const restored = removedResults[index]
    setResults(prev => [...prev, restored].sort((a, b) => a.rank - b.rank))
    setRemovedResults(prev => prev.filter((_, i) => i !== index))
  }

  const updateResultField = (index: number, field: string, value: unknown) => {
    setResults(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r))
  }

  const runValidation = async () => {
    if (!selectedSection) return
    setValidating(true)
    try {
      const data = await scrapeValidate(selectedSection.tournament_id, results)
      setResults(data.results)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Validation failed')
    } finally {
      setValidating(false)
    }
  }

  const commitResults = async () => {
    if (!selectedSection) return
    setLoading(true)
    setError('')
    try {
      const res = await scrapeCommit(selectedSection.tournament_id, editName, results, editMeta)
      setCommittedId(res.tournament_id)
      setStage('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Commit failed')
    } finally {
      setLoading(false)
    }
  }

  // Get unique federations for the filter
  const federations = [...new Set(results.map(r => r.player.federation))].sort()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Scrape Tournament</h1>

      {error && (
        <div className="bg-red-50 border-2 border-red-300 px-4 py-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError('')} className="ml-2 underline">dismiss</button>
        </div>
      )}

      {/* STAGE: INPUT */}
      {stage === 'input' && (
        <div className="bg-white border-2 border-black p-6 space-y-4 max-w-lg">
          <div>
            <label className="block text-sm font-medium mb-1">Chess-Results Tournament ID</label>
            <input
              value={tournamentId}
              onChange={e => setTournamentId(e.target.value)}
              placeholder="e.g. 1339853"
              className="border-2 border-black px-3 py-2 text-sm w-full"
              onKeyDown={e => e.key === 'Enter' && fetchSections()}
            />
            <p className="text-xs text-gray-500 mt-1">The number from chess-results.com/tnr<strong>XXXXXX</strong>.aspx</p>
          </div>

          <button onClick={fetchSections} disabled={loading || !tournamentId.trim()}
            className="bg-black text-white px-4 py-2 text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
            {loading ? 'Fetching sections...' : 'Fetch Sections'}
          </button>

          {sections.length > 0 && (
            <div className="space-y-3 pt-2">
              <p className="text-sm font-medium">Select section:</p>
              {sections.map((s, i) => (
                <label key={i} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="section"
                    checked={selectedSection?.tournament_id === s.tournament_id && selectedSection?.url_param === s.url_param}
                    onChange={() => setSelectedSection(s)}
                  />
                  {s.name}
                  {s.is_ladies && <span className="text-xs bg-pink-100 text-pink-700 px-1.5 py-0.5">Ladies</span>}
                  {s.tournament_id !== tournamentId && <span className="text-xs text-gray-400">(ID: {s.tournament_id})</span>}
                </label>
              ))}
              <div>
                <label className="block text-sm font-medium mb-1">Round (optional)</label>
                <input
                  value={roundNumber}
                  onChange={e => setRoundNumber(e.target.value)}
                  placeholder="Leave blank for latest"
                  type="number"
                  min="1"
                  className="border-2 border-black px-3 py-2 text-sm w-full"
                />
                <p className="text-xs text-gray-500 mt-1">Fetch standings after a specific round. Blank = final/latest round.</p>
              </div>
              <button onClick={runPreview} disabled={loading || !selectedSection}
                className="bg-black text-white px-4 py-2 text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
                {loading ? 'Scraping...' : 'Preview Results'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* STAGE: AUDIT */}
      {stage === 'audit' && preview && (
        <div className="space-y-4">
          {/* Tournament metadata */}
          <div className="bg-white border-2 border-black p-4 space-y-3">
            <h2 className="font-bold text-sm">Tournament Details</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500">Name</label>
                <input value={editName} onChange={e => setEditName(e.target.value)}
                  className="border px-2 py-1 text-sm w-full" />
              </div>
              <div>
                <label className="block text-xs text-gray-500">Section</label>
                <select value={editMeta.section} onChange={e => setEditMeta(m => ({...m, section: e.target.value}))}
                  className="border px-2 py-1 text-sm w-full">
                  <option value="open">Open</option>
                  <option value="ladies">Ladies</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500">Rounds</label>
                <input type="number" value={editMeta.rounds || ''} onChange={e => setEditMeta(m => ({...m, rounds: parseInt(e.target.value) || null}))}
                  className="border px-2 py-1 text-sm w-full" />
              </div>
              <div>
                <label className="block text-xs text-gray-500">Location</label>
                <input value={editMeta.location || ''} onChange={e => setEditMeta(m => ({...m, location: e.target.value}))}
                  className="border px-2 py-1 text-sm w-full" />
              </div>
              <div>
                <label className="block text-xs text-gray-500">Start Date</label>
                <input type="date" value={editMeta.start_date || ''} onChange={e => setEditMeta(m => ({...m, start_date: e.target.value}))}
                  className="border px-2 py-1 text-sm w-full" />
              </div>
              <div>
                <label className="block text-xs text-gray-500">End Date</label>
                <input type="date" value={editMeta.end_date || ''} onChange={e => setEditMeta(m => ({...m, end_date: e.target.value}))}
                  className="border px-2 py-1 text-sm w-full" />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white border-2 border-black p-4 flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium">Filter by country:</span>
            {federations.filter(f => f !== 'KEN').map(fed => (
              <button key={fed} onClick={() => removeByFederation(fed)}
                className="text-xs border border-red-300 text-red-700 px-2 py-1 hover:bg-red-50">
                Remove {fed} ({results.filter(r => r.player.federation === fed).length})
              </button>
            ))}
            <button onClick={runValidation} disabled={validating}
              className="ml-auto text-xs border-2 border-black px-3 py-1 font-medium hover:bg-gray-100 disabled:opacity-50">
              {validating ? 'Validating...' : 'Validate Results'}
            </button>
          </div>

          {/* Empty state */}
          {results.length === 0 && (
            <div className="bg-amber-50 border-2 border-amber-300 px-4 py-6 text-center space-y-2">
              <p className="text-sm font-medium text-amber-800">No KEN players found in results</p>
              <p className="text-xs text-amber-600">The tournament may not have started yet, or results haven&apos;t been published. Try again after round 1 is complete.</p>
              <button onClick={() => setStage('input')} className="text-xs underline text-amber-700">Back to input</button>
            </div>
          )}

          {/* Summary bar */}
          <div className="flex items-center gap-4 text-sm">
            <span><strong>{results.length}</strong> players</span>
            {editMeta.round_fetched && editMeta.rounds && (
              <span className="text-gray-500">Round {editMeta.round_fetched}/{editMeta.rounds}</span>
            )}
            {removedResults.length > 0 && (
              <span className="text-red-600"><strong>{removedResults.length}</strong> removed</span>
            )}
            {results.filter(r => r.result_status && r.result_status !== 'valid').length > 0 && (
              <span className="text-amber-600">
                <strong>{results.filter(r => r.result_status && r.result_status !== 'valid').length}</strong> flagged
              </span>
            )}
          </div>

          {/* Results table */}
          <div className="bg-white border-2 border-black overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-black bg-gray-50">
                  <th className="text-left px-3 py-2 font-medium">Rk</th>
                  <th className="text-left px-3 py-2 font-medium">Name</th>
                  <th className="text-left px-3 py-2 font-medium">FIDE ID</th>
                  <th className="text-left px-3 py-2 font-medium">Fed</th>
                  <th className="text-right px-3 py-2 font-medium">Rating</th>
                  <th className="text-right px-3 py-2 font-medium">Pts</th>
                  <th className="text-right px-3 py-2 font-medium">TPR</th>
                  <th className="text-center px-3 py-2 font-medium">Status</th>
                  <th className="text-right px-3 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} className={`border-b border-gray-200 ${r.result_status && r.result_status !== 'valid' ? 'bg-amber-50' : ''}`}>
                    <td className="px-3 py-1.5">{r.rank}</td>
                    <td className="px-3 py-1.5 font-medium">{r.player.name}</td>
                    <td className="px-3 py-1.5 text-xs text-gray-500">{r.player.fide_id || '—'}</td>
                    <td className="px-3 py-1.5 text-xs">{r.player.federation}</td>
                    <td className="text-right px-3 py-1.5">{r.player.rating || '—'}</td>
                    <td className="text-right px-3 py-1.5">
                      <input type="number" step="0.5" value={r.points}
                        onChange={e => updateResultField(i, 'points', parseFloat(e.target.value))}
                        className="border px-1 py-0.5 w-14 text-right text-sm" />
                    </td>
                    <td className="text-right px-3 py-1.5">
                      <input type="number" value={r.tpr || ''}
                        onChange={e => updateResultField(i, 'tpr', parseInt(e.target.value) || null)}
                        className="border px-1 py-0.5 w-16 text-right text-sm" />
                    </td>
                    <td className="text-center px-3 py-1.5">
                      {r.result_status && (
                        <select value={r.result_status} onChange={e => updateResultField(i, 'result_status', e.target.value)}
                          className={`text-xs border px-1 py-0.5 ${r.result_status !== 'valid' ? 'text-amber-700 bg-amber-50' : ''}`}>
                          <option value="valid">valid</option>
                          <option value="walkover">walkover</option>
                          <option value="incomplete">incomplete</option>
                          <option value="withdrawn">withdrawn</option>
                        </select>
                      )}
                    </td>
                    <td className="text-right px-3 py-1.5">
                      <button onClick={() => removeResult(i)} className="text-red-500 hover:text-red-700 text-xs">remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Removed players */}
          {removedResults.length > 0 && (
            <details className="bg-white border-2 border-gray-300 p-4">
              <summary className="text-sm font-medium cursor-pointer">Removed Players ({removedResults.length})</summary>
              <div className="mt-2 space-y-1">
                {removedResults.map((r, i) => (
                  <div key={i} className="flex items-center justify-between text-sm text-gray-600">
                    <span>{r.player.name} ({r.player.federation}) — {r.points} pts</span>
                    <button onClick={() => restoreResult(i)} className="text-blue-600 hover:underline text-xs">restore</button>
                  </div>
                ))}
              </div>
            </details>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button onClick={() => setStage('input')} className="border-2 border-black px-4 py-2 text-sm font-medium hover:bg-gray-100">
              Back
            </button>
            <button onClick={() => setStage('commit')}
              className="bg-black text-white px-4 py-2 text-sm font-medium hover:bg-gray-800">
              Review & Commit
            </button>
          </div>
        </div>
      )}

      {/* STAGE: COMMIT */}
      {stage === 'commit' && (
        <div className="bg-white border-2 border-black p-6 space-y-4 max-w-lg">
          <h2 className="text-lg font-bold">Confirm Commit</h2>
          <div className="space-y-2 text-sm">
            <p><strong>Tournament:</strong> {editName}</p>
            <p><strong>Section:</strong> {editMeta.section}</p>
            <p><strong>Dates:</strong> {editMeta.start_date} — {editMeta.end_date}</p>
            <p><strong>Location:</strong> {editMeta.location || 'Not set'}</p>
            <p><strong>Rounds:</strong> {editMeta.rounds || 'Not set'}</p>
            <p><strong>Players:</strong> {results.length} ({removedResults.length} removed from scrape)</p>
            {results.filter(r => r.result_status && r.result_status !== 'valid').length > 0 && (
              <p className="text-amber-600">
                <strong>{results.filter(r => r.result_status && r.result_status !== 'valid').length}</strong> results flagged (walkover/incomplete/withdrawn)
              </p>
            )}
          </div>
          <p className="text-xs text-gray-500">
            This will save to the database and recalculate all rankings. Existing results for this tournament will be merged/updated.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setStage('audit')} className="border-2 border-black px-4 py-2 text-sm font-medium hover:bg-gray-100">
              Back to Audit
            </button>
            <button onClick={commitResults} disabled={loading}
              className="bg-green-700 text-white px-4 py-2 text-sm font-medium hover:bg-green-800 disabled:opacity-50">
              {loading ? 'Committing...' : 'Commit to Database'}
            </button>
          </div>
        </div>
      )}

      {/* STAGE: DONE */}
      {stage === 'done' && (
        <div className="bg-white border-2 border-green-500 p-6 space-y-4 max-w-lg">
          <h2 className="text-lg font-bold text-green-700">Committed Successfully</h2>
          <p className="text-sm">{editName} — {results.length} results saved and rankings recalculated.</p>
          <div className="flex gap-3">
            <Link href={`/tournament/${committedId}`} className="border-2 border-black px-4 py-2 text-sm font-medium hover:bg-gray-100">
              View Tournament
            </Link>
            <button onClick={() => { setStage('input'); setSections([]); setSelectedSection(null); setPreview(null); setResults([]); setRemovedResults([]); setTournamentId('') }}
              className="bg-black text-white px-4 py-2 text-sm font-medium hover:bg-gray-800">
              Scrape Another
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
