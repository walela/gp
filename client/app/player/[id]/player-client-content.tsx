'use client'

import Link from 'next/link'
import { useState } from 'react'

import { PlayerDetails, PlayerResult, PlayerRanking } from '@/services/api'
import { Trophy, CalendarDays, TrendingUp, Star, ExternalLink, ArrowDownIcon, ArrowUpIcon, ArrowUpDownIcon } from 'lucide-react'
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

interface PlayerClientContentProps {
  player: PlayerDetails
  playerRanking: (PlayerRanking & { currentRank?: number }) | null
}

type SortField = 'tournament' | 'start_rank' | 'rating' | 'points' | 'tpr'

export default function PlayerClientContent({ player, playerRanking }: PlayerClientContentProps) {
  const [sortField, setSortField] = useState<SortField>('tpr')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  // Calculate performance metrics
  const totalTournaments = player.results.length
  const bestTpr = Math.max(...player.results.map(r => r.tpr || 0))
  const validTprResults = player.results.filter(r => r.tpr && (!r.result_status || r.result_status === 'valid'))
  const averageTpr =
    validTprResults.length > 0 ? Math.round(validTprResults.reduce((acc, r) => acc + r.tpr!, 0) / validTprResults.length) : 0

  // Use ranking data from API if available
  const currentRating = playerRanking
    ? playerRanking.tournaments_played >= 4
      ? playerRanking.best_4
      : playerRanking.tournaments_played >= 3
        ? playerRanking.best_3
        : playerRanking.tournaments_played >= 2
          ? playerRanking.best_2
          : playerRanking.best_1
    : 0
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

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDownIcon className="h-4 w-4" />
    }
    return sortDirection === 'asc' ? <ArrowUpIcon className="h-4 w-4" /> : <ArrowDownIcon className="h-4 w-4" />
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8 max-w-6xl">
      {/* Player Header */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden sm:block hidden">
        <div className="bg-gray-50 px-4 py-4 border-b border-gray-200">
          <div className="flex flex-col space-y-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{player.name}</h1>

            {player.fide_id && (
              <div className="flex items-center gap-2">
                <a
                  href={`https://ratings.fide.com/profile/${player.fide_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm flex items-center gap-1.5 font-medium">
                  FIDE ID: {player.fide_id}
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Stats Section */}
        <div className="p-4 grid grid-cols-5 gap-4 bg-gray-50">
          <div className="flex flex-col items-center">
            <Star className="h-4 w-4 text-amber-500 mb-1" />
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Best</span>
            <p className="font-semibold text-lg flex items-center gap-1">
              {bestTpr}
              {bestTpr >= 2000 && <Trophy className="h-3 w-3 text-amber-500" />}
            </p>
          </div>

          <div className="flex flex-col items-center">
            <Star className="h-4 w-4 text-blue-500 mb-1" />
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Best 4</span>
            <p className="font-semibold text-lg">{currentRating || '-'}</p>
          </div>

          <div className="flex flex-col items-center">
            <TrendingUp className="h-4 w-4 text-gray-500 mb-1" />
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Avg</span>
            <p className="font-semibold text-lg">{averageTpr || '-'}</p>
          </div>

          <div className="flex flex-col items-center">
            <CalendarDays className="h-4 w-4 text-gray-500 mb-1" />
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Tournaments</span>
            <p className="font-semibold text-lg">{totalTournaments}</p>
          </div>

          <div className="flex flex-col items-center">
            <Trophy className="h-4 w-4 text-green-500 mb-1" />
            <span className="text-xs text-muted-foreground uppercase tracking-wide">GP Ranking</span>
            <p className="font-semibold text-lg">#{currentRank || '-'}</p>
          </div>
        </div>
      </div>

      {/* Mobile Player Header */}
      <div className="sm:hidden -mx-4">
        <div className="bg-gradient-to-br from-white/95 via-white/90 to-white/85 backdrop-blur-md border-0 border-b border-gray-200/50 rounded-none shadow-lg">
          <div className="bg-gradient-to-r from-slate-50/95 via-stone-50/90 to-gray-50/95 backdrop-blur-md px-4 py-4 border-b border-gray-300/60">
            <div className="flex flex-col space-y-2">
              <h1 className="text-2xl font-bold text-gray-900 drop-shadow-sm">{player.name}</h1>

              {player.fide_id && (
                <div className="flex items-center gap-2">
                  <a
                    href={`https://ratings.fide.com/profile/${player.fide_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm flex items-center gap-1.5 font-medium drop-shadow-sm">
                    FIDE ID: {player.fide_id}
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Simplified Mobile Stats */}
          <div className="p-4 grid grid-cols-3 gap-4 bg-gradient-to-b from-white/85 via-white/75 to-white/70 backdrop-blur-lg">
            <div className="flex flex-col items-center bg-white/30 backdrop-blur-sm rounded-lg p-3 border border-white/40 shadow-sm">
              <Star className="h-4 w-4 text-amber-500 mb-1 drop-shadow-sm" />
              <span className="text-xs text-gray-700 uppercase tracking-wide font-semibold">Best</span>
              <p className="font-bold text-lg text-gray-900 drop-shadow-sm">{bestTpr}</p>
            </div>

            <div className="flex flex-col items-center bg-white/30 backdrop-blur-sm rounded-lg p-3 border border-white/40 shadow-sm">
              <Star className="h-4 w-4 text-blue-500 mb-1 drop-shadow-sm" />
              <span className="text-xs text-gray-700 uppercase tracking-wide font-semibold">Best 4</span>
              <p className="font-bold text-lg text-gray-900 drop-shadow-sm">{currentRating || '-'}</p>
            </div>

            <div className="flex flex-col items-center bg-white/30 backdrop-blur-sm rounded-lg p-3 border border-white/40 shadow-sm">
              <Trophy className="h-4 w-4 text-green-500 mb-1 drop-shadow-sm" />
              <span className="text-xs text-gray-700 uppercase tracking-wide font-semibold">Ranking</span>
              <p className="font-bold text-lg text-gray-900 drop-shadow-sm">#{currentRank || '-'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tournament History */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold -mx-4 sm:mx-0">Tournament History</h2>

        {/* Mobile View */}
        <div className="block sm:hidden -mx-4">
          <Card className="rounded-none border-l-0 border-r-0 shadow-sm overflow-hidden bg-white/90 backdrop-blur-sm p-0">
            <CustomTable className="h-full">
              <CustomTableHeader>
                <CustomTableRow>
                  <CustomTableHead className="cursor-pointer select-none text-xs px-2" onClick={() => handleSort('tournament')}>
                    <div className="flex items-center gap-1">
                      <span>Tournament</span>
                      <span className="text-muted-foreground">
                        <SortIcon field="tournament" />
                      </span>
                    </div>
                  </CustomTableHead>
                  <CustomTableHead
                    className="cursor-pointer select-none text-right text-xs px-2"
                    onClick={() => handleSort('tpr')}>
                    <div className="flex items-center gap-1 justify-end">
                      <span>TPR</span>
                      <span className="text-muted-foreground">
                        <SortIcon field="tpr" />
                      </span>
                    </div>
                  </CustomTableHead>
                  <CustomTableHead
                    className="cursor-pointer select-none text-right text-xs px-2"
                    onClick={() => handleSort('points')}>
                    <div className="flex items-center gap-1 justify-end">
                      <span>Points</span>
                      <span className="text-muted-foreground">
                        <SortIcon field="points" />
                      </span>
                    </div>
                  </CustomTableHead>
                </CustomTableRow>
              </CustomTableHeader>
              <CustomTableBody>
                {sortedResults.map((result: PlayerResult, index) => (
                  <CustomTableRow
                    key={result.tournament_id}
                    className={cn(index % 2 === 0 ? 'bg-gray-50/50 hover:bg-gray-100/50' : 'bg-white hover:bg-gray-50/50')}>
                    <CustomTableCell className="px-2 py-3">
                      <div className="flex flex-col gap-1">
                        <Link
                          href={`/tournament/${result.tournament_id}`}
                          className="font-medium text-blue-600 hover:text-blue-700 hover:underline underline-offset-4 text-sm leading-tight">
                          {getShortTournamentName(result.tournament_name)}
                        </Link>
                        <div className="text-xs text-gray-500 space-x-2">
                          <span>Rank: {result.start_rank ?? '-'}</span>
                          <span>•</span>
                          <span>Rating: {result.rating_in_tournament}</span>
                          {result.start_rank && result.player_card_url && (
                            <>
                              <span>•</span>
                              <a
                                href={result.player_card_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                                title="View player card on chess-results.com">
                                Card <ExternalLink className="h-3 w-3" />
                              </a>
                            </>
                          )}
                        </div>
                      </div>
                    </CustomTableCell>
                    <CustomTableCell className="text-right tabular-nums px-2 py-3">
                      {result.result_status && result.result_status !== 'valid' ? (
                        <div className="flex flex-col items-end space-y-1">
                          <span className="text-gray-400 line-through text-sm">{result.tpr ?? '-'}</span>
                          <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded">
                            Invalid
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm font-medium">{result.tpr ?? '-'}</span>
                      )}
                    </CustomTableCell>
                    <CustomTableCell className="text-right tabular-nums px-2 py-3">
                      <span className="text-sm font-medium">
                        {result.points.toFixed(1)}/{result.rounds}
                      </span>
                    </CustomTableCell>
                  </CustomTableRow>
                ))}
              </CustomTableBody>
            </CustomTable>
          </Card>
        </div>

        {/* Desktop View */}
        <div className="hidden sm:block">
          <Card className="rounded-lg border-0 shadow-sm overflow-hidden bg-white/90 backdrop-blur-sm p-0">
            <CustomTable className="h-full">
              <CustomTableHeader>
                <CustomTableRow>
                  <CustomTableHead className="cursor-pointer select-none min-w-[200px]" onClick={() => handleSort('tournament')}>
                    <div className="flex items-center gap-1">
                      <span>Tournament</span>
                      <span className="text-muted-foreground">
                        <SortIcon field="tournament" />
                      </span>
                    </div>
                  </CustomTableHead>
                  <CustomTableHead className="cursor-pointer select-none text-right" onClick={() => handleSort('start_rank')}>
                    <div className="flex items-center gap-1 justify-end">
                      <span>Starting Rank</span>
                      <span className="text-muted-foreground">
                        <SortIcon field="start_rank" />
                      </span>
                    </div>
                  </CustomTableHead>
                  <CustomTableHead className="cursor-pointer select-none text-right" onClick={() => handleSort('rating')}>
                    <div className="flex items-center gap-1 justify-end">
                      <span>Rating</span>
                      <span className="text-muted-foreground">
                        <SortIcon field="rating" />
                      </span>
                    </div>
                  </CustomTableHead>
                  <CustomTableHead className="cursor-pointer select-none text-right" onClick={() => handleSort('points')}>
                    <div className="flex items-center gap-1 justify-end">
                      <span>Points</span>
                      <span className="text-muted-foreground">
                        <SortIcon field="points" />
                      </span>
                    </div>
                  </CustomTableHead>
                  <CustomTableHead className="cursor-pointer select-none text-right" onClick={() => handleSort('tpr')}>
                    <div className="flex items-center gap-1 justify-end">
                      <span>TPR</span>
                      <span className="text-muted-foreground">
                        <SortIcon field="tpr" />
                      </span>
                    </div>
                  </CustomTableHead>
                  <CustomTableHead className="text-center">
                    <span>Link</span>
                  </CustomTableHead>
                </CustomTableRow>
              </CustomTableHeader>
              <CustomTableBody>
                {sortedResults.map((result: PlayerResult, index) => (
                  <CustomTableRow
                    key={result.tournament_id}
                    className={cn(index % 2 === 0 ? 'bg-gray-50/50 hover:bg-gray-100/50' : 'bg-white hover:bg-gray-50/50')}>
                    <CustomTableCell className="whitespace-nowrap">
                      <Link
                        href={`/tournament/${result.tournament_id}`}
                        className="font-medium text-blue-600 hover:text-blue-700 hover:underline underline-offset-4">
                        {getShortTournamentName(result.tournament_name)}
                      </Link>
                    </CustomTableCell>
                    <CustomTableCell className="text-right tabular-nums">{result.start_rank ?? '-'}</CustomTableCell>
                    <CustomTableCell className="text-right tabular-nums">{result.rating_in_tournament}</CustomTableCell>
                    <CustomTableCell className="text-right tabular-nums">
                      {result.points.toFixed(1)}/{result.rounds}
                    </CustomTableCell>
                    <CustomTableCell className="text-right tabular-nums">
                      {result.result_status && result.result_status !== 'valid' ? (
                        <div className="flex items-center justify-end space-x-2">
                          <span className="text-gray-400 line-through">{result.tpr ?? '-'}</span>
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-md border border-red-200">
                            Invalid
                          </span>
                        </div>
                      ) : (
                        (result.tpr ?? '-')
                      )}
                    </CustomTableCell>
                    <CustomTableCell className="text-center">
                      {result.start_rank && result.player_card_url ? (
                        <a
                          href={result.player_card_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 inline-flex justify-center"
                          title="View player card on chess-results.com">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </CustomTableCell>
                  </CustomTableRow>
                ))}
              </CustomTableBody>
            </CustomTable>
          </Card>
        </div>
      </div>
    </div>
  )
}
