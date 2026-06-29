'use client'

import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import { ChevronLeft, ChevronRight, ExternalLink, RefreshCw, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getChessKenyaOpen2026Audit,
  type ChessKenyaAuditResponse,
  type ChessKenyaAuditRow,
  type ChessKenyaAuditSection
} from '@/services/admin-api'

const PAGE_SIZE = 80

const ISSUE_ORDER: Record<string, number> = {
  chess_kenya_includes_invalid_result: 0,
  event_tpr_mismatch: 1,
  identity_issue: 2,
  summary_mismatch: 3,
  missing_in_tracker: 4,
  missing_in_chess_kenya: 5
}

type SectionId = ChessKenyaAuditSection['id']

type FilterState = {
  query: string
  kind: string
  eventId: string
  page: number
}

type FilterAction =
  | { type: 'query'; value: string }
  | { type: 'kind'; value: string }
  | { type: 'event'; value: string }
  | { type: 'page'; value: number }
  | { type: 'reset' }

type ViewState = {
  activeSection: SectionId
  filtersBySection: Record<SectionId, FilterState>
}

type ViewAction =
  | { type: 'section'; value: SectionId }
  | { type: 'filter'; section: SectionId; action: FilterAction }

const initialFilterState: FilterState = {
  query: '',
  kind: 'all',
  eventId: 'all',
  page: 1
}

const initialViewState: ViewState = {
  activeSection: 'open',
  filtersBySection: {
    open: initialFilterState,
    ladies: initialFilterState
  }
}

function filterReducer(state: FilterState, action: FilterAction): FilterState {
  switch (action.type) {
    case 'query':
      return { ...state, query: action.value, page: 1 }
    case 'kind':
      return { ...state, kind: action.value, page: 1 }
    case 'event':
      return { ...state, eventId: action.value, page: 1 }
    case 'page':
      return { ...state, page: action.value }
    case 'reset':
      return initialFilterState
  }
}

function viewReducer(state: ViewState, action: ViewAction): ViewState {
  switch (action.type) {
    case 'section':
      return { ...state, activeSection: action.value }
    case 'filter':
      return {
        ...state,
        filtersBySection: {
          ...state.filtersBySection,
          [action.section]: filterReducer(state.filtersBySection[action.section] ?? initialFilterState, action.action)
        }
      }
  }
}

function formatValue(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return '-'
  return String(value)
}

function formatDelta(value: number | null | undefined) {
  if (value === null || value === undefined) return '-'
  return value > 0 ? `+${value}` : String(value)
}

function issueClass(kind: string) {
  switch (kind) {
    case 'chess_kenya_includes_invalid_result':
      return 'border-orange-400 bg-orange-50 text-orange-800'
    case 'event_tpr_mismatch':
      return 'border-red-400 bg-red-50 text-red-700'
    case 'identity_issue':
      return 'border-amber-400 bg-amber-50 text-amber-800'
    case 'missing_in_tracker':
      return 'border-purple-400 bg-purple-50 text-purple-700'
    case 'missing_in_chess_kenya':
      return 'border-gray-400 bg-gray-100 text-gray-700'
    default:
      return 'border-blue-400 bg-blue-50 text-blue-700'
  }
}

function rankClass(row: ChessKenyaAuditRow) {
  if (row.severity === 'top_10') return 'text-red-700'
  if (row.severity === 'top_30') return 'text-amber-700'
  if (row.severity === 'top_75') return 'text-blue-700'
  return 'text-gray-600'
}

function rowSearchText(row: ChessKenyaAuditRow) {
  return [
    row.player_name,
    row.chess_kenya_name,
    row.tracker_name,
    row.fide_id,
    row.chess_kenya_fide_id,
    row.tracker_fide_id,
    row.field,
    row.event_name,
    row.kind_label
  ].filter(Boolean).join(' ').toLowerCase()
}

