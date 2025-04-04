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
      startDate: "2025-04-18",
      endDate: "2025-04-21",
      location: "Nairobi",
      rounds: 8,
    },
    {
      id: "742151",
      name: "Nakuru Open 2025",
      startDate: "2025-05-01",
      endDate: "2025-05-03",
      location: "Nakuru",
      rounds: 6,
    }
  ]

  return (
    <div className="space-y-6 pb-8">
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
        <h2 className="text-2xl font-semibold">Upcoming Tournaments</h2>
        <p className="text-muted-foreground">
          View upcoming chess tournaments in Kenya
        </p>
      </div>

      <div className="grid gap-4">
        {upcomingTournaments.map((tournament) => (
          <Card key={tournament.id} className="rounded-lg shadow-sm">
            <Link 
              href={`/tournament/${tournament.id}`}
              className="block hover:bg-muted/50 transition-colors"
            >
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold">{tournament.name}</h3>
                  <Badge>Upcoming</Badge>
                </div>

                <div className="flex items-center gap-2 text-muted-foreground">
                  <CalendarDays className="h-4 w-4" />
                  <span>
                    {new Date(tournament.startDate).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric"
                    })} - {new Date(tournament.endDate).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric"
                    })}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium">{tournament.location}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Rounds</p>
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
