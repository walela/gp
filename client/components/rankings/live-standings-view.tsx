'use client'

import { Fragment, useState, type ReactNode } from 'react'
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
import { formatChance } from '@/lib/qualification-odds'
import { cn } from '@/lib/utils'
import type { LiveCategory, LiveGame, LiveNextGame } from '@/services/api'

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
  next: LiveNextGame | null
}

export interface LiveCategoryView {
  rows: LiveRow[]
  completedRound: number
  pairedRound: number
}

const CATEGORY_LABEL: Record<LiveCategory, string> = { open: 'Open', ladies: 'Ladies' }
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

// Names are stored surname first, e.g. "Shile, Lenny Mataiga" -> "Shile L."
function shortName(fullName: string): string {
  const [surname, ...rest] = fullName.replace(',', ' ').trim().split(/\s+/)
  return rest.length ? `${surname} ${rest[0].charAt(0)}.` : surname
}

function NameText({ name }: { name: string }) {
  return (
    <>
      <span className="min-[500px]:hidden">{shortName(name)}</span>
      <span className="hidden min-[500px]:inline">{getDisplayName(name)}</span>
    </>
  )
}

function PlayerName({ row, category }: { row: LiveRow, category: LiveCategory }) {
  const tone = row.kenyaNumber1 ? 'text-amber-700' : row.qualifying ? 'text-blue-700' : 'text-blue-600'
  if (!row.fideId) return <span className="font-medium" title={row.name}><NameText name={row.name} /></span>
  return (
    <Link
      href={`/player/${row.fideId}${category === 'ladies' ? '?gender=f' : ''}`}
      className={cn('font-medium sm:hover:underline', tone)}
      title={row.name}>
      <NameText name={row.name} />
    </Link>
  )
}

function formatScore(points: number): string {
  const whole = Math.floor(points)
  const half = points - whole >= 0.5 ? '½' : ''
  return whole === 0 && half ? half : `${whole}${half}`
}

function resultTone(game: LiveGame | null): string {
  if (!game || game.kind === 'unpaired') return 'text-gray-400'
  if (game.score === 1) return 'text-emerald-700'
  return game.score === 0.5 ? 'text-orange-600' : 'text-red-600'
}

function resultLabel(game: LiveGame): string {
  return game.score === 1 ? 'Won' : game.score === 0.5 ? 'Drew' : 'Lost'
}

function RoundGame({ game }: { game: LiveGame | null }) {
  if (!game) return <span className="text-gray-400">Not paired</span>
  return (
    <span className="flex min-w-0 items-center gap-2">
      {game.opponent ? (
        <>
          <span className="sr-only">{resultLabel(game)} against</span>
          <span className="truncate" title={game.opponent}><NameText name={game.opponent} /></span>
          {game.opponent_rating && <span className="hidden shrink-0 tabular-nums text-gray-400 sm:inline">{game.opponent_rating}</span>}
          {game.kind === 'forfeit' && <span className="shrink-0 text-gray-400">forfeit</span>}
        </>
      ) : (
        <span className="text-gray-400">{game.kind === 'bye' ? 'Bye' : 'Not paired'}</span>
      )}
    </span>
  )
}

const NEXT_OUTCOMES = [
  { key: 'win', letter: 'W', label: 'win', tone: 'text-emerald-700' },
  { key: 'draw', letter: 'D', label: 'draw', tone: 'text-orange-600' },
  { key: 'loss', letter: 'L', label: 'loss', tone: 'text-red-600' },
] as const

function NextOutcomes({ next }: { next: LiveNextGame }) {
  return NEXT_OUTCOMES.map(outcome => (
    <span key={outcome.key} className="whitespace-nowrap">
      <span className="sr-only">TPR after a {outcome.label}: </span>
      <span className="text-gray-400" aria-hidden="true">{outcome.letter} </span>
      <span className={cn('font-medium', outcome.tone)}>{next.tpr[outcome.key]}</span>
    </span>
  ))
}

