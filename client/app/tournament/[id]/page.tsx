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
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { getTournament } from '@/services/api'
import { notFound } from 'next/navigation'

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

export default async function TournamentPage({ params, searchParams }: TournamentPageProps) {
  // Properly await the params and searchParams objects
  const routeParams = await params;
  const queryParams = await searchParams;
  
  // Now we can safely access the properties
  const id = routeParams.id
  const sort = queryParams.sort || 'points'
  const dir = (queryParams.dir || 'desc') as 'asc' | 'desc'
  const page = Number(queryParams.page || '1')

  const tournament = await getTournament(id, { 
    sort, 
    dir, 
    page 
  })

  if (!tournament) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="scroll-m-20 text-2xl md:text-3xl 2xl:text-4xl font-bold tracking-tight">{tournament.name}</h1>
        <p className="text-muted-foreground">Tournament results and player performances</p>
      </div>

      <Card className="rounded-lg border-0 shadow-sm overflow-hidden bg-white/90 backdrop-blur-sm p-0">
        <CustomTable className="h-full">
          <CustomTableHeader>
            <CustomTableRow>
              <CustomTableHead className="w-[40px] text-right">
                <SortableHeader
                  column="rank"
                  label="Rank"
                  basePath={`/tournament/${id}`}
                  className="w-full"
                />
              </CustomTableHead>
              <CustomTableHead className="min-w-[120px]">
                <SortableHeader
                  column="name"
                  label="Name"
                  basePath={`/tournament/${id}`}
                  className="w-full"
                />
              </CustomTableHead>
              <CustomTableHead className="hidden md:table-cell text-right">
                <SortableHeader
                  column="rating"
                  label="Rating"
                  align="right"
                  basePath={`/tournament/${id}`}
                  className="w-full"
                />
              </CustomTableHead>
              <CustomTableHead className="hidden md:table-cell text-right">
                <SortableHeader
                  column="points"
                  label="Points"
                  align="right"
                  basePath={`/tournament/${id}`}
                  className="w-full"
                />
              </CustomTableHead>
              <CustomTableHead className="text-right">
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
              <CustomTableRow key={result.player.fide_id || result.player.name}>
                <CustomTableCell isHeader className="text-right">{(page - 1) * 25 + index + 1}</CustomTableCell>
                <CustomTableCell className="min-w-[120px]">
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
                <CustomTableCell className="hidden md:table-cell text-right tabular-nums">
                  {result.player.rating || 'Unrated'}
                </CustomTableCell>
                <CustomTableCell className="hidden md:table-cell text-right tabular-nums">{result.points}</CustomTableCell>
                <CustomTableCell className="text-right tabular-nums">{result.tpr || '-'}</CustomTableCell>
              </CustomTableRow>
            ))}
          </CustomTableBody>
        </CustomTable>
      </Card>

      {tournament.total_pages > 1 && (
        <div className="flex flex-wrap justify-center gap-1">
          <Button variant="outline" size="sm" asChild disabled={page === 1}>
            <Link
              href={`/tournament/${id}?sort=${sort}&dir=${dir}&page=${page - 1}`}>
              <ChevronLeftIcon className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Previous</span>
            </Link>
          </Button>

          <div className="hidden sm:flex gap-1">
            {Array.from({ length: tournament.total_pages }, (_, i) => i + 1).map(p => (
              <Button key={p} variant={p === page ? 'default' : 'outline'} size="sm" asChild>
                <Link
                  href={`/tournament/${id}?sort=${sort}&dir=${dir}&page=${p}`}>
                  {p}
                </Link>
              </Button>
            ))}
          </div>

          <div className="sm:hidden">
            <span className="mx-2 text-sm text-muted-foreground">
              Page {page} of {tournament.total_pages}
            </span>
          </div>

          <Button variant="outline" size="sm" asChild disabled={page === tournament.total_pages}>
            <Link
              href={`/tournament/${id}?sort=${sort}&dir=${dir}&page=${page + 1}`}>
              <span className="hidden sm:inline">Next</span>
              <ChevronRightIcon className="h-4 w-4 sm:ml-1" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}
