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
import { Input } from '@/components/ui/input'
import { SearchIcon } from 'lucide-react'
import { getRankings, getTopPlayers } from '@/services/api'
import { cn } from '@/lib/utils'
import { ViewSelector } from '@/components/rankings/view-selector'
import { Pagination } from '@/components/ui/pagination'
import { getShortTournamentName } from '@/utils/tournament'
import { ExportButton } from '@/components/ui/export-button'

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
  const params = await searchParams

  // Now we can safely access the properties
  const sort = params.sort || 'best_4'
  const dir = (params.dir || 'desc') as 'asc' | 'desc'
  const page = Number(params.page || '1')
  const view = params.view || 'best_4'
  const search = params.q || ''

  // Pass search query to the backend for filtering
  const { rankings, total_pages } = await getRankings({
    sort,
    dir,
    page,
    q: search
  })

  // Get top 9 by best_4 from all data, not just the current page
  const { topPlayers } = await getTopPlayers({ count: 9, sortBy: 'best_4' })
  const top9ByBest4 = new Set(topPlayers.map(p => p.fide_id || p.name))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Grand Prix Rankings</h1>
          <p className="text-muted-foreground">
            Current standings based on best tournament performances. Top 9 players by Best 4 Average are highlighted.
          </p>
        </div>
        <ExportButton 
          url={`${process.env.NEXT_PUBLIC_API_URL || 'https://gp-backend-viuj.onrender.com/api'}/rankings/export`}
          filename="GP_rankings.csv"
        />
      </div>

      <div className="flex flex-col gap-4 mb-6">
        <div className="relative w-full sm:w-[300px]">
          <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <form>
            <Input type="search" name="q" placeholder="Search players..." defaultValue={search} className="pl-9" />
          </form>
        </div>
      </div>

      <div className="mb-0">
        <ViewSelector view={view} />
      </div>

      <Card
        className={cn(
          'rounded-bl-lg rounded-br-lg rounded-tr-lg border-0 shadow-sm overflow-hidden bg-white/90 backdrop-blur-sm p-0',
          'rounded-tl-none'
        )}>
        <CustomTable className="h-full">
          <CustomTableHeader>
            <CustomTableRow>
              <CustomTableHead className="w-[30px] sm:w-[40px] text-right">
                <SortableHeader column="rank" label="Rank" basePath="/rankings" className="w-full hidden sm:block" />
                <SortableHeader column="rank" label="#" basePath="/rankings" className="w-full sm:hidden" />
              </CustomTableHead>
              <CustomTableHead className="min-w-[120px]">
                <SortableHeader column="name" label="Name" basePath="/rankings" className="w-full" />
              </CustomTableHead>
              <CustomTableHead className="hidden md:table-cell text-right">
                <SortableHeader column="rating" label="Rating" align="right" basePath="/rankings" className="w-full" />
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
              <CustomTableHead className={cn('text-right', view === 'best_1' ? 'table-cell' : 'hidden md:table-cell')}>
                <SortableHeader column="best_1" label="Best TPR" align="right" basePath="/rankings" className="w-full" />
              </CustomTableHead>
              <CustomTableHead className={cn('text-right', view === 'best_2' ? 'table-cell' : 'hidden md:table-cell')}>
                <SortableHeader column="best_2" label="Best 2" align="right" basePath="/rankings" className="w-full" />
              </CustomTableHead>
              <CustomTableHead className={cn('text-right', view === 'best_3' ? 'table-cell' : 'hidden md:table-cell')}>
                <SortableHeader column="best_3" label="Best 3" align="right" basePath="/rankings" className="w-full" />
              </CustomTableHead>
              <CustomTableHead className={cn('text-right', view === 'best_4' ? 'table-cell' : 'hidden md:table-cell')}>
                <SortableHeader column="best_4" label="Best 4" align="right" basePath="/rankings" className="w-full" />
              </CustomTableHead>
            </CustomTableRow>
          </CustomTableHeader>
          <CustomTableBody>
            {rankings.map((player, index) => (
              <CustomTableRow
                key={player.fide_id || player.name}
                className={cn(
                  top9ByBest4.has(player.fide_id || player.name)
                    ? 'bg-blue-50/50 border-l-2 border-l-blue-500 hover:bg-blue-100/50'
                    : index % 2 === 0
                    ? 'bg-gray-50/50 hover:bg-gray-100/50'
                    : 'bg-white hover:bg-gray-50/50'
                )}>
                <CustomTableCell isHeader className="text-right">
                  {top9ByBest4.has(player.fide_id || player.name) ? (
                    <span className="font-semibold text-blue-700">{(page - 1) * 25 + index + 1}</span>
                  ) : (
                    (page - 1) * 25 + index + 1
                  )}
                </CustomTableCell>
                <CustomTableCell>
                  <div className="truncate">
                    {player.fide_id ? (
                      <Link
                        href={`/player/${player.fide_id}`}
                        className={cn(
                          'font-medium group flex items-center gap-1',
                          top9ByBest4.has(player.fide_id) ? 'text-blue-700 hover:text-blue-800' : 'text-blue-600 hover:text-blue-700'
                        )}
                        title={player.name}>
                        <span className="sm:hidden flex items-center gap-1">
                          {player.name.length > 15 ? player.name.split(' ').slice(0, 2).join(' ') + '...' : player.name}
                          <span className="text-muted-foreground/50">›</span>
                        </span>
                        <span className="hidden sm:block group-hover:underline">{player.name}</span>
                      </Link>
                    ) : (
                      <span
                        className={cn(
                          'font-medium',
                          top9ByBest4.has(player.name) ? 'text-blue-700' : ''
                        )}
                        title={player.name}>
                        {player.name}
                      </span>
                    )}
                  </div>
                </CustomTableCell>
                <CustomTableCell className="hidden md:table-cell text-right tabular-nums">
                  {player.rating || 'Unrated'}
                </CustomTableCell>
                <CustomTableCell className="hidden sm:table-cell text-right tabular-nums">
                  {player.tournaments_played}
                </CustomTableCell>
                <CustomTableCell
                  className={cn('text-right tabular-nums', view === 'best_1' ? 'table-cell' : 'hidden md:table-cell')}>
                  <div className="flex flex-col items-end gap-1">
                    <div className="tabular-nums font-medium">{player.best_1}</div>
                    {player.tournament_1 && (
                      <div className="hidden sm:block text-xs text-muted-foreground truncate max-w-[140px]">
                        {getShortTournamentName(player.tournament_1)}
                      </div>
                    )}
                  </div>
                </CustomTableCell>
                <CustomTableCell
                  className={cn('text-right tabular-nums', view === 'best_2' ? 'table-cell' : 'hidden md:table-cell')}>
                  {player.best_2}
                </CustomTableCell>
                <CustomTableCell
                  className={cn('text-right tabular-nums', view === 'best_3' ? 'table-cell' : 'hidden md:table-cell')}>
                  {player.best_3}
                </CustomTableCell>
                <CustomTableCell
                  className={cn('text-right tabular-nums', view === 'best_4' ? 'table-cell' : 'hidden md:table-cell')}>
                  {top9ByBest4.has(player.fide_id || player.name) ? (
                    <span className="font-semibold text-blue-700">{player.best_4}</span>
                  ) : (
                    player.best_4
                  )}
                </CustomTableCell>
              </CustomTableRow>
            ))}
          </CustomTableBody>
        </CustomTable>
      </Card>

      {total_pages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={total_pages}
          basePath="/rankings"
          queryParams={{
            sort,
            dir,
            view,
            ...(search ? { q: search } : {})
          }}
          className="mt-4"
        />
      )}
    </div>
  )
}
