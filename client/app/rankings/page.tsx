import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { SortableHeader } from "@/components/rankings/sortable-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronLeftIcon, ChevronRightIcon, SearchIcon } from "lucide-react"
import { getRankings } from "@/services/api"

interface RankingsPageProps {
  searchParams: {
    sort?: string
    dir?: 'asc' | 'desc'
    page?: string
    q?: string
  }
}

export default async function RankingsPage({ searchParams }: RankingsPageProps) {
  const sort = searchParams.sort || 'best_2'
  const dir = (searchParams.dir || 'desc') as 'asc' | 'desc'
  const page = Number(searchParams.page || '1')
  const search = searchParams.q || ''
  const { rankings, total_pages } = await getRankings({ sort, dir, page })

  // Get top 9 by best_2 for highlighting
  const top9ByBest2 = new Set(
    [...rankings]
      .sort((a, b) => b.best_2 - a.best_2)
      .slice(0, 9)
      .map(p => p.fide_id || p.name)
  )

  // Filter rankings by search
  const filteredRankings = search
    ? rankings.filter(p => 
        p.name.toLowerCase().includes(search.toLowerCase())
      )
    : rankings

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Grand Prix Rankings</h1>
        <p className="text-muted-foreground">
          Current standings based on best tournament performances. Top 9 players by Best 2 Average are highlighted.
        </p>
      </div>

      <div className="flex justify-end mb-4">
        <div className="relative w-full sm:w-[300px]">
          <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <form>
            <Input
              type="search"
              name="q"
              placeholder="Search players..."
              defaultValue={search}
              className="pl-9"
            />
          </form>
        </div>
      </div>

      <Card className="rounded-none">
        <div className="w-full">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader column="rank" label="Rank" basePath="/rankings" className="w-[3rem] text-right pr-4 lg:pr-8" />
                <SortableHeader column="name" label="Name" basePath="/rankings" className="w-[120px] sm:w-[160px] lg:w-[200px]" />
                <SortableHeader column="rating" label="Rating" align="right" basePath="/rankings" className="hidden lg:table-cell" />
                <SortableHeader column="tournaments_played" label="Tournaments" align="right" basePath="/rankings" className="hidden sm:table-cell" />
                <SortableHeader column="best_1" label="Best TPR" align="right" basePath="/rankings" className="hidden sm:table-cell" />
                <SortableHeader column="best_2" label="Best 2" align="right" basePath="/rankings" className="w-[4rem]" />
                <SortableHeader column="best_3" label="Best 3" align="right" basePath="/rankings" className="hidden lg:table-cell" />
                <SortableHeader column="best_4" label="Best 4" align="right" basePath="/rankings" className="hidden lg:table-cell" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRankings.map((player, index) => (
                <TableRow 
                  key={player.fide_id || player.name} 
                  className={top9ByBest2.has(player.fide_id || player.name) ? "bg-green-50 even:bg-green-50/70 hover:bg-green-100" : "even:bg-muted/30"}
                >
                  <TableCell className="text-right pr-4 lg:pr-8 font-medium">{(page - 1) * 25 + index + 1}</TableCell>
                  <TableCell className="w-[120px] sm:w-[160px] lg:w-[200px] truncate">
                    <Link 
                      href={`/player/${player.fide_id}`}
                      className="font-medium text-blue-600 hover:underline"
                      title={player.name}
                    >
                      {player.name}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-right tabular-nums">{player.rating || 'Unrated'}</TableCell>
                  <TableCell className="hidden sm:table-cell text-right tabular-nums">{player.tournaments_played}</TableCell>
                  <TableCell className="hidden sm:table-cell text-right">
                    <div className="tabular-nums">{player.best_1}</div>
                    {player.tournament_1 && (
                      <div className="text-sm text-muted-foreground truncate max-w-[180px] ml-auto">
                        {player.tournament_1}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums w-[4rem]">{player.best_2}</TableCell>
                  <TableCell className="hidden lg:table-cell text-right tabular-nums">{player.best_3}</TableCell>
                  <TableCell className="hidden lg:table-cell text-right tabular-nums">{Math.round(player.best_4)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {total_pages > 1 && (
        <div className="flex flex-wrap justify-center gap-1">
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
              <ChevronLeftIcon className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Previous</span>
            </Link>
          </Button>

          <div className="hidden sm:flex gap-1">
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
          </div>

          <div className="sm:hidden">
            <span className="mx-2 text-sm text-muted-foreground">
              Page {page} of {total_pages}
            </span>
          </div>

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
              <span className="hidden sm:inline">Next</span>
              <ChevronRightIcon className="h-4 w-4 sm:ml-1" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}
