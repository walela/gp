import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getPlayer } from "@/services/api"
import { notFound } from "next/navigation"

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
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{player.name}</h1>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 text-sm">
          <div className="contents">
            <dt className="text-muted-foreground">FIDE ID</dt>
            <dd className="font-medium">{player.fide_id}</dd>
          </div>
          <div className="contents">
            <dt className="text-muted-foreground">Current Rating</dt>
            <dd className="font-medium tabular-nums">{player.rating || 'Unrated'}</dd>
          </div>
        </dl>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">Tournament History</h2>
        <Card className="rounded-none">
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
        </Card>
      </div>
    </div>
  )
}
