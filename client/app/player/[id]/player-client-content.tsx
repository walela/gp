'use client'

import Link from 'next/link'

import { PlayerDetails, PlayerResult, PlayerRanking } from '@/services/api'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Trophy, CalendarDays, TrendingUp, Star, ExternalLink } from 'lucide-react'
import { getShortTournamentName } from '@/utils/tournament'



interface PlayerClientContentProps {
  player: PlayerDetails
  playerRanking: (PlayerRanking & { currentRank?: number }) | null
}

export default function PlayerClientContent({ player, playerRanking }: PlayerClientContentProps) {
  // Calculate performance metrics
  const totalTournaments = player.results.length
  const bestTpr = Math.max(...player.results.map(r => r.tpr || 0))
  const validTprResults = player.results.filter(r => r.tpr && (!r.result_status || r.result_status === 'valid'))
  const averageTpr =
    validTprResults.length > 0 ? Math.round(validTprResults.reduce((acc, r) => acc + r.tpr!, 0) / validTprResults.length) : 0

  // Use ranking data from API if available
  const currentRating = playerRanking ? 
    (playerRanking.tournaments_played >= 4 ? playerRanking.best_4 :
     playerRanking.tournaments_played >= 3 ? playerRanking.best_3 :
     playerRanking.tournaments_played >= 2 ? playerRanking.best_2 :
     playerRanking.best_1) : 0
  const currentRank = playerRanking?.currentRank ?? null

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
        <div className="block sm:hidden -mx-4 space-y-4">
          {player.results.map((result: PlayerResult) => (
                        <div key={result.tournament_id} className="bg-white border-0 border-b border-gray-200 rounded-none">
              <div className="bg-stone-100 px-4 py-3 border-b border-gray-300">
                <div className="flex items-center gap-2">
                  {result.start_rank ? (
                    <a 
                      href={result.player_card_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="font-semibold text-black hover:text-blue-600 text-base"
                      title="View player card on chess-results.com"
                    >
                      {getShortTournamentName(result.tournament_name)}
                    </a>
                  ) : (
                    <Link href={`/tournament/${result.tournament_id}`} className="font-semibold text-gray-700 hover:text-blue-600 text-base">
                      {getShortTournamentName(result.tournament_name)}
                    </Link>
                  )}
                  {result.start_rank && (
                    <ExternalLink className="h-4 w-4 text-blue-500" />
                  )}
                </div>
              </div>
              <div className="p-4">
                
                                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs uppercase text-gray-600 font-semibold tracking-wider">Starting Rank</span>
                    <span className="font-semibold text-base text-gray-900">{result.start_rank ?? '-'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs uppercase text-gray-600 font-semibold tracking-wider">Rating</span>
                    <span className="font-semibold text-base text-gray-900">{result.rating_in_tournament}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs uppercase text-gray-600 font-semibold tracking-wider">Points</span>
                    <span className="font-semibold text-base text-gray-900">{result.points.toFixed(1)}/{result.rounds}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs uppercase text-gray-600 font-semibold tracking-wider">TPR</span>
                    <div className="flex items-center space-x-2">
                      {result.result_status && result.result_status !== 'valid' ? (
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-base text-gray-400 line-through">{result.tpr ?? '-'}</span>
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-md border border-red-200">
                            Invalid
                          </span>
                        </div>
                      ) : (
                        <span className="font-semibold text-base text-gray-900">{result.tpr ?? '-'}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop View */}
        <div className="hidden sm:block bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
            <div className="grid grid-cols-6 gap-4">
              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Tournament</div>
              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide text-center">Starting Rank</div>
              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide text-center">Rating</div>
              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide text-center">Points</div>
              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide text-center">TPR</div>
              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide text-center">Link</div>
            </div>
          </div>
          <ScrollArea className="max-h-[600px]">
            <div className="divide-y divide-gray-100">
                            {player.results.map((result: PlayerResult, index) => (
                <div key={result.tournament_id} className={`px-4 py-4 hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                  <div className="grid grid-cols-6 gap-4 items-center">
                    <div className="flex items-center">
                      <Link href={`/tournament/${result.tournament_id}`} className="font-medium text-gray-900 hover:text-blue-600 text-sm">
                        {getShortTournamentName(result.tournament_name)}
                      </Link>
                    </div>
                    <div className="text-center font-medium text-gray-700 text-sm">{result.start_rank ?? '-'}</div>
                    <div className="text-center font-medium text-gray-700 text-sm">{result.rating_in_tournament}</div>
                    <div className="text-center font-medium text-gray-700 text-sm">{result.points.toFixed(1)}/{result.rounds}</div>
                    <div className="text-center">
                      {result.result_status && result.result_status !== 'valid' ? (
                        <div className="flex items-center justify-center space-x-2">
                          <span className="font-medium text-gray-400 line-through text-sm">{result.tpr ?? '-'}</span>
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-md border border-red-200">
                            Invalid
                          </span>
                        </div>
                      ) : (
                        <span className="font-medium text-gray-900 text-sm">{result.tpr ?? '-'}</span>
                      )}
                    </div>
                    <div className="text-center">
                      {result.start_rank && result.player_card_url ? (
                        <a 
                          href={result.player_card_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                          title="View player card on chess-results.com"
                        >
                          <ExternalLink className="h-4 w-4 mx-auto" />
                        </a>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}
