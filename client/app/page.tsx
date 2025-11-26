import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CalendarDays, MapPin, Hash, Calendar } from 'lucide-react'
import { getTournamentData } from '@/lib/tournament-data'
import { TournamentTable } from '@/components/tournament-table'
import { upcomingTournaments, plannedTournaments } from '@/lib/active-tournaments'
import dayjs from '@/lib/dayjs'
import { Metadata } from 'next'
import { CountdownBadge } from '@/components/countdown-badge'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Chess Kenya 2025 Grand Prix - Official Tournament Tracker',
  description:
    'Track Chess Kenya Grand Prix tournaments, view results, player rankings and upcoming events. Official standings for the 2025 chess season in Kenya.',
  openGraph: {
    title: 'Chess Kenya 2025 Grand Prix',
    description: 'Official tournament tracker for Chess Kenya Grand Prix. View results, rankings and upcoming chess tournaments across Kenya.',
    type: 'website',
    siteName: 'Chess Kenya Grand Prix',
    url: 'https://1700chess.vercel.app'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Chess Kenya 2025 Grand Prix',
    description: 'Track chess tournaments, results and rankings for the Kenya Grand Prix series'
  }
}

function formatTimeAway(startDateIso: string) {
  const startDate = dayjs(startDateIso)
  const now = dayjs()
  const daysAway = startDate.diff(now, 'day')
  const weeksAway = Math.floor(daysAway / 7)
  const remainingDays = daysAway % 7

  if (daysAway <= 0) return daysAway === 0 ? 'Today' : 'In progress'
  if (daysAway === 1) return 'Tomorrow'
  if (daysAway < 7) return `${daysAway} days away`
  if (weeksAway === 1 && remainingDays === 0) return '1 week away'
  if (weeksAway === 1) return `1 week ${remainingDays} ${remainingDays === 1 ? 'day' : 'days'} away`
  if (remainingDays === 0) return `${weeksAway} weeks away`
  return `${weeksAway} weeks ${remainingDays} ${remainingDays === 1 ? 'day' : 'days'} away`
}

