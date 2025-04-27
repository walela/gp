'use client'

import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { PlayerDetails, PlayerResult } from '@/services/api'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Trophy, CalendarDays, TrendingUp, Star, ExternalLink, Hash } from 'lucide-react'
import { getShortTournamentName } from '@/utils/tournament'
import {
  CustomTable,
  CustomTableHeader,
  CustomTableBody,
  CustomTableRow,
  CustomTableHead,
  CustomTableCell
} from '@/components/ui/custom-table'

interface PlayerClientContentProps {
  player: PlayerDetails
}

export default function PlayerClientContent({ player }: PlayerClientContentProps) {
  // Calculate performance metrics
  const totalTournaments = player.results.length
  const bestTpr = Math.max(...player.results.map(r => r.tpr || 0))
  const validTprResults = player.results.filter(r => r.tpr)
  const averageTpr =
    validTprResults.length > 0 ? Math.round(validTprResults.reduce((acc, r) => acc + r.tpr!, 0) / validTprResults.length) : 0

  return (
    <div className="container mx-auto px-4 py-6 space-y-8 max-w-4xl">
      {/* Player Header */}
      <Card className="shadow-sm rounded-md overflow-hidden py-0 gap-0">
        <div className="px-4 py-2 border-b">
          <div className="flex flex-col space-y-2">
            <h1 className="text-2xl font-semibold">{player.name}</h1>
            
            {player.fide_id && (
              <div className="flex items-center gap-2">
                <a
                  href={`https://ratings.fide.com/profile/${player.fide_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm flex items-center gap-1.5">
                  FIDE ID: {player.fide_id}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Stats Section */}
        <div className="p-4 grid grid-cols-3 gap-6 bg-gray-50">
          <div className="flex flex-col items-center">
            <CalendarDays className="h-5 w-5 text-gray-500 mb-1" />
            <span className="text-xs text-muted-foreground">Tournaments</span>
            <p className="text-gray-700 text-lg">{totalTournaments}</p>
          </div>

          <div className="flex flex-col items-center">
            <Star className="h-5 w-5 text-amber-500 mb-1" />
            <span className="text-xs text-muted-foreground">Best TPR</span>
            <p className="text-gray-700 text-lg flex items-center gap-1">
              {bestTpr}
              {bestTpr >= 2000 && <Trophy className="h-4 w-4 text-amber-500" />}
            </p>
          </div>

          <div className="flex flex-col items-center">
            <TrendingUp className="h-5 w-5 text-gray-500 mb-1" />
            <span className="text-xs text-muted-foreground">Avg. TPR</span>
            <p className="text-gray-700 text-lg">{averageTpr || '-'}</p>
          </div>
        </div>
      </Card>

      {/* Tournament History */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Tournament History</h2>

        {/* Mobile View */}
        <div className="block sm:hidden space-y-3">
          {player.results.map((result: PlayerResult) => (
            <Card key={result.tournament_id} className="overflow-hidden py-0 gap-4 rounded-md">
              <div className="p-4 border-b">
                <div className="flex flex-col">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {result.start_rank ? (
                        <a 
                          href={result.player_card_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="font-medium text-blue-600 hover:underline flex items-center"
                          title="View player card on chess-results.com"
                        >
                          {getShortTournamentName(result.tournament_name)}
                          <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                        </a>
                      ) : (
                        <Link href={`/tournament/${result.tournament_id}`} className="font-medium text-blue-600 hover:underline">
                          {getShortTournamentName(result.tournament_name)}
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 grid grid-cols-2 gap-y-4">
                <div className="flex items-center">
                  <div className="bg-blue-50 rounded-full p-2 mr-3">
                    <Hash className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Starting Rank</p>
                    <p className="font-medium text-lg">{result.start_rank ?? '-'}</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <div className="bg-purple-50 rounded-full p-2 mr-3">
                    <TrendingUp className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Rating</p>
                    <p className="font-medium text-lg">{result.rating_in_tournament}</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <div className="bg-green-50 rounded-full p-2 mr-3">
                    <Trophy className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Points</p>
                    <p className="font-medium text-lg">{result.points.toFixed(1)}/{result.rounds}</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <div className="bg-amber-50 rounded-full p-2 mr-3">
                    <Star className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">TPR</p>
                    <p className="font-medium text-lg">{result.tpr ?? '-'}</p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Desktop View */}
        <Card className="hidden sm:block rounded-md py-0 overflow-hidden">
          <ScrollArea className="max-h-[600px]">
            <CustomTable className="w-full">
              <CustomTableHeader>
                <CustomTableRow className="bg-gray-50 border-b">
                  <CustomTableHead className="w-[52%] py-3 px-5 text-sm font-medium">Tournament</CustomTableHead>
                  <CustomTableHead className="text-right w-[12%] py-3 px-5 text-sm font-medium">Starting Rank</CustomTableHead>
                  <CustomTableHead className="text-right w-[12%] py-3 px-5 text-sm font-medium">Rating</CustomTableHead>
                  <CustomTableHead className="text-right w-[12%] py-3 px-5 text-sm font-medium">Points</CustomTableHead>
                  <CustomTableHead className="text-right w-[12%] py-3 px-5 text-sm font-medium">TPR</CustomTableHead>
                </CustomTableRow>
              </CustomTableHeader>
              <CustomTableBody>
                {player.results.map((result: PlayerResult) => (
                  <CustomTableRow
                    key={result.tournament_id}
                    className="hover:bg-gray-50 transition-colors border-b last:border-0">
                    <CustomTableCell className="py-3 px-5">
                      <div className="flex items-center">
                        {result.start_rank ? (
                          <a 
                            href={result.player_card_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="font-medium text-blue-600 hover:underline flex items-center"
                            title="View player card on chess-results.com"
                          >
                            {result.tournament_name}
                            <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                          </a>
                        ) : (
                          <Link href={`/tournament/${result.tournament_id}`} className="font-medium text-blue-600 hover:underline">
                            {result.tournament_name}
                          </Link>
                        )}
                      </div>
                    </CustomTableCell>
                    <CustomTableCell className="text-right py-3 px-5 font-medium">{result.start_rank ?? '-'}</CustomTableCell>
                    <CustomTableCell className="text-right py-3 px-5 font-medium">{result.rating_in_tournament}</CustomTableCell>
                    <CustomTableCell className="text-right py-3 px-5 font-medium">{result.points.toFixed(1)}/{result.rounds}</CustomTableCell>
                    <CustomTableCell className="text-right py-3 px-5 font-medium">{result.tpr ?? '-'}</CustomTableCell>
                  </CustomTableRow>
                ))}
              </CustomTableBody>
            </CustomTable>
          </ScrollArea>
        </Card>
      </div>
    </div>
  )
}