function compareRows(a: ChessKenyaAuditRow, b: ChessKenyaAuditRow) {
  const rankA = a.priority_rank ?? 999999
  const rankB = b.priority_rank ?? 999999
  if (rankA !== rankB) return rankA - rankB

  const kindA = ISSUE_ORDER[a.kind] ?? 99
  const kindB = ISSUE_ORDER[b.kind] ?? 99
  if (kindA !== kindB) return kindA - kindB

  const deltaA = Math.abs(a.delta ?? 0)
  const deltaB = Math.abs(b.delta ?? 0)
  if (deltaA !== deltaB) return deltaB - deltaA

  return a.player_name.localeCompare(b.player_name)
}

function sourceLabel(row: ChessKenyaAuditRow) {
  const bits = []
  if (row.tracker_rank) bits.push(`Tracker #${row.tracker_rank}`)
  if (row.chess_kenya_rank) bits.push(`CK #${row.chess_kenya_rank}`)
  if (row.chess_kenya_row) bits.push(`row ${row.chess_kenya_row}`)
  return bits.join(' / ')
}

function hasActiveFilters(state: FilterState) {
  return Boolean(state.query.trim()) || state.kind !== 'all' || state.eventId !== 'all'
}

function pageRange(currentPage: number, totalPages: number) {
  const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4))
  const end = Math.min(totalPages, start + 4)
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

