import Link from 'next/link'
import { Card } from '@/components/ui/card'
import {
  CustomTable,
  CustomTableHeader,
  CustomTableBody,
  CustomTableRow,
  CustomTableHead,
  CustomTableCell
} from '@/components/ui/custom-table'
import { SortableHeader } from '@/components/rankings/sortable-header'

import { Baby, ChevronRight, Crown } from 'lucide-react'
import { getRankings, getSeasons, type PlayerRanking } from '@/services/api'
import { cn } from '@/lib/utils'
import { getDisplayName, getRankMovement } from '@/components/rankings/utils'
import { forecastMatchesResults, getCategoryForecast } from '@/lib/qualification-forecast'
import { TIER_LABEL, chanceTier, formatChance, type ForecastEntry } from '@/lib/qualification-odds'
import { ViewSelector } from '@/components/rankings/view-selector'
import { SearchForm } from '@/components/rankings/search-form'
import { Pagination } from '@/components/ui/pagination'
import { SeasonSelector } from '@/components/season-selector'
import { CategoryToggle } from '@/components/category-toggle'
import { getQualifierConfig } from '@/lib/qualifiers'
import { Metadata } from 'next'
import { pageMetadata, SITE_NAME } from '@/lib/site'
import { redirect } from 'next/navigation'

export async function generateMetadata({ searchParams }: RankingsPageProps): Promise<Metadata> {
  const { category, season } = await searchParams
  const ladies = category === 'ladies'
  const query = new URLSearchParams()
  if (ladies) query.set('category', 'ladies')
  if (season) query.set('season', season)
  const path = query.size > 0 ? `/?${query}` : '/'
  const label = `${season ? `${season} ` : ''}${ladies ? 'Ladies' : 'Open'} Rankings`
  return pageMetadata({
    title: ladies || season ? label : SITE_NAME,
    description: ladies
      ? 'Ladies standings for the Chess Kenya Grand Prix, ranked by each player\'s best four tournament performances.'
      : 'Open standings for the Chess Kenya Grand Prix, ranked by each player\'s best four tournament performances.',
    path,
  })
}

// Render HTML per request while allowing explicitly cached data fetches.
export const revalidate = 0

function QualifyingOdds({ entry, excluded }: { entry?: ForecastEntry, excluded: boolean }) {
  if (excluded) {
    return <span className="text-gray-400" title="Not eligible to qualify">—</span>
  }
  if (entry?.status === 'kenya1') {
    return <span title="Qualifies as Kenya #1">Qualified</span>
  }
  if (entry?.status === 'junior_champion') {
    return <span title="Qualifies as national junior champion">Qualified</span>
  }
  if (entry?.p == null) {
    return <span className="text-gray-400" title="Not a contender in the forecast">—</span>
  }
  return <span title={TIER_LABEL[chanceTier(entry.p)]}>{formatChance(entry.p)}</span>
}

const PAGE_SIZE = 25

// Players without odds stay last in either direction, in the order they arrived (Best 4).
function sortByOdds(
  players: PlayerRanking[],
  odds: Record<string, ForecastEntry> | null,
  excludedIds: Set<string>,
  dir: 'asc' | 'desc'
): PlayerRanking[] {
  const oddsValue = (player: PlayerRanking): number | null => {
    const entry = player.fide_id ? odds?.[player.fide_id] : undefined
    if (!entry || excludedIds.has(player.fide_id || player.name)) return null
    if (entry.status !== 'forecast') return 2
    return entry.p ?? null
  }
  return players
    .map((player, index) => ({ player, index, value: oddsValue(player) }))
    .sort((a, b) => {
      if (a.value === null || b.value === null) {
        if (a.value === b.value) return a.index - b.index
        return a.value === null ? 1 : -1
      }
      return (dir === 'asc' ? a.value - b.value : b.value - a.value) || a.index - b.index
    })
    .map(({ player }) => player)
}

export interface RankingsPageProps {
  searchParams: {
    sort?: string
    dir?: 'asc' | 'desc'
    page?: string
    view?: string
    q?: string
    season?: string
    category?: 'open' | 'ladies'
  }
}

