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
      name: '3rd Jumuiya ya Afrika Mashariki Open',
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
    <div className="min-h-screen">
      <div className="container mx-auto px-2 py-4 space-y-8">

        <div>
          <h2 className="text-xl font-bold tracking-tight text-gray-700">Completed Tournaments</h2>
          <p className="text-muted-foreground mb-4">Completed tournaments in the 2025 Chess Kenya Grand Prix series</p>

          <div className="flex flex-wrap gap-6">
            {tournaments.map(tournament => {
              // Determine location based on tournament name
              let location = 'Nairobi'
              if (tournament.name.includes('Eldoret')) {
                location = 'Eldoret'
              } else if (tournament.name.includes('Kisumu')) {
                location = 'Kisumu'
              } else if (tournament.name.includes('Waridi')) {
                location = 'Nairobi'
              } else if (tournament.name.includes('Mavens')) {
                location = 'Nairobi'
              }

              // Determine rounds based on tournament name
              let rounds = 6
              if (tournament.name.includes('Mavens')) {
                rounds = 8
              }

              // Determine dates based on tournament name
              let dates = ''
              if (tournament.name.includes('Eldoret')) {
                dates = 'January 25th-26th, 2025'
              } else if (tournament.name.includes('Kisumu')) {
                dates = 'March 22nd-23rd, 2025'
              } else if (tournament.name.includes('Waridi')) {
                dates = 'March 8th-9th, 2025'
              } else if (tournament.name.includes('Mavens')) {
                dates = 'February 28th - March 2nd, 2025'
              }

              return (
                <Link
                  key={tournament.id}
                  href={`/tournament/${tournament.id}`}
                  className="w-full sm:w-[calc(50%-12px)] md:w-[calc(33.333%-16px)]">
                  <Card className="h-full gap-2 py-4 rounded-lg">
                    <CardHeader className="pb-1 pt-3 px-4">
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
                    </CardHeader>
                    <CardContent className="px-4 pt-0 pb-2 flex flex-col gap-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-500">
                        <CalendarDays className="h-4 w-4" />
                        <span>{dates}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-muted-foreground">
                          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                          <circle cx="9" cy="7" r="4"></circle>
                          <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                        <span>{tournament.results} Kenyan players registered </span>
                      </div>
                      <div className="flex items-center justify-between text-gray-800">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{rounds} rounds</span>
                        </div>
                      </div>
                      <div className="pt-2">
                        <span className="text-blue-600 hover:text-blue-700 hover:underline underline-offset-4">View details →</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold tracking-tight text-gray-700">Upcoming Tournaments</h2>
          <p className="text-muted-foreground mb-4">
            Grand Prix tournaments within the next 60 days. Confirmed tournaments are indicated with a green check.
          </p>

          <div className="flex flex-wrap gap-6">
            {upcomingTournaments.map(tournament => (
              <div key={tournament.id} className="w-full sm:w-[calc(50%-12px)] md:w-[calc(33.333%-16px)]">
                <Card className="h-full py-4 gap-2 rounded-lg">
                  <CardHeader className="pb-1 pt-3 px-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-1.5">
                        {tournament.name}
                        {tournament.confirmed ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <HelpCircle className="h-4 w-4 text-amber-600" />
                        )}
                      </CardTitle>
                      <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Upcoming</Badge>
                    </div>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <CalendarDays className="h-4 w-4" />
                      <span>
                        {new Date(tournament.startDate)
                          .toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric'
                          })
                          .replace(/(\d+)/, match => {
                            const num = parseInt(match)
                            if (num >= 11 && num <= 13) return num + 'th'
                            switch (num % 10) {
                              case 1:
                                return num + 'st'
                              case 2:
                                return num + 'nd'
                              case 3:
                                return num + 'rd'
                              default:
                                return num + 'th'
                            }
                          })}{' '}
                        -{' '}
                        {new Date(tournament.endDate)
                          .toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric'
                          })
                          .replace(/(\d+)/, match => {
                            const num = parseInt(match)
                            if (num >= 11 && num <= 13) return num + 'th'
                            switch (num % 10) {
                              case 1:
                                return num + 'st'
                              case 2:
                                return num + 'nd'
                              case 3:
                                return num + 'rd'
                              default:
                                return num + 'th'
                            }
                          })}
                      </span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-4 pt-0 pb-2 flex flex-col gap-2 text-sm">
                    <div className="flex justify-between">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{tournament.location}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{tournament.rounds} rounds</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold tracking-tight text-gray-700">Planned Tournaments</h2>
          <p className="text-muted-foreground mb-4">Future tournaments with tentative dates and details</p>

          <div className="flex flex-wrap gap-6">
            {plannedTournaments.map(tournament => (
              <div key={tournament.id} className="w-full sm:w-[calc(50%-12px)] md:w-[calc(33.333%-16px)]">
                <Card className="h-full gap-2 py-4 rounded-lg">
                  <CardHeader className="pb-1 pt-3 px-4">
                    <div className="flex items-center justify-between">
                      <CardTitle>{tournament.name}</CardTitle>
                      <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">Planned</Badge>
                    </div>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Calendar className="h-4 w-4" />
                      <span>{tournament.month} 2025</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-4 pt-0 pb-2 flex flex-col gap-2 text-sm">
                    <div className="flex justify-between">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{tournament.location}</span>
                      </div>
                      {tournament.tentativeRounds && (
                        <div className="flex items-center gap-1">
                          <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>~{tournament.tentativeRounds} rounds</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
