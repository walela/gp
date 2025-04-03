import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { SortableHeader } from "@/components/rankings/sortable-header"
import { Button } from "@/components/ui/button"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { getRankings } from "@/services/api"
import { cn } from "@/lib/utils"

interface RankingsPageProps {
  searchParams: {
    sort?: string
    dir?: 'asc' | 'desc'
    page?: string
  }
}

export default async function RankingsPage({ searchParams }: RankingsPageProps) {
  const sort = searchParams.sort || 'best_2'
  const dir = (searchParams.dir || 'desc') as 'asc' | 'desc'
  const page = Number(searchParams.page || '1')
  const { rankings, total_pages } = await getRankings({ sort, dir, page })

  // Get top 9 by best_2 for highlighting
  const top9ByBest2 = new Set(
    [...rankings]
      .sort((a, b) => b.best_2 - a.best_2)
      .slice(0, 9)
      .map(p => p.fide_id || p.name)
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Grand Prix Rankings</h1>
        <p className="text-muted-foreground">
          Current standings based on best tournament performances. Top 9 players by Best 2 Average are highlighted.
        </p>
      </div>

      <Card className="rounded-none overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[4rem] text-right pr-8">Rank</TableHead>
              <SortableHeader column="name" label="Name" />
              <SortableHeader column="rating" label="Rating" align="right" />
              <SortableHeader column="tournaments_played" label="Tournaments" align="right" />
              <SortableHeader column="best_1" label="Best TPR" align="right" />
              <SortableHeader column="best_2" label="Best 2 Avg" align="right" />
              <SortableHeader column="best_3" label="Best 3 Avg" align="right" />
              <SortableHeader column="best_4" label="Best 4 Avg" align="right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rankings.map((player, index) => (
              <TableRow 
                key={player.fide_id || player.name} 
                className={cn(
                  "even:bg-muted/30",
                  top9ByBest2.has(player.fide_id || player.name) && "bg-green-50 even:bg-green-50/70 hover:bg-green-100"
                )}
              >
                <TableCell className="text-right pr-8 font-medium">{(page - 1) * 25 + index + 1}</TableCell>
                <TableCell>
                  <Link href={`/player/${player.fide_id}`} className="font-medium text-blue-600 hover:underline">
                    {player.name}
                  </Link>
                </TableCell>
                <TableCell className="text-right tabular-nums">{player.rating || 'Unrated'}</TableCell>
                <TableCell className="text-right tabular-nums">{player.tournaments_played}</TableCell>
                <TableCell className="text-right tabular-nums">
                  <div>{player.best_1}</div>
                  {player.tournament_1 && (
                    <div className="text-sm text-muted-foreground">
                      {player.tournament_1}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">{player.best_2}</TableCell>
                <TableCell className="text-right tabular-nums">{player.best_3}</TableCell>
                <TableCell className="text-right tabular-nums">{Math.round(player.best_4)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {total_pages > 1 && (
        <div className="flex justify-center gap-1">
          <Button
            variant="outline"
            size="sm"
            asChild
            disabled={page === 1}
          >
            <Link
              href={{
                pathname: "/rankings",
                query: {
                  ...searchParams,
                  page: page - 1
                }
              }}
            >
              <ChevronLeftIcon className="h-4 w-4" />
              Previous
            </Link>
          </Button>

          {Array.from({ length: total_pages }, (_, i) => i + 1).map((p) => (
            <Button
              key={p}
              variant={p === page ? "default" : "outline"}
              size="sm"
              asChild
            >
              <Link
                href={{
                  pathname: "/rankings",
                  query: {
                    ...searchParams,
                    page: p
                  }
                }}
              >
                {p}
              </Link>
            </Button>
          ))}

          <Button
            variant="outline"
            size="sm"
            asChild
            disabled={page === total_pages}
          >
            <Link
              href={{
                pathname: "/rankings",
                query: {
                  ...searchParams,
                  page: page + 1
                }
              }}
            >
              Next
              <ChevronRightIcon className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}
