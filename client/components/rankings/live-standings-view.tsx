'use client'

import { Fragment, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, Crown } from 'lucide-react'
import { Card } from '@/components/ui/card'
import {
  CustomTable,
  CustomTableHeader,
  CustomTableBody,
  CustomTableRow,
  CustomTableHead,
  CustomTableCell
} from '@/components/ui/custom-table'
import { getDisplayName } from '@/components/rankings/utils'
import dayjs from '@/lib/dayjs'
import { formatChance } from '@/lib/qualification-odds'
import { cn } from '@/lib/utils'
import type { LiveCategory, LiveGame } from '@/services/api'

export interface LiveRoundRow {
  odds: number | null
  game: LiveGame | null
  points: number | null
  tpr: number | null
}

export interface LiveRow {
  id: string
  fideId: string | null
  name: string
  rank: number
  qualifying: boolean
  kenyaNumber1: boolean
  points: number | null
  games: number | null
  tpr: number | null
  voided: boolean
  odds: number | null
  before: number | null
  rounds: LiveRoundRow[]
}

export interface LiveCategoryView {
  rows: LiveRow[]
  shown: number
  completedRound: number
}

const CATEGORY_LABEL: Record<LiveCategory, string> = { open: 'Open', ladies: 'Ladies' }
function formatScore(points: number): string {
  const whole = Math.floor(points)
  const half = points - whole >= 0.5 ? '½' : ''
  return whole === 0 && half ? half : `${whole}${half}`
}

// Odds change in percentage points, as on the player page.
function pointChange(now: number | null, before: number | null): number {
  if (now === null || before === null) return 0
  return (Math.round(now * 1000) - Math.round(before * 1000)) / 10
}

function OddsChange({ now, before }: { now: number | null, before: number | null }) {
  const change = pointChange(now, before)
  if (change === 0) return <span className="text-gray-400">—</span>
  const up = change > 0
  const magnitude = Math.abs(change).toFixed(1)
  return (
    <span
      aria-label={`${up ? 'Up' : 'Down'} ${magnitude} points`}
      className={cn('inline-flex items-baseline gap-1 font-medium', up ? 'text-emerald-700' : 'text-red-600')}>
      <span className="text-[10px]" aria-hidden>{up ? '\u25B2' : '\u25BC'}</span>
      {magnitude}
    </span>
  )
}

function Dash() {
  return <span className="text-gray-400">—</span>
}

function PlayerName({ row, category }: { row: LiveRow, category: LiveCategory }) {
  const tone = row.kenyaNumber1 ? 'text-amber-700' : row.qualifying ? 'text-blue-700' : 'text-blue-600'
  if (!row.fideId) return <span className="font-medium" title={row.name}>{getDisplayName(row.name)}</span>
  return (
    <Link
      href={`/player/${row.fideId}${category === 'ladies' ? '?gender=f' : ''}`}
      className={cn('font-medium sm:hover:underline', tone)}
      title={row.name}>
      {getDisplayName(row.name)}
    </Link>
  )
}

function gameResult(game: LiveGame): string {
  if (game.kind === 'unpaired') return '–'
  if (game.kind === 'forfeit') return game.score ? '+' : '−'
  return game.score === 0.5 ? '½' : String(game.score)
}

function RoundGame({ game }: { game: LiveGame | null }) {
  if (!game) return <span className="text-gray-400">Not paired</span>
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className="w-3 shrink-0 text-center font-semibold text-gray-900">{gameResult(game)}</span>
      {game.opponent ? (
        <>
          <span
            className={cn(
              'h-2.5 w-2.5 shrink-0 rounded-[2px] border border-gray-400',
              game.color === 'b' ? 'bg-gray-800' : 'bg-white'
            )}
            role="img"
            aria-label={game.color === 'b' ? 'Black' : 'White'}
          />
          <span className="truncate" title={game.opponent}>{getDisplayName(game.opponent)}</span>
          {game.opponent_rating && <span className="shrink-0 tabular-nums text-gray-400">{game.opponent_rating}</span>}
          {game.kind === 'forfeit' && <span className="shrink-0 text-gray-400">forfeit</span>}
        </>
      ) : (
        <span className="text-gray-400">{game.kind === 'bye' ? 'Bye' : 'Not paired'}</span>
      )}
    </span>
  )
}

