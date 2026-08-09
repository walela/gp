import Link from 'next/link'
import { getTournamentData } from '@/lib/tournament-data'
import { TournamentTable } from '@/components/tournament-table'
import { upcomingTournaments, plannedTournaments, type Tournament } from '@/lib/active-tournaments'
import dayjs from '@/lib/dayjs'
import { Metadata } from 'next'
import { SeasonSelector } from '@/components/season-selector'
import { getSeasons } from '@/services/api'
import { TrackedLink } from '@/components/tracked-link'
import { formatTournamentDateCompact } from '@/utils/tournament'
import { ArrowRight, Diamond } from 'lucide-react'
import { CollapsibleSection } from '@/components/collapsible-section'

// Render HTML per request while allowing explicitly cached data fetches.
export const revalidate = 0

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
  const startDate = dayjs(startDateIso).startOf('day')
  const now = dayjs().startOf('day')
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

function getTournamentSortValue(tournament: Tournament) {
  if (tournament.startDate) return dayjs(tournament.startDate).valueOf()

  const monthMatch = tournament.month?.match(/^([A-Za-z]+)\s+(\d{4})$/)
  if (!monthMatch) return Number.MAX_SAFE_INTEGER

  const monthIndex = [
    'january',
    'february',
    'march',
    'april',
    'may',
    'june',
    'july',
    'august',
    'september',
    'october',
    'november',
    'december'
  ].indexOf(monthMatch[1].toLowerCase())

  if (monthIndex === -1) return Number.MAX_SAFE_INTEGER

  return new Date(Number(monthMatch[2]), monthIndex, 1).getTime()
}

function sortTournamentsBySchedule(tournaments: Tournament[]) {
  return [...tournaments].sort((a, b) => {
    const dateSort = getTournamentSortValue(a) - getTournamentSortValue(b)
    if (dateSort !== 0) return dateSort
    return a.name.localeCompare(b.name)
  })
}