function NextRound({ next, open, className }: { next: LiveNextGame, open: boolean, className: string }) {
  return (
    <tr
      data-open={open}
      inert={!open}
      className={cn(
        className,
        'group/round bg-gray-50/80 text-xs text-gray-600 [&>td]:!p-0',
        open && 'border-b border-gray-200'
      )}>
      <RoundCell className="text-right tabular-nums text-gray-400">R{next.round}</RoundCell>
      <RoundCell cellClassName="max-w-[160px] min-[500px]:max-w-none">
        <span className="flex min-w-0 items-center gap-2">
          <span className="sr-only">Playing</span>
          <span className="truncate" title={next.opponent ?? undefined}>
            {next.opponent ? <NameText name={next.opponent} /> : 'Unknown'}
          </span>
          {next.opponent_rating && (
            <span className="hidden shrink-0 tabular-nums text-gray-400 sm:inline">{next.opponent_rating}</span>
          )}
        </span>
      </RoundCell>
      <RoundCell cellClassName="hidden sm:table-cell" colSpan={2} className="flex justify-end gap-x-3 tabular-nums">
        <NextOutcomes next={next} />
      </RoundCell>
      <RoundCell cellClassName="sm:hidden" className="flex flex-col items-end tabular-nums">
        <NextOutcomes next={next} />
      </RoundCell>
      <td />
      <td />
      <td />
    </tr>
  )
}

function PlayerRounds({ row, open, className }: { row: LiveRow, open: boolean, className: string }) {
  const played = row.rounds.map((round, index) => {
    const previous = index === 0 ? row.before : row.rounds[index - 1].odds
    return (
      <tr
        key={index}
        data-open={open}
        inert={!open}
        className={cn(
          className,
          'group/round bg-gray-50/80 text-xs text-gray-600 [&>td]:!p-0',
          open && index === row.rounds.length - 1 && !row.next && 'border-b border-gray-200'
        )}>
        <RoundCell className="text-right tabular-nums text-gray-400">
          <span className="hidden sm:inline">R{index + 1}</span>
          <span className={cn('font-medium sm:hidden', resultTone(round.game))}>
            {round.points !== null ? `${formatScore(round.points)}/${index + 1}` : `R${index + 1}`}
          </span>
        </RoundCell>
        <RoundCell cellClassName="max-w-[160px] min-[500px]:max-w-none">
          {round.points !== null && <RoundGame game={round.game} />}
        </RoundCell>
        <RoundCell
          cellClassName="hidden sm:table-cell"
          className={cn('text-right font-medium tabular-nums whitespace-nowrap', resultTone(round.game))}>
          {round.points !== null ? `${formatScore(round.points)}/${index + 1}` : <Dash />}
        </RoundCell>
        <RoundCell className="text-right tabular-nums">
          {round.tpr ?? <Dash />}
        </RoundCell>
        <RoundCell className="text-right tabular-nums whitespace-nowrap text-gray-900">
          {round.odds !== null ? formatChance(round.odds) : <Dash />}
        </RoundCell>
        <RoundCell className="text-right tabular-nums whitespace-nowrap">
          <OddsChange now={round.odds} before={previous} />
        </RoundCell>
        <td />
      </tr>
    )
  })
  if (!row.next) return played
  return [...played, <NextRound key="next" next={row.next} open={open} className={className} />]
}

// Table rows can't animate their height, so each cell's content collapses instead.
function RoundCell({ children, className, cellClassName, colSpan }: {
  children: ReactNode
  className?: string
  cellClassName?: string
  colSpan?: number
}) {
  return (
    <td className={cellClassName} colSpan={colSpan}>
      <div className="grid grid-rows-[0fr] opacity-0 transition-[grid-template-rows,opacity] duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] group-data-[open=true]/round:grid-rows-[1fr] group-data-[open=true]/round:opacity-100 motion-reduce:transition-none">
        <div className="overflow-hidden">
          <div className={cn('px-2 py-1.5 sm:px-4 lg:px-3 xl:px-6', className)}>{children}</div>
        </div>
      </div>
    </td>
  )
}

interface LiveStandingsViewProps {
  event: string
  rounds: number
  views: Record<LiveCategory, LiveCategoryView | null>
  initialCategory: LiveCategory
}

