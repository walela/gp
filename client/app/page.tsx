import Link from 'next/link'
import { getTournamentData } from '@/lib/tournament-data'
import { TournamentTable } from '@/components/tournament-table'
import { upcomingTournaments, plannedTournaments } from '@/lib/active-tournaments'
import dayjs from '@/lib/dayjs'
import { Metadata } from 'next'
import { SeasonSelector } from '@/components/season-selector'
import { getSeasons } from '@/services/api'
import { ArrowRight, RotateCw } from 'lucide-react'

export const revalidate = 86400 // cache for 24 hours

export const metadata: Metadata = {
  title: 'Chess Kenya Grand Prix - Official Tournament Tracker',
  description:
    'Track Chess Kenya Grand Prix tournaments, view results, player rankings and upcoming events. Official standings for the chess season in Kenya.',
  openGraph: {
    title: 'Chess Kenya Grand Prix',
    description: 'Official tournament tracker for Chess Kenya Grand Prix. View results, rankings and upcoming chess tournaments across Kenya.',
    type: 'website',
    siteName: 'Chess Kenya Grand Prix',
    url: 'https://1700chess.sh'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Chess Kenya Grand Prix',
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

interface HomePageProps {
  searchParams: {
    season?: string
  }
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams

  // Get available seasons
  const { seasons } = await getSeasons()
  const currentYear = new Date().getFullYear()
  const season = params.season ? Number(params.season) : (seasons[0] || currentYear)

  const tournaments = await getTournamentData(season)

  return (
    <div className="min-h-screen">
      <div className="container mx-auto sm:px-4 py-4 space-y-8 max-w-11xl">
        {upcomingTournaments.length > 0 && season === currentYear && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-bold tracking-tight text-gray-800">UPCOMING</h2>
                <span className="text-sm text-gray-400">{upcomingTournaments.length} {upcomingTournaments.length === 1 ? 'event' : 'events'}</span>
              </div>
              <SeasonSelector seasons={seasons} currentSeason={season} />
            </div>

            <div className="bg-white/95 rounded-lg shadow-elevation-low overflow-hidden">
              <div className="divide-y divide-gray-100">
                {upcomingTournaments.map((tournament, index) => {
                  if (!tournament.startDate || !tournament.endDate) return null

                  const detailHref =
                    typeof tournament.detailsUrl === 'string'
                      ? tournament.detailsUrl
                      : tournament.detailsUrl === undefined && /^\d+$/.test(tournament.id)
                        ? `/tournament/${tournament.id}`
                        : null

                  return (
                    <div
                      key={tournament.id}
                      className={`px-4 py-2 ${index === upcomingTournaments.length - 1 ? 'pb-4' : ''} ${index % 2 === 0 ? 'bg-white' : 'bg-gray-200/50'} hover:bg-gray-200 transition-colors`}>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          {detailHref ? (
                            <Link href={detailHref} className="text-sm text-blue-600 hover:text-blue-700 hover:underline underline-offset-4 font-medium">
                              {tournament.short_name || tournament.name}
                            </Link>
                          ) : (
                            <span className="text-sm text-blue-600 font-medium">
                              {tournament.short_name || tournament.name}
                            </span>
                          )}
                          <div className="mt-1.5 flex items-center gap-x-3 text-xs text-gray-500">
                            <span className="inline-flex items-center gap-1">
                              <span aria-hidden="true">📅</span>
                              {dayjs(tournament.startDate).format('MMM Do')}-{dayjs(tournament.endDate).format('Do')}
                            </span>
                            {tournament.rounds && (
                              <span className="inline-flex items-center gap-1">
                                <RotateCw className="h-3 w-3" aria-hidden="true" />
                                {tournament.rounds} rounds
                              </span>
                            )}
                          </div>
                          <div className="mt-1.5 flex items-center gap-1 text-xs text-gray-500 min-w-0">
                            <span aria-hidden="true">📍</span>
                            {tournament.locationUrl ? (
                              <a href={tournament.locationUrl} target="_blank" rel="noopener noreferrer" className="truncate hover:underline">{tournament.location}</a>
                            ) : (
                              <span className="truncate">{tournament.location}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-3">
                          <span className="inline-flex items-center rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
                            {formatTimeAway(tournament.startDate)}
                          </span>
                          {tournament.registrationUrl && (
                            <a
                              href={tournament.registrationUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 hover:border-blue-300 transition-colors">
                              Register
                              <ArrowRight className="h-3 w-3" aria-hidden="true" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        )}

        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-bold tracking-tight text-gray-800">COMPLETED</h2>
              <span className="text-sm text-gray-400">{tournaments.length} {tournaments.length === 1 ? 'event' : 'events'}</span>
            </div>
            {(upcomingTournaments.length === 0 || season !== currentYear) && (
              <SeasonSelector seasons={seasons} currentSeason={season} />
            )}
          </div>

          <TournamentTable tournaments={tournaments} />
        </section>

        {plannedTournaments.length > 0 && season === currentYear && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-sm font-bold tracking-tight text-gray-800">PLANNED</h2>
              <span className="text-sm text-gray-400">{plannedTournaments.length} {plannedTournaments.length === 1 ? 'event' : 'events'}</span>
            </div>

            <div className="bg-white/95 rounded-lg shadow-elevation-low overflow-hidden">
              <div className="divide-y divide-gray-100">
                {plannedTournaments.map((tournament, index) => {
                  const hasDates = Boolean(tournament.startDate && tournament.endDate)

                  const detailHref =
                    typeof tournament.detailsUrl === 'string'
                      ? tournament.detailsUrl
                      : tournament.detailsUrl === undefined && hasDates && /^\d+$/.test(tournament.id)
                        ? `/tournament/${tournament.id}`
                        : null

                  return (
                    <div
                      key={tournament.id}
                      className={`flex items-center justify-between px-4 py-3 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-200/50'} hover:bg-gray-200 transition-colors`}>
                      <div className="min-w-0">
                        {detailHref ? (
                          <Link href={detailHref} className="text-sm text-blue-600 hover:text-blue-700 hover:underline underline-offset-4 font-medium">
                            {tournament.short_name || tournament.name}
                          </Link>
                        ) : (
                          <span className="text-sm text-blue-600 font-medium">
                            {tournament.short_name || tournament.name}
                          </span>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {hasDates
                            ? `${dayjs(tournament.startDate!).format('MMM Do')}-${dayjs(tournament.endDate!).format('Do')}`
                            : tournament.month ?? 'TBA'}
                          <span className="mx-1.5">•</span>
                          {tournament.locationUrl ? (
                            <a href={tournament.locationUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">{tournament.location}</a>
                          ) : (
                            tournament.location
                          )}
                        </p>
                      </div>
                      <div className="flex-shrink-0 ml-4 text-xs text-gray-400">
                        TBC
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