// A tournament is "in progress" once its start day has arrived and its end day
// has not yet passed. Registration is closed at that point, so the button hides.
function isTournamentInProgress(tournament: Tournament) {
  if (!tournament.startDate || !tournament.endDate) return false
  const today = dayjs().startOf('day')
  const started = today.diff(dayjs(tournament.startDate).startOf('day'), 'day') >= 0
  const notEnded = dayjs(tournament.endDate).startOf('day').diff(today, 'day') >= 0
  return started && notEnded
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
  const nearTermTournamentIds = new Set(upcomingTournaments.map(tournament => tournament.id))
  const sortedActiveTournaments = sortTournamentsBySchedule([...upcomingTournaments, ...plannedTournaments])
  const sectionHeaderClassName =
    '-mx-3 mb-4 flex items-center justify-between border-y border-gray-200/80 bg-white/70 px-5 py-4 sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0'
  const sectionTitleClassName =
    'text-sm font-bold tracking-tight text-gray-800'

  return (
    <div className="min-h-screen">
      <div className="space-y-3 py-2 sm:space-y-8 sm:py-4">
        <div className="flex justify-end sm:hidden">
          <SeasonSelector seasons={seasons} currentSeason={season} />
        </div>

        {sortedActiveTournaments.length > 0 && season === currentYear && (
          <CollapsibleSection
            title={`UPCOMING (${sortedActiveTournaments.length})`}
            headerClassName={`${sectionHeaderClassName} !mb-0 gap-3`}
            titleClassName={sectionTitleClassName}
            trailing={
              <div className="hidden shrink-0 sm:block">
                <SeasonSelector seasons={seasons} currentSeason={season} />
              </div>
            }>
            <div className="pb-2 pt-3 sm:py-3">
              {sortedActiveTournaments.map((tournament, index) => {
                const hasDates = Boolean(tournament.startDate && tournament.endDate)
                const isNearTerm = nearTermTournamentIds.has(tournament.id)
                const monthLabel = tournament.startDate
                  ? dayjs(tournament.startDate).format('MMM').toUpperCase()
                  : tournament.month?.split(/\s+/)[0].slice(0, 3).toUpperCase() ?? 'TBA'
                const dayLabel = tournament.startDate ? dayjs(tournament.startDate).format('DD') : '—'
                const locationLabel = tournament.location === 'TBA' ? 'Venue TBA' : tournament.location

                const detailHref =
                  typeof tournament.detailsUrl === 'string'
                    ? tournament.detailsUrl
                    : tournament.detailsUrl === undefined && hasDates && /^\d+$/.test(tournament.id)
                      ? `/tournament/${tournament.id}`
                      : null

                return (
                  <div
                    key={tournament.id}
                    className="grid grid-cols-[3rem_minmax(0,1fr)] gap-x-1 sm:grid-cols-[4.5rem_minmax(0,1fr)]">
                    <div className="relative flex items-center justify-center">
                      {index === 0 && (
                        <Diamond className="absolute left-1/2 top-0 z-10 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 fill-blue-600 text-blue-600 drop-shadow-sm" aria-hidden="true" />
                      )}
                      <span className="absolute bottom-[calc(50%+1.375rem)] left-1/2 top-0 w-px -translate-x-1/2 bg-gray-400" aria-hidden="true" />
                      <span className="absolute bottom-0 left-1/2 top-[calc(50%+1.375rem)] w-px -translate-x-1/2 bg-gray-400" aria-hidden="true" />
                      {index === sortedActiveTournaments.length - 1 && (
                        <Diamond className="absolute bottom-0 left-1/2 z-10 h-2.5 w-2.5 -translate-x-1/2 translate-y-1/2 fill-blue-600 text-blue-600 drop-shadow-sm" aria-hidden="true" />
                      )}
                      <time
                        dateTime={tournament.startDate}
                        className="relative z-10 flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-400 bg-transparent text-gray-600">
                        <span className="flex max-w-full flex-col items-center text-[9px] font-medium leading-none">
                          <span>{monthLabel}</span>
                          <span className="mt-1 text-sm tabular-nums">{dayLabel}</span>
                        </span>
                      </time>
                    </div>

                    <div className="my-1.5 min-w-0 rounded-lg bg-white/95 px-4 py-4 shadow-elevation-low">
                      <div className="flex min-w-0 items-center justify-between gap-3">
                        <div className="min-w-0">
                          {detailHref ? (
                            <Link href={detailHref} className="text-sm font-medium text-blue-600 underline-offset-4 hover:text-blue-700 hover:underline sm:text-base">
                              {tournament.short_name || tournament.name}
                            </Link>
                          ) : (
                            <span className="text-sm font-medium text-blue-600 sm:text-base">
                              {tournament.short_name || tournament.name}
                            </span>
                          )}
                        </div>

                        <div className="flex-shrink-0 text-xs font-medium">
                          {tournament.status === 'postponed' ? (
                            <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">Postponed</span>
                          ) : isNearTerm || tournament.confirmed ? (
                            <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-green-700">Confirmed</span>
                          ) : (
                            <span className="text-gray-400">TBC</span>
                          )}
                        </div>
                      </div>

                      <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
                        <span aria-hidden="true">📅</span>
                        {hasDates
                          ? formatTournamentDateCompact(tournament.startDate, tournament.endDate)
                          : tournament.month?.replace(/\s+\d{4}$/, '') ?? 'TBA'}
                      </p>
                      <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-gray-500">
                        <span className="shrink-0" aria-hidden="true">📍</span>
                        {tournament.locationUrl ? (
                          <a href={tournament.locationUrl} target="_blank" rel="noopener noreferrer" className="truncate hover:underline">
                            {locationLabel}
                          </a>
                        ) : <span className="truncate">{locationLabel}</span>}
                      </p>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        {tournament.startDate && (
                          <span className="inline-flex items-center rounded-full border border-gray-300 bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                            {formatTimeAway(tournament.startDate)}
                          </span>
                        )}
                        {tournament.registrationUrl && !isTournamentInProgress(tournament) && (
                          <TrackedLink
                            event="Register click"
                            href={tournament.registrationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-auto inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 transition-colors hover:border-blue-300 hover:bg-blue-100">
                            Register
                            <ArrowRight className="h-3 w-3" aria-hidden="true" />
                          </TrackedLink>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CollapsibleSection>
        )}

        <section>
          <div className={sectionHeaderClassName}>
            <h2 className={sectionTitleClassName}>COMPLETED ({tournaments.length})</h2>
            {(sortedActiveTournaments.length === 0 || season !== currentYear) && (
              <div className="hidden sm:block">
                <SeasonSelector seasons={seasons} currentSeason={season} />
              </div>
            )}
          </div>

          <TournamentTable tournaments={tournaments} />
        </section>
      </div>
    </div>
  )
}
