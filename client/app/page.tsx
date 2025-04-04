import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarDays } from "lucide-react"
import { getTournaments } from "@/services/api"

export default async function HomePage() {
  const tournaments = await getTournaments()

  const upcomingTournaments = [
    {
      id: "742150",
      name: "Kenya Open 2025",
      date: "2025-05-01",
      location: "Nairobi",
      rounds: 9,
    },
    {
      id: "742151",
      name: "Nakuru Open 2025",
      date: "2025-06-15",
      location: "Nakuru",
      rounds: 7,
    }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Grand Prix Tournaments</h1>
        <p className="text-muted-foreground">
          Track Kenyan chess tournaments and player performances
        </p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tournaments.map((tournament) => (
          <Link key={tournament.id} href={`/tournament/${tournament.id}`}>
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardHeader>
                <CardTitle>{tournament.name}</CardTitle>
                <CardDescription>
                  {tournament.results} players registered
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between text-sm">
                  <span>View details →</span>
                  <span className={tournament.status === "Completed" ? "text-green-600" : "text-blue-600"}>
                    {tournament.status}
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Upcoming Tournaments</h1>
        <p className="text-muted-foreground">
          View upcoming chess tournaments in Kenya
        </p>
      </div>

      <div className="grid gap-4">
        {upcomingTournaments.map((tournament) => (
          <Card key={tournament.id} className="rounded-none border-x-0">
            <Link
              href={`/tournament/${tournament.id}`}
              className="block p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold">{tournament.name}</h2>
                    <Badge variant="secondary" className="text-xs">Upcoming</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarDays className="h-4 w-4" />
                    <span>{new Date(tournament.date).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric"
                    })}</span>
                  </div>
                </div>
                <div className="flex gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Location</p>
                    <p className="font-medium">{tournament.location}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Rounds</p>
                    <p className="font-medium">{tournament.rounds}</p>
                  </div>
                </div>
              </div>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  )
}