export async function RankingsPageContent({ searchParams }: RankingsPageProps) {
  // Properly await the searchParams object
  const params = await searchParams

  // Get available seasons first to determine defaults
  const { seasons } = await getSeasons()
  const currentYear = new Date().getFullYear()
  const season = params.season ? Number(params.season) : (seasons[0] || currentYear)
  const isCurrentSeason = season === currentYear

  const defaultSort = 'best_4'
  const qualifierSort = 'best_4'

  const sort = params.sort || defaultSort
  const dir = params.dir || 'desc'
  const page = Number(params.page || '1')
  const view = params.view || defaultSort
  const search = params.q || ''
  const category = params.category || 'open'
  const gender = category === 'ladies' ? 'f' as const : undefined
  const rankingsBasePath = '/'

  const highlightCount = 9
  const topPlayersFetchCount = highlightCount + 3

  // The first unfiltered Best 4 page already contains the qualifier leaders.
  // Other views ask the same API response to include a compact top-12 list,
  // avoiding a second full rankings request and duplicate database work.
  const canReuseCurrentRankingsForTopPlayers = sort === qualifierSort && dir === 'desc' && page === 1 && !search

  // The API doesn't know the forecast, so odds sorting fetches everyone in Best 4 order and pages here.
  const sortsByOdds = sort === 'odds'

  const [rankingsData, forecastCurrent] = await Promise.all([
    getRankings({
      sort: sortsByOdds ? defaultSort : sort,
      dir: sortsByOdds ? 'desc' : dir,
      page: sortsByOdds ? 1 : page,
      q: search,
      season,
      gender,
      includeTop: !canReuseCurrentRankingsForTopPlayers,
      all: sortsByOdds
    }),
    forecastMatchesResults(season),
  ])
  const odds = getCategoryForecast(category, season, forecastCurrent)

  const seasonConfig = getQualifierConfig(season, category)
  const kenyaNumber1Id = seasonConfig?.kenyaNumber1 ?? null
  // Until the deciding FIDE list is out, Kenya #1 is only the current leader and still has odds.
  const kenyaNumber1Pending = Boolean(seasonConfig?.kenyaNumber1List) &&
    (!kenyaNumber1Id || odds?.[kenyaNumber1Id]?.status !== 'kenya1')
  const juniorChampionId = seasonConfig?.juniorChampion ?? null
  const qualifierExcludedIds = new Set(seasonConfig?.excluded ?? [])

  const oddsSorted = sortsByOdds ? sortByOdds(rankingsData.rankings, odds, qualifierExcludedIds, dir) : null
  const rankings = oddsSorted ? oddsSorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) : rankingsData.rankings
  const total_pages = oddsSorted ? Math.ceil(oddsSorted.length / PAGE_SIZE) : rankingsData.total_pages
  const topPlayers = (rankingsData.top_rankings ?? rankings).slice(0, topPlayersFetchCount)
  const exportSort = sortsByOdds ? defaultSort : sort
  const exportDir = sortsByOdds ? 'desc' : dir
  const eligibleTopPlayers = topPlayers.filter(player =>
    !qualifierExcludedIds.has(player.fide_id || player.name)
  )

  // Count how many "special" qualifiers (Kenya #1, junior champ) fall inside the top 9
  // Each one frees up a spot for the next player
  const topPlayerIds = eligibleTopPlayers.map(p => p.fide_id || p.name)
  const specialInTop9 = [kenyaNumber1Pending ? null : kenyaNumber1Id, juniorChampionId].filter(id =>
    id && topPlayerIds.slice(0, highlightCount).includes(id)
  ).length
  const effectiveHighlightCount = highlightCount + specialInTop9

  const automaticQualifierIds = new Set(
    eligibleTopPlayers.slice(0, effectiveHighlightCount).map(player => player.fide_id || player.name)
  )

  // For past seasons, no provisional - results are final
  const provisionalQualifierId = null

  const highlightedQualifierIds = new Set(automaticQualifierIds)
  if (provisionalQualifierId) {
    highlightedQualifierIds.add(provisionalQualifierId)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <CategoryToggle currentCategory={category} currentSeason={season} />
          <div className="flex-1" />
          <SeasonSelector
            seasons={seasons}
            currentSeason={season}
          />
        </div>
        <SearchForm defaultValue={search} basePath={rankingsBasePath} />
      </div>

      <div className="mb-0 w-full">
        <ViewSelector
          view={view}
          basePath={rankingsBasePath}
          exportUrl={`${process.env.NEXT_PUBLIC_API_URL || 'https://gp-tracker-hidden-rain-8594.fly.dev/api'}/rankings/export?sort=${exportSort}&dir=${exportDir}&season=${season}${gender ? `&gender=${gender}` : ''}${search ? `&q=${encodeURIComponent(search)}` : ''}`}
          exportFilename={`GP_${category}_rankings_${season}${search ? `_search_${search.replace(' ', '_')}` : ''}_by_${exportSort}.csv`}
        />
      </div>

      <Card
        className={cn(
          'w-full border-0 rounded-b-lg bg-white/95 p-0 gap-0 shadow-elevation-low',
          'sm:rounded-tr-lg'
        )}>
        <CustomTable
          className={cn(
            'h-full',
            'md:[&_td]:px-4 md:[&_th]:px-4 lg:[&_td]:px-3 lg:[&_th]:px-3 xl:[&_td]:px-6 xl:[&_th]:px-6'
          )}>
          <CustomTableHeader>
            <CustomTableRow>
              <CustomTableHead className="w-[36px] text-right">
                <SortableHeader column="rank" label="Rank" basePath={rankingsBasePath} className="w-full hidden sm:block" />
                <SortableHeader column="rank" label="#" basePath={rankingsBasePath} className="w-full sm:hidden" />
              </CustomTableHead>
              <CustomTableHead className="min-w-[108px] sm:min-w-[140px]">
                <SortableHeader column="name" label="Name" basePath={rankingsBasePath} className="w-full" />
              </CustomTableHead>
              <CustomTableHead className="w-[40px] text-center sm:hidden">
                <span className="sr-only">{isCurrentSeason ? 'Change' : 'Qualified'}</span>
              </CustomTableHead>
              <CustomTableHead className="w-[40px] text-center hidden sm:table-cell">
                {isCurrentSeason ? 'Change' : 'Qualified'}
              </CustomTableHead>
              <CustomTableHead className="hidden sm:table-cell text-right">
                <SortableHeader
                  column="tournaments_played"
                  label="Tournaments"
                  align="right"
                  basePath={rankingsBasePath}
                  className="w-full"
                />
              </CustomTableHead>
              <CustomTableHead className={cn('text-right', view === 'best_1' ? 'table-cell' : 'hidden md:table-cell')}>
                <SortableHeader column="best_1" label="Best TPR" align="right" basePath={rankingsBasePath} className="w-full" />
              </CustomTableHead>
              <CustomTableHead className={cn('text-right', view === 'best_2' ? 'table-cell' : 'hidden md:table-cell')}>
                <SortableHeader column="best_2" label="Best 2" align="right" basePath={rankingsBasePath} className="w-full" />
              </CustomTableHead>
              <CustomTableHead className={cn('text-right', view === 'best_3' ? 'table-cell' : 'hidden md:table-cell')}>
                <SortableHeader column="best_3" label="Best 3" align="right" basePath={rankingsBasePath} className="w-full" />
              </CustomTableHead>
              <CustomTableHead className={cn('text-right', view === 'best_4' ? 'table-cell' : 'hidden md:table-cell')}>
                <SortableHeader column="best_4" label="Best 4" align="right" basePath={rankingsBasePath} className="w-full" />
              </CustomTableHead>
              {odds && (
                <CustomTableHead className="hidden lg:table-cell text-right">
                  <SortableHeader
                    column="odds"
                    label="Qualifying odds"
                    align="right"
                    basePath={rankingsBasePath}
                    className="w-full whitespace-normal"
                  />
                </CustomTableHead>
              )}
            </CustomTableRow>
          </CustomTableHeader>
          <CustomTableBody>
            {rankings.length === 0 ? (
              <CustomTableRow>
                <CustomTableCell colSpan={10} className="text-center py-12">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                      <Crown className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="font-medium">No players found</p>
                      <p className="text-sm">{search ? `No results for "${search}"` : 'No players available'}</p>
                    </div>
                  </div>
                </CustomTableCell>
              </CustomTableRow>
            ) : (
              rankings.map((player, index) => {
                const playerId = player.fide_id || player.name
                const isKenyaNumber1 = kenyaNumber1Id ? playerId === kenyaNumber1Id : false
                const isAutomaticQualifier = automaticQualifierIds.has(playerId)
                const isProvisionalQualifier = provisionalQualifierId === playerId
                const isHighlightedQualifier = highlightedQualifierIds.has(playerId)
                const isJuniorChampion = juniorChampionId !== null && player.fide_id === juniorChampionId
                const tableRank = (page - 1) * 25 + index + 1

                const isDefinitelyQualified = (isKenyaNumber1 && !kenyaNumber1Pending) || isJuniorChampion
                const hasQualified = isHighlightedQualifier || isDefinitelyQualified
                const movement = view === 'best_4' ? getRankMovement(player) : null
                const movementBadge = (isCurrentSeason || !hasQualified) && movement ? (
                  <span
                    data-rank-movement
                    aria-label={movement.ariaLabel}
                    className={cn(
                      'rounded-sm px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wide',
                      movement.className
                    )}>
                    {movement.label}
                  </span>
                ) : null
                const qualifierBadgeMobile = hasQualified ? (
                  <span
                    className={cn(
                      'inline-block rounded-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase',
                      isProvisionalQualifier && !isDefinitelyQualified
                        ? 'bg-teal-100 text-teal-700'
                        : 'bg-green-100 text-green-700'
                    )}>
                    {isProvisionalQualifier && !isDefinitelyQualified ? '?' : 'Q'}
                  </span>
                ) : null
                const qualifierBadgeDesktop = hasQualified ? (
                  isProvisionalQualifier && !isDefinitelyQualified ? (
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-teal-600 bg-teal-50 text-[11px] font-semibold text-teal-700">
                      ?
                    </span>
                  ) : (
                    <span className="inline-flex h-5 items-center justify-center rounded-full border border-green-600 bg-green-50 px-2 text-[11px] font-semibold leading-tight text-green-700">
                      Q
                    </span>
                  )
                ) : null

                return (
                  <CustomTableRow
                    key={playerId}
                    className={cn(
                      isKenyaNumber1
                        ? 'bg-amber-50/50 border-l-2 border-l-amber-500 hover:bg-amber-100/50'
                        : isJuniorChampion
                          ? 'bg-cyan-50/70 border-l-2 border-l-cyan-500 hover:bg-cyan-100'
                          : isProvisionalQualifier
                            ? 'bg-teal-50/80 border-l-2 border-l-teal-600 hover:bg-teal-100'
                            : isAutomaticQualifier
                              ? 'bg-blue-50/70 border-l-2 border-l-blue-600 hover:bg-blue-100'
                              : index % 2 === 0
                                ? 'bg-gray-50/50 hover:bg-gray-100/50'
                                : 'bg-white hover:bg-gray-50/50'
                    )}>
                    <CustomTableCell isHeader className="text-right">
                      {isKenyaNumber1 ? (
                        <div className="flex items-center justify-end gap-1">
                          <Crown className="h-3 w-3 text-amber-600" aria-hidden="true" />
                          <span className="font-semibold text-amber-700">{tableRank}</span>
                        </div>
                      ) : isJuniorChampion ? (
                        <div className="flex items-center justify-end gap-1">
                          <Baby className="h-3.5 w-3.5 text-cyan-600" aria-hidden="true" />
                          <span className="font-semibold text-cyan-700">{tableRank}</span>
                        </div>
                      ) : isProvisionalQualifier ? (
                        <span className="font-semibold text-teal-700">{tableRank}</span>
                      ) : isAutomaticQualifier ? (
                        <span className="font-semibold text-blue-700">{tableRank}</span>
                      ) : (
                        tableRank
                      )}
                    </CustomTableCell>
                    <CustomTableCell>
                      <div className="truncate">
                        {player.fide_id ? (
                          <Link
                            href={`/player/${player.fide_id}${category === 'ladies' ? '?gender=f' : ''}`}
                            className={cn(
                              'font-medium group flex items-center gap-2',
                              isKenyaNumber1
                                ? 'text-amber-700 hover:text-amber-800'
                                : isJuniorChampion
                                  ? 'text-cyan-700 hover:text-cyan-800'
                                  : isProvisionalQualifier
                                    ? 'text-teal-700 hover:text-teal-800'
                                    : isAutomaticQualifier
                                      ? 'text-blue-700 hover:text-blue-800'
                                      : 'text-blue-600 hover:text-blue-700'
                            )}
                            title={player.name}>
                            <span className="flex items-center gap-1 sm:gap-2 sm:group-hover:underline">
                              {getDisplayName(player.name)}
                              <ChevronRight
                                className="h-3 w-3 text-muted-foreground transition-colors group-hover:text-blue-500 sm:hidden"
                                aria-hidden="true"
                              />
                            </span>
                          </Link>
                        ) : (
                          <span
                            className={cn(
                              'font-medium flex items-center gap-2',
                              isKenyaNumber1
                                ? 'text-amber-700'
                                : isJuniorChampion
                                  ? 'text-cyan-700'
                                  : isProvisionalQualifier
                                    ? 'text-teal-700'
                                    : isAutomaticQualifier
                                      ? 'text-blue-700'
                                      : ''
                            )}
                            title={player.name}>
                            {getDisplayName(player.name)}
                          </span>
                        )}
                      </div>
                    </CustomTableCell>
                    {isCurrentSeason ? (
                      <>
                        <CustomTableCell className="text-center sm:hidden">
                          {movementBadge}
                        </CustomTableCell>
                        <CustomTableCell className="hidden sm:table-cell text-center">
                          {movementBadge}
                        </CustomTableCell>
                      </>
                    ) : (
                      <>
                        <CustomTableCell className="text-center sm:hidden">
                          {movementBadge || qualifierBadgeMobile ? (
                            <div className="flex items-center justify-center gap-1">
                              {qualifierBadgeMobile || movementBadge}
                            </div>
                          ) : null}
                        </CustomTableCell>
                        <CustomTableCell className="hidden sm:table-cell text-center">
                          {movementBadge || qualifierBadgeDesktop ? (
                            <div className="flex items-center justify-center gap-1">
                              {qualifierBadgeDesktop || movementBadge}
                            </div>
                          ) : null}
                        </CustomTableCell>
                      </>
                    )}
                    <CustomTableCell className="hidden sm:table-cell text-right tabular-nums">
                      {player.tournaments_played}
                    </CustomTableCell>
                    <CustomTableCell
                      className={cn('text-right tabular-nums', view === 'best_1' ? 'table-cell' : 'hidden md:table-cell')}>
                      <div className="tabular-nums font-medium">{player.best_1 || '—'}</div>
                    </CustomTableCell>
                    <CustomTableCell
                      className={cn('text-right tabular-nums', view === 'best_2' ? 'table-cell' : 'hidden md:table-cell')}>
                      {player.tournaments_played >= 2 ? player.best_2 : <span className="text-gray-400">—</span>}
                    </CustomTableCell>
                    <CustomTableCell
                      className={cn('text-right tabular-nums', view === 'best_3' ? 'table-cell' : 'hidden md:table-cell')}>
                      {player.tournaments_played >= 3 ? player.best_3 : <span className="text-gray-400">—</span>}
                    </CustomTableCell>
                    <CustomTableCell
                      className={cn('text-right tabular-nums', view === 'best_4' ? 'table-cell' : 'hidden md:table-cell')}>
                      {player.tournaments_played >= 4 ? (
                        isHighlightedQualifier ? (
                          <span className={cn('font-semibold', isProvisionalQualifier ? 'text-teal-700' : 'text-blue-700')}>
                            {player.best_4}
                          </span>
                        ) : (
                          player.best_4
                        )
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </CustomTableCell>
                    {odds && (
                      <CustomTableCell className="hidden lg:table-cell text-right tabular-nums whitespace-nowrap">
                        <QualifyingOdds
                          entry={player.fide_id ? odds[player.fide_id] : undefined}
                          excluded={qualifierExcludedIds.has(playerId)}
                        />
                      </CustomTableCell>
                    )}
                  </CustomTableRow>
                )
              })
            )}
          </CustomTableBody>
        </CustomTable>

        {season !== currentYear && (
          <div className="border-t border-gray-200 bg-gray-50/80">
            <div className="px-3 py-2.5 flex items-center gap-2 text-xs font-medium overflow-x-auto">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-700 whitespace-nowrap">
                <Crown className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
                FIDE #1
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-cyan-700 whitespace-nowrap">
                <Baby className="h-3.5 w-3.5 text-cyan-600" aria-hidden="true" />
                Junior Champ
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-green-700 whitespace-nowrap">
                <span className="font-semibold">Q</span>
                Qualified
              </span>
            </div>
          </div>
        )}

        {total_pages > 1 && (
          <div className="border-t border-gray-200 py-3">
            <Pagination
              currentPage={page}
              totalPages={total_pages}
              basePath={rankingsBasePath}
              queryParams={{
                sort,
                dir,
                view,
                season: season.toString(),
                ...(category !== 'open' ? { category } : {}),
                ...(search ? { q: search } : {})
              }}
            />
          </div>
        )}
      </Card>
    </div>
  )
}

export default async function LegacyRankingsPage({ searchParams }: RankingsPageProps) {
  const params = await searchParams
  const query = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value)
  })

  redirect(query.size > 0 ? `/?${query.toString()}` : '/')
}
