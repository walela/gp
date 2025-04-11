import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { 
  CustomTable, 
  CustomTableHeader, 
  CustomTableBody, 
  CustomTableRow, 
  CustomTableHead, 
  CustomTableCell 
} from '@/components/ui/custom-table'
import { SortableHeader } from '@/components/rankings/sortable-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronLeftIcon, ChevronRightIcon, SearchIcon } from 'lucide-react'
import { getRankings } from '@/services/api'
import { cn } from '@/lib/utils'
import { ViewSelector } from '@/components/rankings/view-selector'

interface RankingsPageProps {
  searchParams: {
    sort?: string
    dir?: 'asc' | 'desc'
    page?: string
    view?: string
    q?: string
  }
}

export default async function RankingsPage({ searchParams }: RankingsPageProps) {
  // Properly await the searchParams object
  const params = await searchParams;
  
  // Now we can safely access the properties
  const sort = params.sort || 'best_2'
  const dir = (params.dir || 'desc') as 'asc' | 'desc'
  const page = Number(params.page || '1')
  const view = params.view || 'best_2'
  const search = params.q || ''

  // Pass search query to the backend for filtering
  const { rankings, total_pages } = await getRankings({ 
    sort, 
    dir, 
    page, 
    q: search 
  })

  // Get top 9 by best_2 for highlighting (using the potentially filtered rankings)
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

      <div className="flex flex-col gap-4">
        <div className="relative w-full sm:w-[300px]">
          <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <form>
            <Input type="search" name="q" placeholder="Search players..." defaultValue={search} className="pl-9" />
          </form>
        </div>

        <ViewSelector view={view} />
      </div>

      <Card className="rounded-lg border-0 shadow-sm overflow-hidden bg-white/90 backdrop-blur-sm p-0">
        <CustomTable className="h-full">
          <CustomTableHeader>
            <CustomTableRow>
              <CustomTableHead className="w-[40px] text-right">
                <SortableHeader column="rank" label="Rank" basePath="/rankings" className="w-full" />
              </CustomTableHead>
              <CustomTableHead className="min-w-[120px]">
                <SortableHeader column="name" label="Name" basePath="/rankings" className="w-full" />
              </CustomTableHead>
              <CustomTableHead className="hidden md:table-cell text-right">
                <SortableHeader
                  column="rating"
                  label="Rating"
                  align="right"
                  basePath="/rankings"
                  className="w-full"
                />
              </CustomTableHead>
              <CustomTableHead className="hidden sm:table-cell text-right">
                <SortableHeader
                  column="tournaments_played"
                  label="Tournaments"
                  align="right"
                  basePath="/rankings"
                  className="w-full"
                />
              </CustomTableHead>
              <CustomTableHead
                className={cn('text-right', view === 'best_1' ? 'table-cell' : 'hidden md:table-cell')}>
                <SortableHeader
                  column="best_1"
                  label="Best TPR"
                  align="right"
                  basePath="/rankings"
                  className="w-full"
                />
              </CustomTableHead>
              <CustomTableHead
                className={cn('text-right', view === 'best_2' ? 'table-cell' : 'hidden md:table-cell')}>
                <SortableHeader
                  column="best_2"
                  label="Best 2"
                  align="right"
                  basePath="/rankings"
                  className="w-full"
                />
              </CustomTableHead>
              <CustomTableHead
                className={cn('text-right', view === 'best_3' ? 'table-cell' : 'hidden md:table-cell')}>
                <SortableHeader
                  column="best_3"
                  label="Best 3"
                  align="right"
                  basePath="/rankings"
                  className="w-full"
                />
              </CustomTableHead>
              <CustomTableHead
                className={cn('text-right', view === 'best_4' ? 'table-cell' : 'hidden md:table-cell')}>
                <SortableHeader
                  column="best_4"
                  label="Best 4"
                  align="right"
                  basePath="/rankings"
                  className="w-full"
                />
              </CustomTableHead>
            </CustomTableRow>
          </CustomTableHeader>
          <CustomTableBody>
            {rankings.map((player, index) => (
              <CustomTableRow
                key={player.fide_id || player.name}
                className={cn(
                  top9ByBest2.has(player.fide_id || player.name) 
                    ? 'bg-blue-50/80 dark:bg-blue-900/20 border-l-4 border-l-blue-500 dark:border-l-blue-400' 
                    : ''
                )}
              >
                <CustomTableCell isHeader className="text-right">
                  {top9ByBest2.has(player.fide_id || player.name) ? (
                    <div className="flex items-center justify-end gap-1">
                      <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-semibold text-blue-800 bg-blue-100 rounded-full dark:bg-blue-900 dark:text-blue-200">
                        {(page - 1) * 25 + index + 1}
                      </span>
                    </div>
                  ) : (
                    (page - 1) * 25 + index + 1
                  )}
                </CustomTableCell>
                <CustomTableCell className="min-w-[120px]">
                  <div className="truncate">
                    <Link
                      href={`/player/${player.fide_id || player.name}`}
                      className={cn(
                        "font-medium group flex items-center gap-1",
                        top9ByBest2.has(player.fide_id || player.name)
                          ? "text-blue-700 dark:text-blue-400"
                          : "text-blue-600"
                      )}
                      title={player.name}>
                      {top9ByBest2.has(player.fide_id || player.name) && (
                        <span className="text-blue-500 dark:text-blue-400 mr-0.5">•</span>
                      )}
                      <span className="sm:hidden flex items-center gap-1">
                        {player.name.length > 15 ? player.name.split(' ').slice(0, 2).join(' ') + '...' : player.name}
                        <span className="text-muted-foreground/50">›</span>
                      </span>
                      <span className="hidden sm:inline group-hover:underline">{player.name}</span>
                    </Link>
                  </div>
                </CustomTableCell>
                <CustomTableCell className="hidden md:table-cell text-right tabular-nums">{player.rating || 'Unrated'}</CustomTableCell>
                <CustomTableCell className="hidden sm:table-cell text-right tabular-nums">{player.tournaments_played}</CustomTableCell>
                <CustomTableCell className={cn('text-right', view === 'best_1' ? 'table-cell' : 'hidden md:table-cell')}>
                  <div className="flex flex-col items-end gap-1">
                    <div className="tabular-nums font-medium">{player.best_1}</div>
                    {player.tournament_1 && (
                      <div className="hidden sm:block text-xs text-muted-foreground truncate max-w-[140px]">
                        {player.tournament_1}
                      </div>
                    )}
                  </div>
                </CustomTableCell>
                <CustomTableCell
                  className={cn('text-right tabular-nums', view === 'best_2' ? 'table-cell' : 'hidden md:table-cell')}>
                  {top9ByBest2.has(player.fide_id || player.name) ? (
                    <span className="font-semibold text-blue-700 dark:text-blue-400">{player.best_2}</span>
                  ) : (
                    player.best_2
                  )}
                </CustomTableCell>
                <CustomTableCell
                  className={cn('text-right tabular-nums', view === 'best_3' ? 'table-cell' : 'hidden md:table-cell')}>
                  {player.best_3}
                </CustomTableCell>
                <CustomTableCell
                  className={cn('text-right tabular-nums', view === 'best_4' ? 'table-cell' : 'hidden md:table-cell')}>
                  {Math.round(player.best_4)}
                </CustomTableCell>
              </CustomTableRow>
            ))}
          </CustomTableBody>
        </CustomTable>
      </Card>

      {total_pages > 1 && (
        <div className="flex flex-wrap justify-center gap-1">
          <Button variant="outline" size="sm" asChild disabled={page === 1}>
            <Link
              href={`/rankings?sort=${sort}&dir=${dir}&view=${view}&page=${page - 1}${search ? `&q=${encodeURIComponent(search)}` : ''}`}>
              <ChevronLeftIcon className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Previous</span>
            </Link>
          </Button>

          <div className="hidden sm:flex gap-1">
            {Array.from({ length: total_pages }, (_, i) => i + 1).map(p => (
              <Button key={p} variant={p === page ? 'default' : 'outline'} size="sm" asChild>
                <Link
                  href={`/rankings?sort=${sort}&dir=${dir}&view=${view}&page=${p}${search ? `&q=${encodeURIComponent(search)}` : ''}`}>
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

          <Button variant="outline" size="sm" asChild disabled={page === total_pages}>
            <Link
              href={`/rankings?sort=${sort}&dir=${dir}&view=${view}&page=${page + 1}${search ? `&q=${encodeURIComponent(search)}` : ''}`}>
              <span className="hidden sm:inline">Next</span>
              <ChevronRightIcon className="h-4 w-4 sm:ml-1" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}
