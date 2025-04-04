import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getPlayer } from "@/services/api"
import { notFound } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChevronRight } from "lucide-react"

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

  return (
    <div className="space-y-6 pb-8">
      {/* Player Header */}
      <Card className="p-6 space-y-4">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{player.name}</h1>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs sm:text-sm">
              FIDE ID: {player.fide_id}
            </Badge>
            <Badge variant="outline" className="text-xs sm:text-sm">
              Rating: {player.rating || 'Unrated'}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Tournament History */}
      <div className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">Tournament History</h2>
        
        {/* Mobile View */}
        <div className="block sm:hidden space-y-4">
          {player.results.map((result) => (
            <Card key={result.tournament_id} className="p-4">
              <Link 
                href={`/tournament/${result.tournament_id}`}
                className="block space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-blue-600">{result.tournament_name}</h3>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Rating</p>
                    <p className="font-medium tabular-nums">{result.rating}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Points</p>
                    <p className="font-medium tabular-nums">{result.points}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">TPR</p>
                    <p className="font-medium tabular-nums">{result.tpr || '-'}</p>
                  </div>
                </div>
              </Link>
            </Card>
          ))}
        </div>

        {/* Desktop View */}
        <Card className="hidden sm:block rounded-none">
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