export function LiveStandingsView({ event, rounds, views, initialCategory }: LiveStandingsViewProps) {
  const [category, setCategory] = useState<LiveCategory>(initialCategory)
  const [openRows, setOpenRows] = useState<ReadonlySet<string>>(new Set())
  const view = views[category]
  if (!view) return null

  const selectCategory = (option: LiveCategory) => {
    setCategory(option)
    window.history.replaceState(null, '', option === 'ladies' ? '?category=ladies' : window.location.pathname)
  }
  const roundInProgress = view.completedRound < Math.max(view.pairedRound, 1)
  const roundLabel = view.completedRound === rounds
    ? 'Final'
    : `Round ${Math.max(view.pairedRound, view.completedRound, 1)} of ${rounds}`
  const toggleRow = (id: string) => setOpenRows(current => {
    const next = new Set(current)
    if (!next.delete(id)) next.add(id)
    return next
  })

  return (
    <div className="w-full">
      <h1 className="mb-4 text-2xl font-bold tracking-tight md:text-3xl">{event}</h1>
      <div className="flex w-full items-center justify-between gap-2">
        <div
          className="inline-flex divide-x divide-gray-200 rounded-t-lg border border-b-0 bg-white/90 shadow-sm backdrop-blur-sm"
          role="group"
          aria-label="Category">
          {(['open', 'ladies'] as const).map(option => (
            <button
              key={option}
              type="button"
              disabled={!views[option]}
              aria-pressed={category === option}
              onClick={() => selectCategory(option)}
              className={cn(
                'inline-flex items-center justify-center whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-all disabled:opacity-40',
                category === option
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              )}>
              {CATEGORY_LABEL[option]}
            </button>
          ))}
        </div>
        <span className="flex items-center gap-2 whitespace-nowrap text-xs tabular-nums text-gray-500">
          <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
            {roundInProgress && (
              <span className="absolute inline-flex h-full w-full rounded-full bg-orange-500 opacity-60 motion-safe:animate-ping" />
            )}
            <span className={cn('relative inline-flex h-2 w-2 rounded-full', roundInProgress ? 'bg-orange-500' : 'bg-green-500')} />
          </span>
          {roundLabel}
        </span>
      </div>

      <Card className="w-full gap-0 rounded-b-lg border-0 bg-white/95 p-0 shadow-elevation-low sm:rounded-tr-lg">
      <CustomTable
          className="md:[&>tbody>tr>*]:px-4 md:[&>thead_th]:px-4 lg:[&>tbody>tr>*]:px-3 lg:[&>thead_th]:px-3 xl:[&>tbody>tr>*]:px-6 xl:[&>thead_th]:px-6">
          <CustomTableHeader>
            <CustomTableRow>
              <CustomTableHead className="w-[36px] text-right">#</CustomTableHead>
              <CustomTableHead className="min-w-[108px] sm:min-w-[140px]">Name</CustomTableHead>
              <CustomTableHead className="hidden sm:table-cell text-right">Score</CustomTableHead>
              <CustomTableHead className="text-right">TPR</CustomTableHead>
              <CustomTableHead className="text-right">Odds</CustomTableHead>
              <CustomTableHead className="text-right">Change</CustomTableHead>
              <CustomTableHead className="w-8"><span className="sr-only">Rounds</span></CustomTableHead>
            </CustomTableRow>
          </CustomTableHeader>
          <CustomTableBody>
            {view.rows.map((row, index) => {
              const isCut = index > 0 && !row.qualifying && view.rows[index - 1].qualifying
              const isOpen = openRows.has(row.id)
              const canOpen = row.rounds.length > 0 || row.next !== null
              return (
                <Fragment key={row.id}>
                  <CustomTableRow
                    onClick={event => {
                      if (canOpen && !(event.target as HTMLElement).closest('a, button')) toggleRow(row.id)
                    }}
                    className={cn(
                      canOpen && 'cursor-pointer',
                      isCut && 'border-t-2 border-t-gray-300',
                      index % 2 === 0 ? '!bg-white' : '!bg-gray-200/50',
                      row.kenyaNumber1
                        ? 'border-l-2 border-l-amber-500'
                        : row.qualifying && 'border-l-2 border-l-blue-600'
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
                    <CustomTableCell className="max-w-[160px] truncate min-[500px]:max-w-none">
                      <PlayerName row={row} category={category} />
                    </CustomTableCell>
                    <CustomTableCell className="hidden sm:table-cell text-right tabular-nums whitespace-nowrap">
                      {row.points !== null ? (
                        <span className={cn(row.voided && 'text-gray-400 line-through')}>
                          {formatScore(row.points)}/{row.games}
                        </span>
                      ) : <Dash />}
                    </CustomTableCell>
                    <CustomTableCell className="text-right tabular-nums">
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
                            className={cn(
                              'h-4 w-4 transition-transform duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] motion-reduce:transition-none',
                              isOpen && 'rotate-180'
                            )}
                            aria-hidden="true"
                          />
                        </button>
                      )}
                    </CustomTableCell>
                  </CustomTableRow>
                  {canOpen && (
                    <PlayerRounds
                      row={row}
                      open={isOpen}
                      className={cn(
                        row.kenyaNumber1 ? 'border-l-2 border-l-amber-500' : row.qualifying && 'border-l-2 border-l-blue-600'
                      )}
                    />
                  )}
                </Fragment>
              )
            })}
          </CustomTableBody>
      </CustomTable>
      </Card>
    </div>
  )
}