export default async function HomePage() {
  const tournaments = await getTournamentData()

  return (
    <div className="min-h-screen">
      <div className="container mx-auto sm:px-4 py-4 space-y-8 max-w-11xl">
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold tracking-tight text-gray-700">Upcoming Tournaments</h2>
          </div>
          <p className="text-pretty text-gray-600 mb-4 text-sm tracking-wide leading-tighter">
            Grand Prix events happening within the next 60 days.
          </p>

          <div className="flex flex-wrap gap-4">
            {upcomingTournaments.map(tournament => {
              if (!tournament.startDate || !tournament.endDate) return null

              const timeAwayText = formatTimeAway(tournament.startDate)
              const detailHref =
                typeof tournament.detailsUrl === 'string'
                  ? tournament.detailsUrl
                  : tournament.detailsUrl === undefined && /^\d+$/.test(tournament.id)
                    ? `/tournament/${tournament.id}`
                    : null

              return (
                <div key={tournament.id} className="w-full sm:w-[calc(50%-12px)] md:w-[calc(33.333%-16px)]">
                  <Card
                    className={`h-full rounded-lg ${
                      tournament.status === 'postponed' ? 'opacity-75' : ''
                    } relative overflow-hidden py-2 gap-4`}>
                    {(tournament.status !== 'postponed' || tournament.registrationUrl) && (
                      <div className="px-4 flex items-center justify-between gap-3">
                        {tournament.status !== 'postponed' ? (
                          <CountdownBadge targetDate={tournament.startDate} title={timeAwayText} />
                        ) : (
                          <span />
                        )}
                        {tournament.registrationUrl && (
                          <Link
                            href={tournament.registrationUrl}
                            className="text-sm font-semibold text-blue-600 hover:text-blue-700 underline underline-offset-4"
                            target="_blank"
                            rel="noopener noreferrer"
                            prefetch={false}>
                            Register
                          </Link>
                        )}
                      </div>
                    )}

                    <CardHeader className="pb-1 px-4">
                      <div className="flex items-center justify-between">
                        <CardTitle>
                          {detailHref ? (
                            <Link
                              href={detailHref}
                              className={
                                tournament.status === 'postponed'
                                  ? 'line-through text-gray-500 hover:underline'
                                  : 'hover:underline'
                              }>
                              {tournament.short_name || tournament.name}
                            </Link>
                          ) : (
                            <span className={tournament.status === 'postponed' ? 'line-through text-gray-500' : ''}>
                              {tournament.short_name || tournament.name}
                            </span>
                          )}
                        </CardTitle>
                        {tournament.status === 'postponed' ? (
                          <Badge className="bg-gray-200 text-gray-600 hover:bg-gray-200 whitespace-nowrap">Postponed</Badge>
                        ) : (
                          <Badge
                            className={
                              tournament.confirmed
                                ? 'bg-green-100 text-green-700 hover:bg-green-100'
                                : 'bg-blue-100 text-blue-700 hover:bg-blue-100'
                            }>
                            {tournament.confirmed ? 'Confirmed' : 'Upcoming'}
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <CalendarDays className="h-4 w-4" />
                        <span>
                          {dayjs(tournament.startDate).format('MMMM Do')} - {dayjs(tournament.endDate).format('MMMM Do, YYYY')}
                        </span>
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="px-4 pt-0 pb-2 flex flex-col gap-3 text-sm">
                      <div className="flex justify-between">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{tournament.location}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{tournament.rounds ? `${tournament.rounds} rounds` : 'TBA'}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )
            })}
          </div>
        </section>

        {plannedTournaments.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold tracking-tight text-gray-700">Planned Tournaments</h2>
            <p className="text-pretty text-gray-600 mb-4 text-sm tracking-wide leading-tighter">
              Future tournaments with confirmed or tentative dates and details.
            </p>

            <div className="flex flex-wrap gap-4">
              {plannedTournaments.map(tournament => {
                const hasDates = Boolean(tournament.startDate && tournament.endDate)
                const timeAwayText = tournament.startDate ? formatTimeAway(tournament.startDate) : ''

                const detailHref =
                  typeof tournament.detailsUrl === 'string'
                    ? tournament.detailsUrl
                    : tournament.detailsUrl === undefined && hasDates && /^\d+$/.test(tournament.id)
                      ? `/tournament/${tournament.id}`
                      : null

                return (
                  <div key={tournament.id} className="w-full sm:w-[calc(50%-12px)] md:w-[calc(33.333%-16px)]">
                    <Card className="h-full rounded-lg relative overflow-hidden gap-4 py-2">
                      {timeAwayText && (
                        <div className="px-4">
                          <CountdownBadge
                            targetDate={tournament.startDate as string}
                            title={timeAwayText}
                          />
                        </div>
                      )}

                      <CardHeader className="px-4">
                        <div className="flex items-center justify-between">
                          <CardTitle>
                            {detailHref ? (
                              <Link href={detailHref} className="hover:underline">
                                {tournament.short_name || tournament.name}
                              </Link>
                            ) : (
                              tournament.short_name || tournament.name
                            )}
                          </CardTitle>
                          <Badge
                            className={
                              tournament.confirmed
                                ? 'bg-green-100 text-green-700 hover:bg-green-100'
                                : 'bg-purple-100 text-purple-700 hover:bg-purple-100'
                            }>
                            {tournament.confirmed ? 'Confirmed' : 'Planned'}
                          </Badge>
                        </div>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {hasDates
                              ? `${dayjs(tournament.startDate!).format('MMM Do')} - ${dayjs(tournament.endDate!).format(
                                  'MMM Do, YYYY'
                                )}`
                              : `${tournament.month ?? 'TBA'} 2025`}
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
                            <span>
                              {tournament.rounds
                                ? `${tournament.rounds} rounds`
                                : `~${tournament.tentativeRounds ?? tournament.rounds ?? 6} rounds`}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        <section className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-gray-700">Completed Tournaments</h2>
            <p className="text-pretty text-gray-600 text-sm tracking-wide leading-tighter">
              Completed Grand Prix tournaments
            </p>
          </div>

          <TournamentTable tournaments={tournaments} />
        </section>
      </div>
    </div>
  )
}
