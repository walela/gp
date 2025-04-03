import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { SortableHeader } from "@/components/rankings/sortable-header"
import { Button } from "@/components/ui/button"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { getTournament } from "@/services/api"
import Link from "next/link"

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{tournament.name}</h1>
        <p className="text-muted-foreground">
          Tournament results and player performances
        </p>
      </div>

      <Card className="rounded-none overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[4rem] text-right pr-8">Rank</TableHead>
              <SortableHeader column="name" label="Name" basePath={`/tournament/${params.id}`} />
              <SortableHeader column="rating" label="Rating" align="right" basePath={`/tournament/${params.id}`} />
              <SortableHeader column="points" label="Points" align="right" basePath={`/tournament/${params.id}`} />
              <SortableHeader column="tpr" label="TPR" align="right" basePath={`/tournament/${params.id}`} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {tournament.results.map((result, index) => (
              <TableRow key={result.player.fide_id || result.player.name} className="even:bg-muted/30">
                <TableCell className="text-right pr-8 font-medium">{(page - 1) * 25 + index + 1}</TableCell>
                <TableCell>
                  <Link href={`/player/${result.player.fide_id}`} className="font-medium text-blue-600 hover:underline">
                    {result.player.name}
                  </Link>
                </TableCell>
                <TableCell className="text-right tabular-nums">{result.player.rating || 'Unrated'}</TableCell>
                <TableCell className="text-right tabular-nums">{result.points}</TableCell>
                <TableCell className="text-right tabular-nums">{result.tpr || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {tournament.total_pages > 1 && (
        <div className="flex justify-center gap-1">
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
              <ChevronLeftIcon className="h-4 w-4" />
              Previous
            </Link>
          </Button>

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
              Next
              <ChevronRightIcon className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}
