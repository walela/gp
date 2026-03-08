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
import { ViewSelector } from '@/components/rankings/view-selector'
import { SearchForm } from '@/components/rankings/search-form'
import { Pagination } from '@/components/ui/pagination'
import { SeasonSelector } from '@/components/season-selector'
import { CategoryToggle } from '@/components/category-toggle'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Player Rankings - Chess Kenya Grand Prix',
  description: 'View the latest Chess Kenya Grand Prix rankings and standings. Track player performance across tournaments with TPR ratings and points.',
  openGraph: {
    title: 'Chess Kenya Grand Prix Rankings',
    description: 'Official rankings for the Chess Kenya Grand Prix series. View top players, tournament performances and TPR ratings.',
    type: 'website',
    siteName: 'Chess Kenya Grand Prix',
    url: 'https://1700chess.sh/rankings'
  },
  twitter: {
    card: 'summary',
    title: 'Chess Kenya GP Rankings',
    description: 'View the latest Chess Kenya Grand Prix player rankings and standings'
  }
}

export const dynamic = 'force-dynamic'

// Smart name abbreviation function for very long names
function getDisplayName(fullName: string): string {
  // If name is reasonably short, return as-is
  if (fullName.length <= 22) {
    return fullName
  }

  // For very long names, abbreviate only the last word
  const parts = fullName.trim().split(' ')
  if (parts.length >= 2) {
    // Keep everything except the last part, then abbreviate the last part
    const allButLast = parts.slice(0, -1).join(' ')
    const lastPart = parts[parts.length - 1]

    return `${allButLast} ${lastPart.charAt(0)}.`
  }

  // Single name that's too long - just truncate
  return fullName.substring(0, 20) + '...'
}

function getRankMovement(player: PlayerRanking): {
  label: string
  className: string
  ariaLabel: string
} | null {
  const change = player.rank_change ?? null
  const isNew = player.is_new ?? false

  if (isNew) {
    return {
      label: 'NEW',
      className: 'bg-cyan-100 text-cyan-700',
      ariaLabel: 'New entrant in top rankings'
    }
  }

  if (change === null) {
    return null
  }

  if (change > 0) {
    return {
      label: `↑${change}`,
      className: 'bg-green-100 text-green-700',
      ariaLabel: `Moved up ${change} ${change === 1 ? 'spot' : 'spots'}`
    }
  }

  const magnitude = Math.abs(change)
  if (magnitude === 0) {
    return {
      label: '-',
      className: 'text-gray-500',
      ariaLabel: 'No change in ranking'
    }
  }

  return {
    label: `↓${magnitude}`,
    className: 'bg-red-100 text-red-700',
    ariaLabel: `Moved down ${magnitude} ${magnitude === 1 ? 'spot' : 'spots'}`
  }
}

