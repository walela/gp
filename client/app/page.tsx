import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarDays, MapPin, Hash } from "lucide-react"
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
    <div className="space-y-8 pb-8">
      <div>
        <h1 className="scroll-m-20 text-2xl font-bold tracking-tight">Grand Prix Tournaments</h1>
        <p className="text-lg text-muted-foreground">
          Track your performance across the 2024 Kenya Grand Prix series.
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
                  <Badge className={tournament.status === "Completed" ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-blue-100 text-blue-700 hover:bg-blue-100"}>
                    {tournament.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div>
        <h2 className="text-2xl font-bold tracking-tight">Upcoming Tournaments</h2>
        <p className="text-muted-foreground">
          View upcoming chess tournaments in Kenya
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {upcomingTournaments.map((tournament) => (
          <Link key={tournament.id} href={`/tournament/${tournament.id}`}>
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{tournament.name}</CardTitle>
                  <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Upcoming</Badge>
                </div>
                <CardDescription className="flex items-center gap-2 mt-2">
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
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{tournament.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <span>{tournament.rounds} rounds</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
