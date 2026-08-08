'use client'

import Link from 'next/link'
import { useState } from 'react'

import { PlayerDetails, PlayerResult, PlayerRanking } from '@/services/api'
import { Trophy, CalendarDays, TrendingUp, Star, ExternalLink, ArrowDownIcon, ArrowUpIcon, ArrowUpDownIcon, Check, X } from 'lucide-react'
import { getShortTournamentName } from '@/utils/tournament'
import {
  CustomTable,
  CustomTableHeader,
  CustomTableBody,
  CustomTableRow,
  CustomTableHead,
  CustomTableCell
} from '@/components/ui/custom-table'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { trackEvent } from '@/lib/analytics'
import { SeasonSelector } from '@/components/season-selector'

interface PlayerClientContentProps {
  player: PlayerDetails
  playerRanking: (PlayerRanking & { currentRank?: number }) | null
  seasons: number[]
  currentSeason: number
}

type SortField = 'date' | 'tournament' | 'start_rank' | 'rating' | 'points' | 'tpr'

export default function PlayerClientContent({ player, playerRanking, seasons, currentSeason }: PlayerClientContentProps) {
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const isFemale = player.gender === 'F'
  // Calculate performance metrics
  const totalTournaments = player.results.length
  const bestTpr = totalTournaments > 0 ? Math.max(...player.results.map(r => r.tpr || 0)) : null
  const validTprResults = player.results.filter(r => r.tpr && (!r.result_status || r.result_status === 'valid'))
  const averageTpr =
    validTprResults.length > 0 ? Math.round(validTprResults.reduce((acc, r) => acc + r.tpr!, 0) / validTprResults.length) : 0
  const best4Average =
    playerRanking && playerRanking.tournaments_played >= 4 && playerRanking.best_4 > 0 ? playerRanking.best_4 : null
  const bestAverageInfo = playerRanking
    ? playerRanking.tournaments_played >= 4 && playerRanking.best_4 > 0
      ? { label: 'Best 4', value: playerRanking.best_4 }
      : playerRanking.tournaments_played >= 3 && playerRanking.best_3 > 0
        ? { label: 'Best 3', value: playerRanking.best_3 }
        : playerRanking.tournaments_played >= 2 && playerRanking.best_2 > 0
          ? { label: 'Best 2', value: playerRanking.best_2 }
          : playerRanking.tournaments_played >= 1 && playerRanking.best_1 > 0
            ? { label: 'Best 1', value: playerRanking.best_1 }
            : null
    : null
  const bestAverageValue = bestAverageInfo?.value ?? null
  const currentRank = playerRanking?.currentRank ?? null

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const sortedResults = [...player.results].sort((a, b) => {
    let aValue: string | number, bValue: string | number

    switch (sortField) {
      case 'date':
        aValue = a.start_date || ''
        bValue = b.start_date || ''
        break
      case 'tournament':
        aValue = getShortTournamentName(a.tournament_name)
        bValue = getShortTournamentName(b.tournament_name)
        break
      case 'start_rank':
        aValue = a.start_rank || 999999
        bValue = b.start_rank || 999999
        break
      case 'rating':
        aValue = a.rating_in_tournament || 0
        bValue = b.rating_in_tournament || 0
        break
      case 'points':
        aValue = a.points
        bValue = b.points
        break
      case 'tpr':
        aValue = a.tpr || 0
        bValue = b.tpr || 0
        break
    }

    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : aValue < bValue ? -1 : 0
    } else {
      return aValue < bValue ? 1 : aValue > bValue ? -1 : 0
    }
  })

  const countingTournamentIds = (() => {
    const eligible = player.results
      .filter(result => (result.result_status ?? 'valid') === 'valid')
      .sort((a, b) => (b.tpr || 0) - (a.tpr || 0))
      .slice(0, 4)

    return new Set(eligible.map(result => result.tournament_id))
  })()

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDownIcon className="h-4 w-4" />
    }
    return sortDirection === 'asc' ? <ArrowUpIcon className="h-4 w-4" /> : <ArrowDownIcon className="h-4 w-4" />
  }

  return (
    <div className="w-full max-w-6xl mx-auto py-2 space-y-3">
      {/* Season Selector */}
      <div className="flex justify-end">
        <SeasonSelector seasons={seasons} currentSeason={currentSeason} />
      </div>

      {/* Player Header */}
      <div className="overflow-hidden rounded-lg border border-gray-200/60 bg-white/95 shadow-elevation-low sm:border-gray-200 sm:bg-white">
        <div className="border-b border-gray-200/60 bg-gray-50/80 px-3 py-2.5 sm:border-gray-200 sm:bg-gray-50 sm:px-4 sm:py-4">
          <div className="flex flex-col space-y-2 sm:space-y-3">
            <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">{player.name}</h1>

            {player.fide_id && (
              <a
                href={`https://ratings.fide.com/profile/${player.fide_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline">
                FIDE ID: {player.fide_id}
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5 bg-gray-50/50 p-2.5 sm:grid-cols-5 sm:gap-4 sm:bg-gray-50 sm:p-4">
          <div className="flex flex-col items-center rounded border border-gray-100 bg-white px-2.5 py-3 sm:border-0 sm:bg-transparent sm:p-0">
            <Star className="mb-1 h-4 w-4 text-amber-500" />
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Best</span>
            <p className="flex items-center gap-1 text-lg font-semibold">
              {bestTpr ?? '-'}
              {bestTpr && bestTpr >= 2000 && <Trophy className="hidden h-3 w-3 text-amber-500 sm:block" />}
            </p>
          </div>

          <div className="flex flex-col items-center rounded border border-gray-100 bg-white px-2.5 py-3 sm:border-0 sm:bg-transparent sm:p-0">
            <Star className="mb-1 h-4 w-4 text-blue-500" />
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Best 4</span>
            <p className="text-lg font-semibold">{best4Average ?? '-'}</p>
            {bestAverageInfo && bestAverageInfo.label !== 'Best 4' && bestAverageValue !== null && (
              <span className="text-[10px] text-muted-foreground sm:text-[11px]">
                ({bestAverageInfo.label}: {bestAverageValue})
              </span>
            )}
          </div>

          <div className="hidden flex-col items-center sm:flex">
            <TrendingUp className="mb-1 h-4 w-4 text-gray-500" />
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Avg</span>
            <p className="text-lg font-semibold">{averageTpr || '-'}</p>
          </div>

          <div className="hidden flex-col items-center sm:flex">
            <CalendarDays className="mb-1 h-4 w-4 text-gray-500" />
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Tournaments</span>
            <p className="text-lg font-semibold">{totalTournaments}</p>
          </div>

          <div className="flex flex-col items-center rounded border border-gray-100 bg-white px-2.5 py-3 sm:border-0 sm:bg-transparent sm:p-0">
            <Trophy className="mb-1 h-4 w-4 text-green-500" />
            <span className="text-xs uppercase tracking-wide text-muted-foreground">GP Ranking</span>
            <p className="text-lg font-semibold">#{currentRank || '-'}</p>
          </div>
        </div>
      </div>

      {/* Tournament History */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Tournament History</h2>

        {totalTournaments === 0 ? (
          <Card className="rounded-lg border border-gray-200/60 shadow-elevation-low overflow-hidden bg-white/95 p-0">
            <CustomTable>
              <CustomTableHeader>
                <CustomTableRow>
                  <CustomTableHead className="text-xs">Tournament</CustomTableHead>
                  <CustomTableHead className="text-right text-xs">TPR</CustomTableHead>
                  <CustomTableHead className="text-right text-xs">Points</CustomTableHead>
                </CustomTableRow>
              </CustomTableHeader>
              <CustomTableBody>
                <CustomTableRow>
                  <CustomTableCell colSpan={3} className="text-center py-8 text-gray-400">
                    No tournaments in {currentSeason}
                  </CustomTableCell>
                </CustomTableRow>
              </CustomTableBody>
            </CustomTable>
          </Card>
        ) : (
        <div>
          <Card className="rounded-lg border border-gray-200/60 shadow-elevation-low overflow-hidden bg-white/95 p-0">
            <CustomTable className="h-full">
              <CustomTableHeader>
                <CustomTableRow>
                  <CustomTableHead className="w-[28px] px-1 text-center text-xs sm:w-[40px] sm:px-4">
                    <span className="sr-only">Counted</span>
                  </CustomTableHead>
                  <CustomTableHead className="min-w-[120px] cursor-pointer select-none px-2 text-xs sm:min-w-[200px] sm:px-4 sm:text-sm" onClick={() => handleSort('tournament')}>
                    <div className="flex items-center gap-1">
                      <span>Tournament</span>
                      <span className="text-muted-foreground">
                        {getSortIcon("tournament")}
                      </span>
                    </div>
                  </CustomTableHead>
                  <CustomTableHead className="hidden cursor-pointer select-none text-right sm:table-cell" onClick={() => handleSort('start_rank')}>
                    <div className="flex items-center gap-1 justify-end">
                      <span>Starting Rank</span>
                      <span className="text-muted-foreground">
                        {getSortIcon("start_rank")}
                      </span>
                    </div>
                  </CustomTableHead>
                  <CustomTableHead className="hidden cursor-pointer select-none text-right sm:table-cell" onClick={() => handleSort('rating')}>
                    <div className="flex items-center gap-1 justify-end">
                      <span>Rating</span>
                      <span className="text-muted-foreground">
                        {getSortIcon("rating")}
                      </span>
                    </div>
                  </CustomTableHead>
                  <CustomTableHead className="cursor-pointer select-none px-2 text-right text-xs sm:px-4 sm:text-sm" onClick={() => handleSort('points')}>
                    <div className="flex items-center gap-1 justify-end">
                      <span>Points</span>
                      <span className="text-muted-foreground">
                        {getSortIcon("points")}
                      </span>
                    </div>
                  </CustomTableHead>
                  <CustomTableHead className="cursor-pointer select-none px-2 text-right text-xs sm:px-4 sm:text-sm" onClick={() => handleSort('tpr')}>
                    <div className="flex items-center gap-1 justify-end">
                      <span>TPR</span>
                      <span className="text-muted-foreground">
                        {getSortIcon("tpr")}
                      </span>
                    </div>
                  </CustomTableHead>
                  <CustomTableHead className="w-[28px] px-1 text-center text-xs sm:w-auto sm:px-4 sm:text-sm">
                    <span className="sr-only sm:not-sr-only">Link</span>
                  </CustomTableHead>
                </CustomTableRow>
              </CustomTableHeader>
              <CustomTableBody>
                {sortedResults.map((result: PlayerResult, index) => {
                  const isCounting = countingTournamentIds.has(result.tournament_id)
                  const isInvalid = result.result_status && result.result_status !== 'valid'

                  return (
                    <CustomTableRow
                      key={`${result.tournament_id}-${index}`}
                      className={cn(
                        'transition-colors',
                        index % 2 === 0
                          ? 'bg-gray-50/50 hover:bg-gray-100/50'
                          : 'bg-white hover:bg-gray-50/50',
                        isInvalid ? 'opacity-70' : ''
                      )}>
                      <CustomTableCell className="w-[28px] px-1 text-center sm:w-[40px] sm:px-4">
                        {isInvalid ? (
                          <div className="h-4 w-4 rounded-full bg-red-500 flex items-center justify-center mx-auto"><X className="h-2.5 w-2.5 text-white" strokeWidth={3} /></div>
                        ) : isCounting ? (
                          <div className="h-4 w-4 rounded-full bg-emerald-600 flex items-center justify-center mx-auto"><Check className="h-2.5 w-2.5 text-white" strokeWidth={3} /></div>
                        ) : null}
                      </CustomTableCell>
                      <CustomTableCell className="px-2 text-sm sm:px-4 sm:text-base">
                        <Link
                          href={`/tournament/${result.tournament_id}`}
                          className="font-medium text-blue-600 hover:text-blue-700 hover:underline underline-offset-4">
                          {getShortTournamentName(result.tournament_name)}
                        </Link>
                        {isFemale && result.section === 'open' && (
                          <span className="block text-xs uppercase tracking-wider text-gray-500 mt-0.5">Open</span>
                        )}
                      </CustomTableCell>
                      <CustomTableCell className="hidden text-right tabular-nums sm:table-cell">{result.start_rank ?? '-'}</CustomTableCell>
                      <CustomTableCell className="hidden text-right tabular-nums sm:table-cell">{result.rating_in_tournament}</CustomTableCell>
                      <CustomTableCell className="px-2 text-right text-sm tabular-nums sm:px-4 sm:text-base">
                        <span className={cn('font-medium', isCounting ? 'text-blue-700' : '')}>
                          {result.points.toFixed(1)}/{result.rounds}
                        </span>
                      </CustomTableCell>
                      <CustomTableCell className="px-2 text-right text-sm tabular-nums sm:px-4 sm:text-base">
                        {isInvalid ? (
                          <div className="flex items-center justify-end space-x-2">
                            <span className="text-gray-400 line-through">{result.tpr ?? '-'}</span>
                            <span className="hidden items-center rounded-md border border-red-200 bg-red-100 px-2 py-1 text-xs font-medium text-red-800 sm:inline-flex">
                              Invalid
                            </span>
                          </div>
                        ) : (
                          <span className={cn('font-medium', isCounting ? 'text-blue-700' : '')}>{result.tpr ?? '-'}</span>
                        )}
                      </CustomTableCell>
                      <CustomTableCell className="w-[28px] px-1 text-center sm:w-auto sm:px-4">
                        {result.player_card_url ? (
                          <a
                            href={result.player_card_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => trackEvent('Player card click')}
                            className="inline-flex justify-center text-blue-600 hover:text-blue-800"
                            aria-label="View player card on chess-results.com"
                            title="View player card on chess-results.com">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </CustomTableCell>
                    </CustomTableRow>
                  )
                })}
              </CustomTableBody>
            </CustomTable>
          </Card>
        </div>
        )}
      </div>
    </div>
  )
}
