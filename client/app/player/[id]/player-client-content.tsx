'use client'

import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { PlayerDetails, PlayerResult } from '@/services/api'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChevronRight, Trophy, CalendarDays, TrendingUp, Star, ExternalLink } from 'lucide-react'
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
    <div className="container mx-auto px-4 py-8 space-y-8 max-w-5xl">
      {/* Player Header */}
      <Card className="shadow-sm rounded-md py-0">
        <div className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Player Info */}
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-bold">{player.name}</h1>
              </div>
              {player.fide_id && (
                <div className="flex items-center gap-2">
                  <a 
                    href={`https://ratings.fide.com/profile/${player.fide_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm flex items-center gap-1.5"
                  >
                    FIDE ID: {player.fide_id}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="flex gap-8 pt-3 sm:pt-0 border-t sm:border-t-0 sm:border-l sm:pl-6 mt-3 sm:mt-0">
              <div>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <CalendarDays className="h-4 w-4" />
                  <span>Tournaments</span>
                </div>
                <p className="font-semibold text-xl mt-1">{totalTournaments}</p>
              </div>
              
              <div>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Star className="h-4 w-4" />
                  <span>Best TPR</span>
                </div>
                <p className="font-semibold text-xl mt-1 flex items-center gap-1">
                  {bestTpr}
                  {bestTpr >= 2000 && <Trophy className="h-4 w-4 text-amber-500" />}
                </p>
              </div>
              
              <div>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  <span>Avg. TPR</span>
                </div>
                <p className="font-semibold text-xl mt-1">{averageTpr || '-'}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Tournament History */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Tournament History</h2>

        {/* Mobile View */}
        <div className="block sm:hidden space-y-2">
          {player.results.map((result: PlayerResult) => (
            <Card key={result.tournament_id} className="overflow-hidden rounded-md">
              <Link
                href={`/tournament/${result.tournament_id}`}
                className="block hover:bg-muted/30 transition-colors">
                <div className="p-3 border-b">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-blue-600">
                      {result.tournament_name}
                    </h3>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                
                <div className="p-3 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Points</p>
                    <p className="font-medium text-base">{result.points.toFixed(1)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">TPR</p>
                    <p className="font-medium text-base">{result.tpr ?? '-'}</p>
                  </div>
                </div>
              </Link>
            </Card>
          ))}
        </div>

        {/* Desktop View */}
        <Card className="hidden py-2 sm:block rounded-md overflow-hidden">
          <ScrollArea className="max-h-[600px]">
            <CustomTable className="w-full">
              <CustomTableHeader>
                <CustomTableRow className="bg-muted/30 border-b">
                  <CustomTableHead className="w-[60%] py-2 px-4">Tournament</CustomTableHead>
                  <CustomTableHead className="text-right w-[20%] py-2 px-4">Points</CustomTableHead>
                  <CustomTableHead className="text-right w-[20%] py-2 px-4">TPR</CustomTableHead>
                </CustomTableRow>
              </CustomTableHeader>
              <CustomTableBody>
                {player.results.map((result: PlayerResult) => (
                  <CustomTableRow 
                    key={result.tournament_id} 
                    className="hover:bg-muted/20 transition-colors border-b last:border-0"
                  >
                    <CustomTableCell className="py-2 px-4">
                      <Link href={`/tournament/${result.tournament_id}`} className="hover:underline text-blue-600 font-medium">
                        {result.tournament_name}
                      </Link>
                    </CustomTableCell>
                    <CustomTableCell className="text-right py-2 px-4 font-medium">
                      {result.points.toFixed(1)}
                    </CustomTableCell>
                    <CustomTableCell className="text-right py-2 px-4 font-medium">
                      {result.tpr ?? '-'}
                    </CustomTableCell>
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