function PlayerRounds({ row, className }: { row: LiveRow, className: string }) {
  return row.rounds.map((round, index) => {
    const previous = index === 0 ? row.before : row.rounds[index - 1].odds
    return (
      <tr
        key={index}
        className={cn(
          className,
          'bg-gray-50/80 text-xs text-gray-600 [&>td]:!py-1.5 [&>td]:px-2 sm:[&>td]:px-4',
          index === row.rounds.length - 1 ? 'border-b border-gray-200' : ''
        )}>
        <td className="text-right tabular-nums text-gray-400">R{index + 1}</td>
        <td className="max-w-[160px] sm:max-w-none">{row.points !== null && <RoundGame game={round.game} />}</td>
        <td className="text-right tabular-nums whitespace-nowrap">
          {round.points !== null ? formatScore(round.points) : <Dash />}
        </td>
        <td className="hidden sm:table-cell text-right tabular-nums">{round.tpr ?? <Dash />}</td>
        <td className="text-right tabular-nums whitespace-nowrap text-gray-900">
          {round.odds !== null ? formatChance(round.odds) : <Dash />}
        </td>
        <td className="text-right tabular-nums whitespace-nowrap">
          <OddsChange now={round.odds} before={previous} />
        </td>
        <td />
      </tr>
    )
  })
}

interface LiveStandingsViewProps {
  event: string
  rounds: number
  updatedAt: string
  views: Record<LiveCategory, LiveCategoryView | null>
  initialCategory: LiveCategory
}