interface RankingsPageProps {
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

export default async function RankingsPage({ searchParams }: RankingsPageProps) {
  // Properly await the searchParams object
  const params = await searchParams

  // Get available seasons first to determine defaults
  const { seasons } = await getSeasons()
  const currentYear = new Date().getFullYear()
  const season = params.season ? Number(params.season) : (seasons[0] || currentYear)

  // Default to best_2 for current year, best_4 for past seasons
  const defaultSort = season === currentYear ? 'best_2' : 'best_4'

  const sort = params.sort || defaultSort
  const dir = params.dir || 'desc'
  const page = Number(params.page || '1')
  const view = params.view || defaultSort
  const search = params.q || ''
  const category = params.category || 'open'
  const gender = category === 'ladies' ? 'f' as const : undefined

  const highlightCount = 9
  const topPlayersFetchCount = highlightCount + 3

  // Main table data request.
  const rankingsPromise = getRankings({
    sort,
    dir,
    page,
    q: search,
    season,
    gender
  })

  // Top-player request used for qualifier highlighting.
  // Avoid duplicate fetch when the current page already has the required ordering.
  const canReuseCurrentRankingsForTopPlayers = sort === defaultSort && dir === 'desc' && page === 1 && !search
  const topPlayersPromise = canReuseCurrentRankingsForTopPlayers
    ? null
    : getRankings({
        sort: defaultSort,
        dir: 'desc',
        page: 1,
        season,
        gender
      })

  const [rankingsData, topPlayersData] = await Promise.all([
    rankingsPromise,
    topPlayersPromise
  ])
  const { rankings, total_pages } = rankingsData
  const topPlayers = (topPlayersData?.rankings ?? rankings).slice(0, topPlayersFetchCount)

  // Season-specific qualifier config: Kenya #1 and Junior Champion FIDE IDs
  const qualifierConfig: Record<number, Record<string, { kenyaNumber1?: string; juniorChampion?: string }>> = {
    2025: {
      open: { kenyaNumber1: '10814647', juniorChampion: '10831533' },    // McCligeyo, Kyle Kuka
      ladies: { kenyaNumber1: '10802886', juniorChampion: '10822755' },  // Ndirangu (Joyce), Cassidy Maina
    },
    2026: {
      open: { kenyaNumber1: '10814582' },   // Kaloki Hawi
      ladies: { kenyaNumber1: '10814922' },  // Mutisya, Jully
    }
  }

  const seasonConfig = qualifierConfig[season]?.[category]
  const kenyaNumber1Id = seasonConfig?.kenyaNumber1 ?? null
  const juniorChampionId = seasonConfig?.juniorChampion ?? null

  // Count how many "special" qualifiers (Kenya #1, junior champ) fall inside the top 9
  // Each one frees up a spot for the next player
  const topPlayerIds = topPlayers.map(p => p.fide_id || p.name)
  const specialInTop9 = [kenyaNumber1Id, juniorChampionId].filter(id =>
    id && topPlayerIds.slice(0, highlightCount).includes(id)
  ).length
  const effectiveHighlightCount = highlightCount + specialInTop9

  const automaticQualifierIds = new Set(
    topPlayers.slice(0, effectiveHighlightCount).map(player => player.fide_id || player.name)
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
        <SearchForm defaultValue={search} />
      </div>

      <div className="mb-0 w-full">
        <ViewSelector
          view={view}
          exportUrl={`${process.env.NEXT_PUBLIC_API_URL || 'https://gp-tracker-hidden-rain-8594.fly.dev/api'}/rankings/export?sort=${sort}&dir=${dir}&season=${season}${gender ? `&gender=${gender}` : ''}${search ? `&q=${encodeURIComponent(search)}` : ''}`}
          exportFilename={`GP_${category}_rankings_${season}${search ? `_search_${search.replace(' ', '_')}` : ''}_by_${sort}.csv`}
        />
      </div>

      <Card
        className={cn(
          'w-full border-0 rounded-b-lg bg-white/95 p-0 gap-0 shadow-elevation-low',
          'sm:rounded-tr-lg'
        )}>
        <CustomTable className="h-full">
          <CustomTableHeader>
            <CustomTableRow>
              <CustomTableHead className="w-[36px] text-right">
                <SortableHeader column="rank" label="Rank" basePath="/rankings" className="w-full hidden sm:block" />
                <SortableHeader column="rank" label="#" basePath="/rankings" className="w-full sm:hidden" />
              </CustomTableHead>
              <CustomTableHead className="min-w-[108px] sm:min-w-[140px]">
                <SortableHeader column="name" label="Name" basePath="/rankings" className="w-full" />
              </CustomTableHead>
              {season !== currentYear && (
                <>
                  <CustomTableHead className="w-[40px] text-center sm:hidden">
                    <span className="sr-only">Qualified</span>
                  </CustomTableHead>
                  <CustomTableHead className="w-[40px] text-center hidden sm:table-cell">
                    Qualified
                  </CustomTableHead>
                </>
              )}
              <CustomTableHead className="hidden sm:table-cell text-right">
                <SortableHeader
                  column="tournaments_played"
                  label="Tournaments"
                  align="right"
                  basePath="/rankings"
                  className="w-full"
                />
              </CustomTableHead>
              <CustomTableHead className={cn('text-right', view === 'best_1' ? 'table-cell' : 'hidden md:table-cell')}>
                <SortableHeader column="best_1" label="Best TPR" align="right" basePath="/rankings" className="w-full" />
              </CustomTableHead>
              <CustomTableHead className={cn('text-right', view === 'best_2' ? 'table-cell' : 'hidden md:table-cell')}>
                <SortableHeader column="best_2" label="Best 2" align="right" basePath="/rankings" className="w-full" />
              </CustomTableHead>
              <CustomTableHead className={cn('text-right', view === 'best_3' ? 'table-cell' : 'hidden md:table-cell')}>
                <SortableHeader column="best_3" label="Best 3" align="right" basePath="/rankings" className="w-full" />
              </CustomTableHead>
              <CustomTableHead className={cn('text-right', view === 'best_4' ? 'table-cell' : 'hidden md:table-cell')}>
                <SortableHeader column="best_4" label="Best 4" align="right" basePath="/rankings" className="w-full" />
              </CustomTableHead>
            </CustomTableRow>
          </CustomTableHeader>
          <CustomTableBody>
            {rankings.length === 0 ? (
              <CustomTableRow>
                <CustomTableCell colSpan={9} className="text-center py-12">
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

                const isDefinitelyQualified = isKenyaNumber1 || isJuniorChampion
                const hasQualified = isHighlightedQualifier || isDefinitelyQualified
                const movement = view === 'best_4' ? getRankMovement(player) : null
                const movementBadge = !hasQualified && movement ? (
                  <span
                    aria-label={movement.ariaLabel}
                    className={cn(
                      'rounded-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
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
                            <span className="sm:hidden flex items-center gap-1">
                              {getDisplayName(player.name)}
                              <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:text-blue-500 transition-colors" aria-hidden="true" />
                            </span>
                            <span className="hidden sm:flex items-center gap-2 group-hover:underline">
                              {getDisplayName(player.name)}
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
                    {season !== currentYear && (
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
              basePath="/rankings"
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
