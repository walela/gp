import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getPlayer } from "@/services/api"
import { notFound } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChevronRight, Trophy } from "lucide-react"

interface PlayerPageProps {
  params: {
    id: string
  }
}

export default async function PlayerPage({ params }: PlayerPageProps) {
  const player = await getPlayer(params.id)

  if (!player) {
    notFound()
  }

  // Calculate performance metrics
  const totalTournaments = player.results.length
  const bestTpr = Math.max(...player.results.map(r => r.tpr || 0))
  const validTprResults = player.results.filter(r => r.tpr)
  const averageTpr = validTprResults.length > 0
    ? Math.round(validTprResults.reduce((acc, r) => acc + r.tpr!, 0) / validTprResults.length)
    : 0

  return (
    <div className="space-y-4 pb-8">
      {/* Player Header */}
      <Card className="rounded-none border-x-0 bg-gradient-to-br from-muted/50 to-background">
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
          {player.results.map((result) => (
            <Card key={result.tournament_id} className="rounded-none border-x-0">
              <Link 
                href={`/tournament/${result.tournament_id}`}
                className="block p-3 space-y-2 hover:bg-muted/50 transition-colors"
              >
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
        <Card className="hidden sm:block rounded-none border-x-0">
          <ScrollArea>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50%]">Tournament</TableHead>
                  <TableHead className="text-right w-[16%]">Rating</TableHead>
                  <TableHead className="text-right w-[16%]">Points</TableHead>
                  <TableHead className="text-right w-[16%]">TPR</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {player.results.map((result) => (
                  <TableRow key={result.tournament_id} className="even:bg-muted/30">
                    <TableCell>
                      <Link 
                        href={`/tournament/${result.tournament_id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {result.tournament_name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{result.rating}</TableCell>
                    <TableCell className="text-right tabular-nums">{result.points}</TableCell>
                    <TableCell className="text-right tabular-nums">{result.tpr || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      </div>
    </div>
  )
}