export function LiveStandingsView({ event, rounds, updatedAt, views, initialCategory }: LiveStandingsViewProps) {
  const [category, setCategory] = useState<LiveCategory>(initialCategory)
  const [expanded, setExpanded] = useState(false)
  const [openRows, setOpenRows] = useState<ReadonlySet<string>>(new Set())
  const view = views[category]
  if (!view) return null

  const hidden = Math.max(view.rows.length - view.shown, 0)
  const roundLabel = view.completedRound === rounds ? 'Final' : `Round ${view.completedRound} of ${rounds}`
  const toggleRow = (id: string) => setOpenRows(current => {
    const next = new Set(current)
    if (!next.delete(id)) next.add(id)
    return next
  })

  return (
    <Card className="w-full gap-0 overflow-hidden rounded-lg border-0 bg-white/95 p-0 shadow-elevation-low">
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-2.5 sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-60 motion-safe:animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
          </span>
          <h2 className="truncate text-sm font-semibold text-gray-900">{event}</h2>
          <span className="whitespace-nowrap text-xs tabular-nums text-gray-500">
            {roundLabel}
            <span className="hidden sm:inline"> · {dayjs(updatedAt).tz('Africa/Nairobi').format('HH:mm')}</span>
          </span>
        </div>
        <div className="inline-flex shrink-0 divide-x divide-gray-200 overflow-hidden rounded-md border border-gray-200" role="group" aria-label="Category">
          {(['open', 'ladies'] as const).map(option => (
            <button
              key={option}
              type="button"
              disabled={!views[option]}
              aria-pressed={category === option}
              onClick={() => setCategory(option)}
              className={cn(
                'px-3 py-1 text-xs font-medium transition-colors disabled:opacity-40',
                category === option
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              )}>
              {CATEGORY_LABEL[option]}
            </button>
          ))}
        </div>
      </div>

      <div className="group/live" data-expanded={expanded}>
        <CustomTable
          containerClassName="sm:rounded-none sm:shadow-none"
          className="[&>tbody>tr>*]:py-2.5 [&>thead_th]:py-2.5 md:[&>tbody>tr>*]:px-4 md:[&>thead_th]:px-4 xl:[&>tbody>tr>*]:px-6 xl:[&>thead_th]:px-6">
          <CustomTableHeader>
            <CustomTableRow>
              <CustomTableHead className="w-[36px] text-right">#</CustomTableHead>
              <CustomTableHead className="min-w-[108px] sm:min-w-[140px]">Name</CustomTableHead>
              <CustomTableHead className="text-right">Score</CustomTableHead>
              <CustomTableHead className="hidden sm:table-cell text-right">TPR</CustomTableHead>
              <CustomTableHead className="text-right">Odds</CustomTableHead>
              <CustomTableHead className="text-right">Change</CustomTableHead>
              <CustomTableHead className="w-8"><span className="sr-only">Rounds</span></CustomTableHead>
            </CustomTableRow>
          </CustomTableHeader>
          <CustomTableBody>
            {view.rows.map((row, index) => {
              const isCut = index > 0 && !row.qualifying && view.rows[index - 1].qualifying
              const isOpen = openRows.has(row.id)
              const canOpen = row.rounds.length > 0
              const beyondShown = index >= view.shown && 'hidden group-data-[expanded=true]/live:table-row'
              return (
                <Fragment key={row.id}>
                  <CustomTableRow
                    onClick={event => {
                      if (canOpen && !(event.target as HTMLElement).closest('a, button')) toggleRow(row.id)
                    }}
                    className={cn(
                      beyondShown,
                      canOpen && 'cursor-pointer',
                      isOpen && 'border-b-0',
                      isCut && 'border-t-2 border-t-gray-300',
                      row.kenyaNumber1
                        ? 'bg-amber-50/50 border-l-2 border-l-amber-500'
                        : row.qualifying
                          ? 'bg-blue-50/70 border-l-2 border-l-blue-600'
                          : index % 2 === 0 ? 'bg-gray-50/50' : 'bg-white'
                    )}>
                    <CustomTableCell
                      isHeader
                      className={cn(
                        'text-right tabular-nums',
                        row.kenyaNumber1 ? 'text-amber-700' : row.qualifying ? 'text-blue-700' : ''
                      )}>
                      {row.kenyaNumber1 ? (
                        <span className="flex items-center justify-end gap-1">
                          <Crown className="h-3 w-3 text-amber-600" aria-hidden="true" />
                          {row.rank}
                        </span>
                      ) : row.rank}
                    </CustomTableCell>
                    <CustomTableCell className="max-w-[160px] truncate sm:max-w-none">
                      <PlayerName row={row} category={category} />
                    </CustomTableCell>
                    <CustomTableCell className="text-right tabular-nums whitespace-nowrap">
                      {row.points !== null ? (
                        <span className={cn(row.voided && 'text-gray-400 line-through')}>
                          {formatScore(row.points)}/{row.games}
                        </span>
                      ) : <Dash />}
                    </CustomTableCell>
                    <CustomTableCell className="hidden sm:table-cell text-right tabular-nums">
                      {row.tpr !== null ? (
                        <span className={cn(row.voided && 'text-gray-400 line-through')}>{row.tpr}</span>
                      ) : <Dash />}
                    </CustomTableCell>
                    <CustomTableCell className="text-right tabular-nums whitespace-nowrap font-medium text-gray-900">
                      {row.odds !== null ? formatChance(row.odds) : <Dash />}
                    </CustomTableCell>
                    <CustomTableCell className="text-right tabular-nums whitespace-nowrap">
                      <OddsChange now={row.odds} before={row.before} />
                    </CustomTableCell>
                    <CustomTableCell className="w-8 !pl-0 !pr-2 text-right">
                      {canOpen && (
                        <button
                          type="button"
                          onClick={() => toggleRow(row.id)}
                          aria-expanded={isOpen}
                          aria-label={`Rounds for ${row.name}`}
                          className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700">
                          <ChevronDown
                            className={cn('h-4 w-4 transition-transform duration-200', isOpen && 'rotate-180')}
                            aria-hidden="true"
                          />
                        </button>
                      )}
                    </CustomTableCell>
                  </CustomTableRow>
                  {isOpen && (
                    <PlayerRounds
                      row={row}
                      className={cn(
                        beyondShown,
                        row.kenyaNumber1 ? 'border-l-2 border-l-amber-500' : row.qualifying && 'border-l-2 border-l-blue-600'
                      )}
                    />
                  )}
                </Fragment>
              )
            })}
          </CustomTableBody>
        </CustomTable>
        {hidden > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(value => !value)}
            aria-expanded={expanded}
            className="w-full border-t border-gray-200 py-2.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900">
            {expanded ? 'Show fewer' : `Show ${hidden} more`}
          </button>
        )}
      </div>
    </Card>
  )
}
