import Link from 'next/link'
import { getTournamentData } from '@/lib/tournament-data'
import { TournamentTable } from '@/components/tournament-table'
import { upcomingTournaments, plannedTournaments } from '@/lib/active-tournaments'
import dayjs from '@/lib/dayjs'
import { Metadata } from 'next'
import { SeasonSelector } from '@/components/season-selector'
import { getSeasons } from '@/services/api'
import { CalendarDays, MapPin, ArrowRight } from 'lucide-react'

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
    url: 'https://1700chess.vercel.app'
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
      <div className="container mx-auto px-3 sm:px-4 py-4 space-y-8 max-w-11xl">
        {upcomingTournaments.length > 0 && season === currentYear && (
          <section>
            <div className="flex items-center justify-between mb-4 gap-3">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-bold tracking-tight text-gray-800">UPCOMING</h2>
                <span className="text-sm text-gray-400">{upcomingTournaments.length} events</span>
              </div>
              <SeasonSelector seasons={seasons} currentSeason={season} className="h-10 px-4 text-base sm:h-auto sm:px-3 sm:text-sm" />
            </div>

            <div className="bg-white/95 border border-gray-200/80 rounded-xl shadow-sm overflow-hidden">
              <div className="divide-y divide-gray-200/70">
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
                      className={`px-4 py-3.5 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-slate-50 transition-colors`}>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                        {detailHref ? (
                          <Link href={detailHref} className="text-lg sm:text-sm text-blue-600 hover:text-blue-700 hover:underline underline-offset-4 font-semibold sm:font-medium leading-tight">
                            {tournament.short_name || tournament.name}
                          </Link>
                        ) : (
                          <span className="text-lg sm:text-sm text-blue-600 font-semibold sm:font-medium leading-tight">
                            {tournament.short_name || tournament.name}
                          </span>
                        )}
                        </div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm sm:text-xs text-gray-600">
                            <span className="inline-flex items-center gap-1.5">
                              <CalendarDays className="h-3.5 w-3.5 text-gray-500" />
                              {dayjs(tournament.startDate).format('MMM Do')}-{dayjs(tournament.endDate).format('Do')}
                            </span>
                            <span className="inline-flex items-center gap-1.5 min-w-0">
                              <MapPin className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                              <span className="truncate">{tournament.location}</span>
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end sm:items-end gap-3">
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                            {formatTimeAway(tournament.startDate)}
                          </span>
                          {tournament.registrationUrl && (
                            <a
                              href={tournament.registrationUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 hover:border-blue-300 transition-colors">
                              Register
                              <ArrowRight className="h-3.5 w-3.5" />
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
              <span className="text-sm text-gray-400">{tournaments.length} events</span>
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
              <span className="text-sm text-gray-400">{plannedTournaments.length} events</span>
            </div>

            <div className="bg-white/95 border border-gray-200/80 rounded-xl shadow-sm overflow-hidden">
              <div className="divide-y divide-gray-200/70">
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
                      className={`px-4 py-3.5 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-slate-50 transition-colors`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                        {detailHref ? (
                          <Link href={detailHref} className="text-lg sm:text-sm text-blue-600 hover:text-blue-700 hover:underline underline-offset-4 font-semibold sm:font-medium leading-tight">
                            {tournament.short_name || tournament.name}
                          </Link>
                        ) : (
                          <span className="text-lg sm:text-sm text-blue-600 font-semibold sm:font-medium leading-tight">
                            {tournament.short_name || tournament.name}
                          </span>
                        )}
                          <p className="text-sm sm:text-xs text-gray-600 mt-1">
                          {hasDates
                            ? `${dayjs(tournament.startDate!).format('MMM Do')}-${dayjs(tournament.endDate!).format('Do')}`
                            : tournament.month ?? 'TBA'}
                          <span className="mx-1.5">•</span>
                          {tournament.location}
                        </p>
                        </div>
                        <div className="flex-shrink-0 ml-4 text-xs font-medium text-gray-500 rounded-full bg-gray-100 px-2.5 py-1">
                          TBC
                        </div>
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
