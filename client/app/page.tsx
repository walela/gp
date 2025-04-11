import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CalendarDays, MapPin, Hash, Calendar, CheckCircle2, HelpCircle } from 'lucide-react'
import { getTournaments } from '@/services/api'

export default async function HomePage() {
  const tournaments = await getTournaments()

  const upcomingTournaments = [
    {
      id: '742150',
      name: 'Kenya Open',
      startDate: '2025-04-18',
      endDate: '2025-04-21',
      location: 'Nairobi',
      rounds: 8,
      confirmed: false
    },
    {
      id: '742151',
      name: 'Nakuru Open',
      startDate: '2025-05-01',
      endDate: '2025-05-03',
      location: 'Nakuru',
      rounds: 6,
      confirmed: true
    },
    {
      id: '742152',
      name: 'Kiambu Open',
      startDate: '2025-05-10',
      endDate: '2025-05-11',
      location: 'Nairobi',
      rounds: 6,
      confirmed: true
    },
    {
      id: '742153',
      name: 'Nyeri Open',
      startDate: '2025-05-29',
      endDate: '2025-05-31',
      location: 'Nyeri',
      rounds: 6,
      confirmed: false
    },
    {
      id: '742154',
      name: 'Nairobi County Open',
      startDate: '2025-05-30',
      endDate: '2025-06-02',
      location: 'Nairobi',
      rounds: 8,
      confirmed: false
    }
  ]

  const plannedTournaments = [
    {
      id: '742160',
      name: '67th NCC Championship',
      month: 'August',
      location: 'Nairobi',
      tentativeRounds: 6
    },
    {
      id: '742161',
      name: 'Jumuiya ya Afrika Mashariki Open',
      month: 'September 20-21',
      location: 'Nairobi',
      tentativeRounds: 6
    },
    {
      id: '742162',
      name: 'Mombasa Open 2025',
      month: 'October 10-12',
      location: 'Mombasa',
      tentativeRounds: 6
    },
    {
      id: '742163',
      name: 'Bungoma Open 2025',
      month: 'November 1-2',
      location: 'Bungoma',
      tentativeRounds: 6
    }
  ]

  return (
    <div className="space-y-8 pb-8">
      <div>
        <h1 className="scroll-m-20 text-2xl font-bold tracking-tight">Chess Tournament Tracker</h1>
        <p className="text-base text-muted-foreground">
          Track chess tournaments across Kenya for the 2025 season
        </p>
      </div>

      <div>
        <h2 className="text-2xl font-bold tracking-tight">Completed Tournaments</h2>
        <p className="text-muted-foreground mb-4">Official tournaments in the 2024 Kenya Grand Prix series</p>
      
        <div className="flex flex-wrap gap-6">
          {tournaments.map((tournament) => (
            <Link 
              key={tournament.id} 
              href={`/tournament/${tournament.id}`}
              className="w-full sm:w-[calc(50%-12px)] md:w-[calc(33.333%-16px)]"
            >
              <Card className="hover:bg-muted/50 hover:scale-[1.02] transition-all cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{tournament.name}</CardTitle>
                    <Badge
                      className={
                        tournament.status === 'Completed'
                          ? 'bg-green-100 text-green-700 hover:bg-green-100'
                          : 'bg-blue-100 text-blue-700 hover:bg-blue-100'
                      }>
                      {tournament.status}
                    </Badge>
                  </div>
                  <CardDescription>{tournament.results} players registered</CardDescription>
                </CardHeader>
                <CardContent className="text-sm">
                  <div className="flex justify-start text-sm">
                    <span className="text-blue-600 hover:text-blue-700 hover:underline underline-offset-4">
                      View details →
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold tracking-tight">Upcoming Tournaments</h2>
        <p className="text-muted-foreground mb-4">Grand Prix tournaments within the next 60 days. Confirmed tournaments
          are indicated with a green tick
        </p>
      
        <div className="flex flex-wrap gap-6">
          {upcomingTournaments.map((tournament) => (
            <Link 
              key={tournament.id} 
              href={`/tournament/${tournament.id}`}
              className="w-full sm:w-[calc(50%-12px)] md:w-[calc(33.333%-16px)]"
            >
              <Card className="hover:bg-muted/50 hover:scale-[1.02] transition-all cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-1.5">
                      {tournament.name}
                      {tournament.confirmed ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <HelpCircle className="h-4 w-4 text-amber-600" />
                      )}
                    </CardTitle>
                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                      Upcoming
                    </Badge>
                  </div>
                  <CardDescription className="flex items-center gap-2 mt-2">
                    <CalendarDays className="h-4 w-4" />
                    <span>
                      {new Date(tournament.startDate).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric'
                      })}{' '}
                      -{' '}
                      {new Date(tournament.endDate).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{tournament.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{tournament.rounds} rounds</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold tracking-tight">Planned Tournaments</h2>
        <p className="text-muted-foreground mb-4">Future tournaments with tentative dates and details</p>
      
        <div className="flex flex-wrap gap-6">
          {plannedTournaments.map((tournament) => (
            <div 
              key={tournament.id}
              className="w-full sm:w-[calc(50%-12px)] md:w-[calc(33.333%-16px)]"
            >
              <Card className="h-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{tournament.name}</CardTitle>
                    <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">Planned</Badge>
                  </div>
                  <CardDescription className="flex items-center gap-2 mt-2">
                    <Calendar className="h-4 w-4" />
                    <span>{tournament.month} 2025</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{tournament.location}</span>
                  </div>
                  {tournament.tentativeRounds && (
                    <div className="flex items-center gap-2">
                      <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>~{tournament.tentativeRounds} rounds</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
