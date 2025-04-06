import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { SortableHeader } from "@/components/rankings/sortable-header"
import { Button } from "@/components/ui/button"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { getTournament } from "@/services/api"
import { notFound } from "next/navigation"

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
  const sort = searchParams.sort || 'points'
  const dir = (searchParams.dir || 'desc') as 'asc' | 'desc'
  const page = Number(searchParams.page || '1')

  const tournament = await getTournament(params.id, { sort, dir, page })

  if (!tournament) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{tournament.name}</h1>
        <p className="text-muted-foreground">
          Tournament results and player performances
        </p>
      </div>

      <Card className="rounded-none">
        <div className="w-full">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader column="rank" label="Rank" basePath={`/tournament/${params.id}`} className="w-[3rem] text-right pr-4 lg:pr-8" />
                <SortableHeader column="name" label="Name" basePath={`/tournament/${params.id}`} className="w-[120px] sm:w-[160px] lg:w-[200px]" />
                <SortableHeader column="rating" label="Rating" align="right" basePath={`/tournament/${params.id}`} className="hidden lg:table-cell" />
                <SortableHeader column="points" label="Points" align="right" basePath={`/tournament/${params.id}`} className="hidden lg:table-cell" />
                <SortableHeader column="tpr" label="TPR" align="right" basePath={`/tournament/${params.id}`} className="w-[4rem]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {tournament.results.map((result, index) => (
                <TableRow key={result.player.fide_id || result.player.name} className="even:bg-muted/30">
                  <TableCell className="text-right pr-4 lg:pr-8 font-medium">{(page - 1) * 25 + index + 1}</TableCell>
                  <TableCell className="w-[120px] sm:w-[160px] lg:w-[200px]">
                    <div className="truncate">
                      {result.player.fide_id ? (
                        <Link 
                          href={`/player/${result.player.fide_id}`}
                          className="font-medium text-blue-600 hover:underline"
                          title={result.player.name}
                        >
                          <span className="sm:hidden">
                            {result.player.name.length > 25 
                              ? result.player.name.split(' ').slice(0, 2).join(' ') + '...'
                              : result.player.name
                            }
                          </span>
                          <span className="hidden sm:inline">{result.player.name}</span>
                        </Link>
                      ) : (
                        <span className="font-medium" title={result.player.name}>{result.player.name}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-right tabular-nums">{result.player.rating || 'Unrated'}</TableCell>
                  <TableCell className="hidden lg:table-cell text-right tabular-nums">{result.points}</TableCell>
                  <TableCell className="text-right tabular-nums w-[4rem]">{result.tpr || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {tournament.total_pages > 1 && (
        <div className="flex flex-wrap justify-center gap-1">
          <Button
            variant="outline"
            size="sm"
            asChild
            disabled={page === 1}
          >
            <Link
              href={{
                pathname: `/tournament/${params.id}`,
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
            {Array.from({ length: tournament.total_pages }, (_, i) => i + 1).map((p) => (
              <Button
                key={p}
                variant={p === page ? "default" : "outline"}
                size="sm"
                asChild
              >
                <Link
                  href={{
                    pathname: `/tournament/${params.id}`,
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
              Page {page} of {tournament.total_pages}
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            asChild
            disabled={page === tournament.total_pages}
          >
            <Link
              href={{
                pathname: `/tournament/${params.id}`,
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
