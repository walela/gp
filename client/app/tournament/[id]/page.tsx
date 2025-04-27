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
import { getTournament, TournamentResult } from '@/services/api'
import { notFound } from 'next/navigation'
import { Pagination } from '@/components/ui/pagination'
import { CalendarDays, MapPin, Users, Trophy, ExternalLink, Star } from 'lucide-react'

interface TournamentPageProps {
  params: {
    id: string
  }
  searchParams: {
    sort?: string
    dir?: 'asc' | 'desc'
    page?: string
  }
}

// Function to calculate average TPR of top 10 players
function calculateAverageTopTpr(results: TournamentResult[]) {
  // Filter out invalid TPRs
  const validTprResults = results.filter(r => r.tpr !== null);
  
  if (validTprResults.length === 0) {
    return 0;
  }
  
  // Sort by TPR in descending order
  const sortedResults = [...validTprResults].sort((a, b) => (b.tpr || 0) - (a.tpr || 0));
  // Take top 10 or all if less than 10
  const top10 = sortedResults.slice(0, Math.min(10, sortedResults.length));
  // Calculate average
  return Math.round(top10.reduce((sum, r) => sum + (r.tpr || 0), 0) / top10.length);
}

export default async function TournamentPage({ params, searchParams }: TournamentPageProps) {
  // Properly await the params and searchParams objects
  const routeParams = await params;
  const queryParams = await searchParams;
  
  // Now we can safely access the properties
  const id = routeParams.id
  const sort = queryParams.sort || 'points'
  const dir = (queryParams.dir || 'desc') as 'asc' | 'desc'
  const page = Number(queryParams.page || '1')

  // First fetch all results for TPR calculation
  const allResults = await getTournament(id, { 
    sort, 
    dir, 
    all_results: true
  })

  // Then fetch paginated data for display
  const tournament = await getTournament(id, { 
    sort, 
    dir, 
    page
  })

  if (!tournament) {
    notFound()
  }

  // Calculate average TPR of top 10 players using all results
  const averageTopTpr = calculateAverageTopTpr(allResults.results);
  const totalPlayers = allResults.results.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="scroll-m-20 text-2xl md:text-3xl 2xl:text-4xl font-bold tracking-tight">
          {tournament.name}
        </h1>
      </div>

      {/* Tournament Metadata - Optimized for mobile */}
      <div className="md:hidden">
        <Card className="p-4 rounded-lg gap-4 shadow-sm">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="text-sm font-medium">
                  {tournament.name.includes('Eldoret') ? 'January 25-26, 2025' : 
                   tournament.name.includes('Mavens') ? 'Feb 28 - Mar 2, 2025' :
                   tournament.name.includes('Waridi') ? 'March 8-9, 2025' :
                   tournament.name.includes('Kisumu') ? 'March 22-23, 2025' : 
                   'TBD'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-red-600 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Location</p>
                <p className="text-sm font-medium">
                  {tournament.name.includes('Eldoret') ? 'Eldoret, Kenya' : 
                   tournament.name.includes('Kisumu') ? 'Kisumu, Kenya' : 
                   'Nairobi, Kenya'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-600 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Participants</p>
                <p className="text-sm font-medium">{totalPlayers} players</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Avg. Top 10 TPR</p>
                <p className="text-sm font-medium">{averageTopTpr}</p>
              </div>
            </div>
          </div>
          <div className="mt-1">
            <a 
              href={`https://chess-results.com/tnr${id}.aspx?lan=1`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline flex items-center gap-1.5"
            >
              View on chess-results.com
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </Card>
      </div>

      {/* Tournament Metadata - Desktop */}
      <div className="hidden md:block">
        <Card className="p-6 py-4 rounded shadow-sm">
          <div className="flex justify-between items-center">
            <div className="flex gap-8">
              <div className="flex items-center gap-3">
                <div className="bg-blue-50 rounded-full p-2.5">
                  <CalendarDays className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">
                    {tournament.name.includes('Eldoret') ? 'January 25-26, 2025' : 
                     tournament.name.includes('Mavens') ? 'Feb 28 - Mar 2, 2025' :
                     tournament.name.includes('Waridi') ? 'March 8-9, 2025' :
                     tournament.name.includes('Kisumu') ? 'March 22-23, 2025' : 
                     'TBD'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="bg-red-50 rounded-full p-2.5">
                  <MapPin className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium">
                    {tournament.name.includes('Eldoret') ? 'Eldoret, Kenya' : 
                     tournament.name.includes('Kisumu') ? 'Kisumu, Kenya' : 
                     'Nairobi, Kenya'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="bg-purple-50 rounded-full p-2.5">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Participants</p>
                  <p className="font-medium">{totalPlayers} players</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="bg-amber-50 rounded-full p-2.5">
                  <Star className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg. Top 10 TPR</p>
                  <p className="font-medium">{averageTopTpr}</p>
                </div>
              </div>
            </div>
            
            <a 
              href={`https://chess-results.com/tnr${id}.aspx?lan=1`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline flex items-center gap-1.5"
            >
              View on chess-results.com
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </Card>
      </div>

      {/* Results Table */}
      <Card className="rounded-lg shadow-sm overflow-hidden py-0">
        <CustomTable>
          <CustomTableHeader>
            <CustomTableRow className="bg-gray-50">
              <CustomTableHead className="text-right py-2 px-3 sm:py-4 sm:px-6 font-semibold text-gray-700 w-[5%]">#</CustomTableHead>
              <CustomTableHead className="py-2 px-3 sm:py-4 sm:px-6 font-semibold text-gray-700 w-[40%] md:w-[30%]">
                <SortableHeader
                  column="name"
                  label="Player"
                  basePath={`/tournament/${id}`}
                  className="w-full"
                />
              </CustomTableHead>
              <CustomTableHead className="hidden md:table-cell text-right py-2 px-3 sm:py-4 sm:px-6 font-semibold text-gray-700">
                <SortableHeader
                  column="start_rank"
                  label="Start Rank"
                  align="right"
                  basePath={`/tournament/${id}`}
                  className="w-full"
                />
              </CustomTableHead>
              <CustomTableHead className="hidden md:table-cell text-right py-2 px-3 sm:py-4 sm:px-6 font-semibold text-gray-700">
                <SortableHeader
                  column="rating"
                  label="Rating"
                  align="right"
                  basePath={`/tournament/${id}`}
                  className="w-full"
                />
              </CustomTableHead>
              <CustomTableHead className="hidden md:table-cell text-right py-2 px-3 sm:py-4 sm:px-6 font-semibold text-gray-700">
                <SortableHeader
                  column="points"
                  label="Points"
                  align="right"
                  basePath={`/tournament/${id}`}
                  className="w-full"
                />
              </CustomTableHead>
              <CustomTableHead className="text-right py-2 px-3 sm:py-4 sm:px-6 font-semibold text-gray-700">
                <SortableHeader
                  column="tpr"
                  label="TPR"
                  align="right"
                  basePath={`/tournament/${id}`}
                  className="w-full"
                />
              </CustomTableHead>
            </CustomTableRow>
          </CustomTableHeader>
          <CustomTableBody>
            {tournament.results.map((result, index) => (
              <CustomTableRow 
                key={result.player.fide_id || result.player.name}
                className="hover:bg-gray-50 transition-colors"
              >
                <CustomTableCell isHeader className="text-right py-2 px-3 sm:py-4 sm:px-6 font-medium text-gray-700">{(page - 1) * 25 + index + 1}</CustomTableCell>
                <CustomTableCell className="min-w-[120px] py-2 px-3 sm:py-4 sm:px-6">
                  <div className="truncate">
                    {result.player.fide_id ? (
                      <Link
                        href={`/player/${result.player.fide_id}`}
                        className="font-medium text-blue-600 hover:underline"
                        title={result.player.name}>
                        <span className="sm:hidden">
                          {result.player.name.length > 15
                            ? result.player.name.split(' ').slice(0, 2).join(' ') + '...'
                            : result.player.name}
                        </span>
                        <span className="hidden sm:inline">{result.player.name}</span>
                      </Link>
                    ) : (
                      <span className="font-medium" title={result.player.name}>
                        {result.player.name}
                      </span>
                    )}
                  </div>
                </CustomTableCell>
                <CustomTableCell className="hidden md:table-cell text-right py-2 px-3 sm:py-4 sm:px-6 font-medium text-gray-700 tabular-nums">{result.start_rank || '-'}</CustomTableCell>
                <CustomTableCell className="hidden md:table-cell text-right py-2 px-3 sm:py-4 sm:px-6 font-medium text-gray-700 tabular-nums">
                  {result.rating || 'Unrated'}
                </CustomTableCell>
                <CustomTableCell className="hidden md:table-cell text-right py-2 px-3 sm:py-4 sm:px-6 font-medium text-gray-700 tabular-nums">{result.points}</CustomTableCell>
                <CustomTableCell className="text-right py-2 px-3 sm:py-4 sm:px-6 font-medium text-gray-700 tabular-nums">
                  {(result.tpr || '-')}
                </CustomTableCell>
              </CustomTableRow>
            ))}
          </CustomTableBody>
        </CustomTable>
      </Card>

      {tournament.total_pages > 1 && (
        <Pagination 
          currentPage={page} 
          totalPages={tournament.total_pages} 
          basePath={`/tournament/${id}`} 
          queryParams={{
            sort,
            dir
          }}
          className="mt-4"
        />
      )}
    </div>
  )
}