export function ChessKenyaAuditClient() {
  const [audit, setAudit] = useState<ChessKenyaAuditResponse | null>(null)
  const [view, dispatchView] = useReducer(viewReducer, initialViewState)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setAudit(await getChessKenyaOpen2026Audit())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load audit')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const activeSection = useMemo(() => {
    if (!audit) return null
    return audit.sections.find(section => section.id === view.activeSection) ?? audit.sections[0] ?? null
  }, [audit, view.activeSection])

  const activeSectionId = activeSection?.id ?? view.activeSection
  const filters = view.filtersBySection[activeSectionId] ?? initialFilterState

  const filteredRows = useMemo(() => {
    if (!activeSection) return []
    const query = filters.query.trim().toLowerCase()
    return activeSection.rows
      .filter(row => {
        if (filters.kind !== 'all' && row.kind !== filters.kind) return false
        if (filters.eventId !== 'all' && row.event_id !== filters.eventId) return false
        if (query && !rowSearchText(row).includes(query)) return false
        return true
      })
      .sort(compareRows)
  }, [activeSection, filters.eventId, filters.kind, filters.query])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))
  const currentPage = Math.min(filters.page, totalPages)
  const startRow = (currentPage - 1) * PAGE_SIZE
  const visibleRows = filteredRows.slice(startRow, startRow + PAGE_SIZE)
  const firstVisibleRow = filteredRows.length === 0 ? 0 : startRow + 1
  const lastVisibleRow = startRow + visibleRows.length
  const filtersActive = hasActiveFilters(filters)

  const dispatchFilter = (action: FilterAction) => {
    dispatchView({ type: 'filter', section: activeSectionId, action })
  }

  if (loading) {
    return (
      <div className="border-2 border-black bg-white px-4 py-6 text-sm text-gray-600">
        Loading audit...
      </div>
    )
  }

  if (error) {
    return (
      <div className="border-2 border-red-500 bg-red-50 p-5 text-sm text-red-700">
        <p className="font-bold">Audit unavailable</p>
        <p className="mt-1">{error}</p>
        <button
          onClick={load}
          className="mt-4 inline-flex items-center gap-2 border-2 border-black bg-white px-3 py-1.5 text-sm font-medium hover:bg-gray-100">
          <RefreshCw className="size-4" />
          Retry
        </button>
      </div>
    )
  }

  if (!audit || !activeSection) return null

  const { summary } = activeSection
  const stats = [
    { label: 'Discrepancies', value: summary.discrepancy_rows },
    { label: 'Chess Kenya players', value: summary.chess_kenya_players },
    { label: 'Tracker players', value: summary.tracker_players }
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Chess Kenya 2026 Audit</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
            <span>{activeSection.source.label}</span>
            <span aria-hidden>/</span>
            <span>Generated {new Date(audit.generated_at).toLocaleString()}</span>
          </div>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 self-start border-2 border-black bg-white px-3 py-2 text-sm font-medium hover:bg-gray-100 sm:self-auto">
          <RefreshCw className="size-4" />
          Refresh
        </button>
      </div>

      <div className="inline-flex border-2 border-black bg-white">
        {audit.sections.map((section, index) => {
          const active = section.id === activeSection.id
          return (
            <button
              key={section.id}
              onClick={() => dispatchView({ type: 'section', value: section.id })}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors',
                index > 0 && 'border-l-2 border-black',
                active ? 'bg-black text-white' : 'hover:bg-gray-100'
              )}>
              <span>{section.label}</span>
              <span
                className={cn(
                  'min-w-5 px-1.5 py-0.5 text-center text-[11px] font-semibold tabular-nums',
                  active ? 'bg-white/20 text-white' : 'bg-black/10 text-gray-700'
                )}>
                {section.summary.discrepancy_rows}
              </span>
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {stats.map(stat => (
          <div key={stat.label} className="border-2 border-black bg-white p-3">
            <div className="text-2xl font-bold tabular-nums">{stat.value}</div>
            <div className="mt-0.5 text-xs uppercase tracking-wide text-gray-500">{stat.label}</div>
          </div>
        ))}
      </div>

      {!activeSection.source.loaded && (
        <div className="border-2 border-amber-400 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
          CSV not loaded for this section.
        </div>
      )}

      {activeSection.notes.length > 0 && (
        <div className="border-2 border-amber-400 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <ul className="space-y-1">
            {activeSection.notes.map(note => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="border-2 border-black bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_220px_220px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <input
              value={filters.query}
              onChange={event => dispatchFilter({ type: 'query', value: event.target.value })}
              className="h-10 w-full border-2 border-black bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/20"
              placeholder="FIDE ID or player"
            />
          </div>

          <select
            value={filters.kind}
            onChange={event => dispatchFilter({ type: 'kind', value: event.target.value })}
            aria-label="Issue type"
            className="h-10 border-2 border-black bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/20">
            <option value="all">All issue types</option>
            {activeSection.kinds.map(kind => (
              <option key={kind.id} value={kind.id}>
                {kind.label} ({kind.count})
              </option>
            ))}
          </select>

          <select
            value={filters.eventId}
            onChange={event => dispatchFilter({ type: 'event', value: event.target.value })}
            aria-label="Event"
            className="h-10 border-2 border-black bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/20">
            <option value="all">All events</option>
            {activeSection.events.map(event => (
              <option key={event.id} value={event.id}>
                {event.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => dispatchFilter({ type: 'reset' })}
            disabled={!filtersActive && currentPage === 1}
            className="inline-flex h-10 items-center justify-center gap-2 border-2 border-black bg-white px-4 text-sm font-medium hover:bg-gray-100 disabled:opacity-40">
            <X className="size-4" />
            Clear
          </button>
        </div>

        <div className="mt-3 flex flex-col gap-2 border-t border-gray-200 pt-3 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Showing <strong className="text-gray-900">{firstVisibleRow}-{lastVisibleRow}</strong> of{' '}
            <strong className="text-gray-900">{filteredRows.length}</strong>, sorted by contender rank.
          </span>
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center gap-1 self-start sm:self-auto">
              <button
                onClick={() => dispatchFilter({ type: 'page', value: currentPage - 1 })}
                disabled={currentPage <= 1}
                className="inline-flex h-8 items-center gap-1 border border-black px-2 font-medium text-gray-900 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40">
                <ChevronLeft className="size-3.5" />
                Prev
              </button>
              {pageRange(currentPage, totalPages).map(page => (
                <button
                  key={page}
                  onClick={() => dispatchFilter({ type: 'page', value: page })}
                  aria-current={page === currentPage ? 'page' : undefined}
                  className={cn(
                    'h-8 min-w-8 border border-black px-2 font-medium tabular-nums hover:bg-gray-100',
                    page === currentPage && 'bg-black text-white hover:bg-black'
                  )}>
                  {page}
                </button>
              ))}
              <span className="px-1 text-gray-500">of {totalPages}</span>
              <button
                onClick={() => dispatchFilter({ type: 'page', value: currentPage + 1 })}
                disabled={currentPage >= totalPages}
                className="inline-flex h-8 items-center gap-1 border border-black px-2 font-medium text-gray-900 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40">
                Next
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="border-2 border-black bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-black bg-gray-50 text-left">
              <th className="w-[92px] px-3 py-2 font-medium">Impact</th>
              <th className="min-w-[220px] px-3 py-2 font-medium">Player</th>
              <th className="min-w-[180px] px-3 py-2 font-medium">Issue</th>
              <th className="min-w-[160px] px-3 py-2 font-medium">Field</th>
              <th className="px-3 py-2 text-right font-medium">Chess Kenya</th>
              <th className="px-3 py-2 text-right font-medium">Tracker</th>
              <th className="px-3 py-2 text-right font-medium">Delta</th>
              <th className="min-w-[180px] px-3 py-2 text-right font-medium">Sources</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-sm text-gray-500">
                  No discrepancies match the current filters.
                </td>
              </tr>
            ) : (
              visibleRows.map(row => (
                <tr key={row.id} className="border-b border-gray-200 align-top last:border-b-0 hover:bg-gray-50">
                  <td className="px-3 py-2 whitespace-normal">
                    <div className={cn('font-bold tabular-nums', rankClass(row))}>
                      {row.priority_rank ? `#${row.priority_rank}` : '-'}
                    </div>
                    <div className="mt-1 text-[11px] leading-4 text-gray-500">
                      {sourceLabel(row)}
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-normal">
                    <div className="font-medium text-gray-950">{row.player_name || '-'}</div>
                    <div className="mt-1 text-xs text-gray-500">
                      {row.fide_id || row.tracker_fide_id || row.chess_kenya_fide_id || 'No FIDE ID'}
                    </div>
                    {row.chess_kenya_fide_id && row.tracker_fide_id && row.chess_kenya_fide_id !== row.tracker_fide_id && (
                      <div className="mt-1 text-[11px] leading-4 text-gray-500">
                        CK FIDE: {row.chess_kenya_fide_id}
                        <br />
                        Tracker FIDE: {row.tracker_fide_id}
                      </div>
                    )}
                    {row.chess_kenya_name && row.tracker_name && row.chess_kenya_name !== row.tracker_name && (
                      <div className="mt-1 text-[11px] text-gray-500">
                        CK: {row.chess_kenya_name}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-normal">
                    <span className={cn('inline-flex border px-2 py-1 text-xs font-medium', issueClass(row.kind))}>
                      {row.kind_label}
                    </span>
                    {row.detail && (
                      <div className="mt-2 max-w-[260px] text-xs leading-5 text-gray-500">
                        {row.detail}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-gray-800">{row.event_name || row.field}</div>
                    {row.event_name && row.field !== row.event_name && (
                      <div className="mt-1 text-xs text-gray-500">{row.field}</div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatValue(row.chess_kenya)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatValue(row.tracker)}</td>
                  <td className={cn(
                    'px-3 py-2 text-right font-medium tabular-nums',
                    row.delta && row.delta > 0 ? 'text-green-700' : row.delta && row.delta < 0 ? 'text-red-700' : 'text-gray-500'
                  )}>
                    {formatDelta(row.delta)}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {row.links.map(link => (
                        <a
                          key={`${row.id}:${link.label}`}
                          href={link.href}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 border border-black px-2 py-1 text-xs font-medium text-gray-900 hover:bg-black hover:text-white">
                          {link.label}
                          <ExternalLink className="size-3" />
                        </a>
                      ))}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
