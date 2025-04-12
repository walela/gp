'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { getPlayer, PlayerDetails } from '@/services/api'
import { useParams } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChevronRight, Trophy } from 'lucide-react'
import { 
  CustomTable, 
  CustomTableHeader, 
  CustomTableBody, 
  CustomTableRow, 
  CustomTableHead, 
  CustomTableCell 
} from '@/components/ui/custom-table'
import { Skeleton } from '@/components/ui/skeleton'

export default function PlayerPage() {
  const params = useParams()
  const id = params.id as string
  const [player, setPlayer] = useState<PlayerDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchPlayer = async () => {
      try {
        setLoading(true)
        const playerData = await getPlayer(id)
        
        if (!playerData) {
          throw new Error('Player not found')
        }
        
        setPlayer(playerData)
      } catch (err) {
        console.error('Error fetching player:', err)
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchPlayer()
  }, [id])

  if (loading) {
    return <PlayerSkeleton />
  }

  if (error || !player) {
    return (
      <div className="p-4 text-center">
        <h2 className="text-xl font-bold mb-2">Error Loading Player</h2>
        <p className="text-muted-foreground mb-4">
          {error?.message || 'Player not found'}
        </p>
        <Link href="/" className="text-blue-600 hover:underline">
          Return to home
        </Link>
      </div>
    )
  }

  // Calculate performance metrics
  const totalTournaments = player.results.length
  const bestTpr = Math.max(...player.results.map(r => r.tpr || 0))
  const validTprResults = player.results.filter(r => r.tpr)
  const averageTpr =
    validTprResults.length > 0 ? Math.round(validTprResults.reduce((acc, r) => acc + r.tpr!, 0) / validTprResults.length) : 0

  return (
    <div className="space-y-4 pb-8">
      {/* Player Header */}
      <Card className="rounded-none border-x-0 p-0 bg-gradient-to-br from-muted/50 to-background">
        <div className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Player Info */}
            <div className="space-y-1.5 flex-1">
              <h1 className="text-2xl font-bold tracking-tight">{player.name}</h1>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs">
                  FIDE ID: {player.fide_id}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Rating: {player.rating || 'Unrated'}
                </Badge>
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-8 text-sm">
              <div className="min-w-[80px]">
                <p className="text-muted-foreground">Tournaments</p>
                <p className="font-medium tabular-nums">{totalTournaments}</p>
              </div>
              <div className="min-w-[80px]">
                <p className="text-muted-foreground">Best TPR</p>
                <p className="font-medium tabular-nums flex items-center gap-1">
                  {bestTpr}
                  {bestTpr >= 2000 && <Trophy className="h-3 w-3 text-yellow-500" />}
                </p>
              </div>
              <div className="min-w-[80px]">
                <p className="text-muted-foreground">Avg. TPR</p>
                <p className="font-medium tabular-nums">{averageTpr || '-'}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Tournament History */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Tournament History</h2>

        {/* Mobile View */}
        <div className="block sm:hidden space-y-2">
          {player.results.map(result => (
            <Card key={result.tournament_id} className="rounded-none border-x-0">
              <Link
                href={`/tournament/${result.tournament_id}`}
                className="block p-3 space-y-2 hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-blue-600">{result.tournament_name}</h3>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Rating</p>
                    <p className="font-medium tabular-nums">{result.rating}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Points</p>
                    <p className="font-medium tabular-nums">{result.points}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">TPR</p>
                    <p className="font-medium tabular-nums">{result.tpr || '-'}</p>
                  </div>
                </div>
              </Link>
            </Card>
          ))}
        </div>

        {/* Desktop View */}
        <Card className="hidden sm:block rounded-lg overflow-hidden p-0">
          <ScrollArea className="max-h-[500px]">
            <CustomTable className="border-collapse">
              <CustomTableHeader>
                <CustomTableRow className="bg-muted/50">
                  <CustomTableHead className="w-[50%] py-3">Tournament</CustomTableHead>
                  <CustomTableHead className="text-right w-[16%] py-3">Rating</CustomTableHead>
                  <CustomTableHead className="text-right w-[16%] py-3">Points</CustomTableHead>
                  <CustomTableHead className="text-right w-[16%] py-3">TPR</CustomTableHead>
                </CustomTableRow>
              </CustomTableHeader>
              <CustomTableBody>
                {player.results.map(result => (
                  <CustomTableRow key={result.tournament_id}>
                    <CustomTableCell className="py-2">
                      <Link href={`/tournament/${result.tournament_id}`} className="font-medium text-blue-600 hover:underline">
                        {result.tournament_name}
                      </Link>
                    </CustomTableCell>
                    <CustomTableCell className="text-right tabular-nums py-2">{result.rating}</CustomTableCell>
                    <CustomTableCell className="text-right tabular-nums py-2">{result.points}</CustomTableCell>
                    <CustomTableCell className="text-right tabular-nums py-2">{result.tpr || '-'}</CustomTableCell>
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

function PlayerSkeleton() {
  return (
    <div className="space-y-4 pb-8">
      {/* Player Header */}
      <Card className="rounded-none border-x-0 p-0 bg-gradient-to-br from-muted/50 to-background">
        <div className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Player Info */}
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-6 w-48" />
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-8 text-sm">
              <div className="min-w-[80px]">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-6 w-12" />
              </div>
              <div className="min-w-[80px]">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-6 w-12" />
              </div>
              <div className="min-w-[80px]">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-6 w-12" />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Tournament History */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Tournament History</h2>

        {/* Mobile View */}
        <div className="block sm:hidden space-y-2">
          {[1, 2, 3].map(() => (
            <Card key={Math.random()} className="rounded-none border-x-0">
              <div className="block p-3 space-y-2 hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-48" />
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-6 w-12" />
                  </div>
                  <div>
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-6 w-12" />
                  </div>
                  <div>
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-6 w-12" />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Desktop View */}
        <Card className="hidden sm:block rounded-lg overflow-hidden">
          <ScrollArea className="max-h-[500px]">
            <CustomTable className="border-collapse">
              <CustomTableHeader>
                <CustomTableRow className="bg-muted/50">
                  <CustomTableHead className="w-[50%] py-3">Tournament</CustomTableHead>
                  <CustomTableHead className="text-right w-[16%] py-3">Rating</CustomTableHead>
                  <CustomTableHead className="text-right w-[16%] py-3">Points</CustomTableHead>
                  <CustomTableHead className="text-right w-[16%] py-3">TPR</CustomTableHead>
                </CustomTableRow>
              </CustomTableHeader>
              <CustomTableBody>
                {[1, 2, 3].map(() => (
                  <CustomTableRow key={Math.random()}>
                    <CustomTableCell className="py-2">
                      <Skeleton className="h-6 w-48" />
                    </CustomTableCell>
                    <CustomTableCell className="text-right tabular-nums py-2">
                      <Skeleton className="h-6 w-12" />
                    </CustomTableCell>
                    <CustomTableCell className="text-right tabular-nums py-2">
                      <Skeleton className="h-6 w-12" />
                    </CustomTableCell>
                    <CustomTableCell className="text-right tabular-nums py-2">
                      <Skeleton className="h-6 w-12" />
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
