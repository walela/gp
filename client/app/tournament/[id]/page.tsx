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
import { getTournament, getTournamentAllResults, TournamentResult } from '@/services/api'
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

// Function to get tournament date
function getTournamentDate(name: string) {
  if (name.includes('Eldoret')) return 'January 25-26, 2025'
  if (name.includes('Mavens')) return 'Feb 28 - Mar 2, 2025'
  if (name.includes('Waridi')) return 'March 8-9, 2025'
  if (name.includes('Kisumu')) return 'March 22-23, 2025'
  if (name.includes('Nakuru')) return 'May 1-3, 2025'
  return 'TBD'
}

// Function to get tournament location
function getTournamentLocation(name: string) {
  if (name.includes('Eldoret')) return 'Eldoret, Kenya'
  if (name.includes('Kisumu')) return 'Kisumu, Kenya'
  if (name.includes('Nakuru')) return 'Nakuru, Kenya'
  return 'Nairobi, Kenya'
}

export default async function TournamentPage({ params, searchParams }: TournamentPageProps) {
  // Now we can safely access the properties
  const id = params.id
  const sort = searchParams.sort || 'points'
  const dir = (searchParams.dir || 'desc') as 'asc' | 'desc'
  const page = Number(searchParams.page || '1')

  // Fetch paginated tournament data for display
  const tournament = await getTournament(id, { 
    sort, 
    dir, 
    page 
  })

  // Fetch all tournament results for TPR calculation
  const allResults = await getTournamentAllResults(id);

  if (!tournament) {
    notFound()
  }

  // Calculate average TPR of top 10 players using all results
  const averageTopTpr = calculateAverageTopTpr(allResults);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="scroll-m-20 text-2xl md:text-3xl 2xl:text-4xl font-bold tracking-tight">
          {tournament.name}
        </h1>
      </div>

      {/* Tournament Metadata - Optimized for mobile */}
      <div className="md:hidden">
        <Card className="p-4 rounded-lg shadow-sm">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="text-sm font-medium">
                  {getTournamentDate(tournament.name)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-red-600 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Location</p>
                <p className="text-sm font-medium">
                  {getTournamentLocation(tournament.name)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-600 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Participants</p>
                <p className="text-sm font-medium">{tournament.total} players</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Format</p>
                <p className="text-sm font-medium">
                  {tournament.name.includes('Mavens') ? '8 rounds' : '6 rounds'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-600 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Avg Top 10 TPR</p>
                <p className="text-sm font-medium">{averageTopTpr}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">External</p>
                <a 
                  href={`https://chess-results.com/tnr${tournament.id}.aspx?lan=1`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-blue-600 hover:underline"
                >
                  chess-results.com
                </a>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Tournament Metadata - Desktop version */}
      <div className="hidden md:block">
        <Card className="p-4 rounded-lg shadow-sm border-0 bg-white/95 mb-6">
          <div className="grid grid-cols-5 gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-50 p-2 rounded-full flex-shrink-0">
                <CalendarDays className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Date</p>
                <p className="font-medium text-sm">
                  {getTournamentDate(tournament.name)}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="bg-red-50 p-2 rounded-full flex-shrink-0">
                <MapPin className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Location</p>
                <p className="font-medium text-sm">
                  {getTournamentLocation(tournament.name)}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="bg-purple-50 p-2 rounded-full flex-shrink-0">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Participants</p>
                <p className="font-medium text-sm">{tournament.total} players</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="bg-amber-50 p-2 rounded-full flex-shrink-0">
                <Trophy className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Format</p>
                <p className="font-medium text-sm">
                  {tournament.name.includes('Mavens') ? '8 rounds' : '6 rounds'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="bg-yellow-50 p-2 rounded-full flex-shrink-0">
                <Star className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Avg TPR (Top 10)</p>
                <p className="font-medium text-sm">{averageTopTpr}</p>
              </div>
            </div>
            
            <div className="col-span-5 mt-1">
              <div className="flex items-center gap-3">
                <div className="bg-blue-50 p-2 rounded-full flex-shrink-0">
                  <ExternalLink className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <a 
                    href={`https://chess-results.com/tnr${tournament.id}.aspx?lan=1`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm"
                  >
                    View tournament on chess-results.com
                  </a>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card className="rounded-lg border-0 shadow-sm overflow-hidden bg-white/95 backdrop-blur-sm p-0">
        <CustomTable className="h-full">
          <CustomTableHeader>
            <CustomTableRow className="bg-gray-50 border-b">
              <CustomTableHead className="w-[30px] sm:w-[40px] text-right py-2 px-3 sm:py-4 sm:px-6 font-semibold text-gray-700">
                <SortableHeader
                  column="rank"
                  label="#"
                  align="right"
                  basePath={`/tournament/${id}`}
                  className="w-full sm:hidden"
                />
                <SortableHeader
                  column="rank"
                  label="Rank"
                  align="right"
                  basePath={`/tournament/${id}`}
                  className="w-full hidden sm:block"
                />
              </CustomTableHead>
              <CustomTableHead className="min-w-[120px] py-2 px-3 sm:py-4 sm:px-6 font-semibold text-gray-700">
                <SortableHeader
                  column="name"
                  label="Name"
                  basePath={`/tournament/${id}`}
                  className="w-full"
                />
              </CustomTableHead>
              <CustomTableHead className="hidden md:table-cell text-right py-2 px-3 sm:py-4 sm:px-6 font-semibold text-gray-700">
                <SortableHeader
                  column="start_rank"
                  label="Starting Rank"
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
