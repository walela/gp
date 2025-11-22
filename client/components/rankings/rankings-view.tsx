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
import { ViewSelector } from '@/components/rankings/view-selector'
import { SearchForm } from '@/components/rankings/search-form'
import { Pagination } from '@/components/ui/pagination'
import { CircleCheckBig, ChevronRight, Crown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PlayerRanking } from '@/services/api'
import { getDisplayName, getRankMovement } from '@/components/rankings/utils'

interface QualifierConfig {
  kenyaNumber1Id?: string | null
  automaticQualifierIds?: Set<string>
  provisionalQualifierId?: string | null
  alternateQualifierIds?: Set<string>
  highlightedQualifierIds?: Set<string>
  juniorChampionMatcher?: (player: PlayerRanking) => boolean
  showLegend?: boolean
}

interface RankingsViewProps {
  basePath: string
  rankings: PlayerRanking[]
  sort: string
  dir: 'asc' | 'desc'
  page: number
  view: string
  search: string
  totalPages: number
  exportUrl: string
  exportFilename: string
  qualifierConfig?: QualifierConfig
  searchPlaceholder?: string
}

export function RankingsView({
  basePath,
  rankings,
  sort,
  dir,
  page,
  view,
  search,
  totalPages,
  exportUrl,
  exportFilename,
  qualifierConfig,
  searchPlaceholder
}: RankingsViewProps) {
  const automaticQualifierIds = qualifierConfig?.automaticQualifierIds ?? new Set<string>()
  const highlightedQualifierIds = qualifierConfig?.highlightedQualifierIds ?? new Set<string>()
  const provisionalQualifierId = qualifierConfig?.provisionalQualifierId ?? null
  const alternateQualifierIds = qualifierConfig?.alternateQualifierIds ?? new Set<string>()
  const kenyaNumber1Id = qualifierConfig?.kenyaNumber1Id ?? null
  const juniorChampionMatcher = qualifierConfig?.juniorChampionMatcher
  const showLegend = qualifierConfig?.showLegend ?? false

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 mb-6">
        <SearchForm defaultValue={search} basePath={basePath} placeholder={searchPlaceholder} />
      </div>

      <div className="mb-0 w-full">
        <ViewSelector
          basePath={basePath}
          view={view}
          exportUrl={exportUrl}
          exportFilename={exportFilename}
        />
      </div>

      <Card
        className={cn(
          'w-full border-0 shadow-none rounded-none bg-white/95 p-0',
          'sm:rounded-bl-lg sm:rounded-br-lg sm:rounded-tr-lg sm:shadow-sm'
        )}>
        <CustomTable className="h-full">
          <CustomTableHeader>
            <CustomTableRow>
              <CustomTableHead className="w-[36px] text-right">
                <SortableHeader column="rank" label="Rank" basePath={basePath} className="w-full hidden sm:block" />
                <SortableHeader column="rank" label="#" basePath={basePath} className="w-full sm:hidden" />
              </CustomTableHead>
              <CustomTableHead className="min-w-[108px] sm:min-w-[140px]">
                <SortableHeader column="name" label="Name" basePath={basePath} className="w-full" />
              </CustomTableHead>
              <CustomTableHead className="w-[40px] text-center sm:hidden">
                <span className="sr-only">Qualified</span>
              </CustomTableHead>
              <CustomTableHead className="w-[40px] text-center hidden sm:table-cell">
                Qualified
              </CustomTableHead>
              <CustomTableHead className="hidden sm:table-cell text-right">
                <SortableHeader
                  column="tournaments_played"
                  label="Tournaments"
                  align="right"
                  basePath={basePath}
                  className="w-full"
                />
              </CustomTableHead>
              <CustomTableHead className={cn('text-right', view === 'best_1' ? 'table-cell' : 'hidden md:table-cell')}>
                <SortableHeader column="best_1" label="Best TPR" align="right" basePath={basePath} className="w-full" />
              </CustomTableHead>
              <CustomTableHead className={cn('text-right', view === 'best_2' ? 'table-cell' : 'hidden md:table-cell')}>
                <SortableHeader column="best_2" label="Best 2" align="right" basePath={basePath} className="w-full" />
              </CustomTableHead>
              <CustomTableHead className={cn('text-right', view === 'best_3' ? 'table-cell' : 'hidden md:table-cell')}>
                <SortableHeader column="best_3" label="Best 3" align="right" basePath={basePath} className="w-full" />
              </CustomTableHead>
              <CustomTableHead className={cn('text-right', view === 'best_4' ? 'table-cell' : 'hidden md:table-cell')}>
                <SortableHeader column="best_4" label="Best 4" align="right" basePath={basePath} className="w-full" />
              </CustomTableHead>
            </CustomTableRow>
          </CustomTableHeader>
          <CustomTableBody>
            {rankings.length === 0 ? (
              <CustomTableRow>
                <CustomTableCell colSpan={9} className="text-center py-12">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                      <Crown className="h-5 w-5" />
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
                const tableRank = (page - 1) * 25 + index + 1
                const isKenyaNumber1 = kenyaNumber1Id ? playerId === kenyaNumber1Id : false
                const isAutomaticQualifier = automaticQualifierIds.has(playerId)
                const isAlternateQualifier =
                  (provisionalQualifierId && provisionalQualifierId === playerId) || alternateQualifierIds.has(playerId)
                const isHighlightedQualifier = highlightedQualifierIds.has(playerId)
                const isJuniorChampion = juniorChampionMatcher ? juniorChampionMatcher(player) : false
                const isDefinitelyQualified = Boolean(isKenyaNumber1 || isJuniorChampion)
                const movement = view === 'best_4' ? getRankMovement(player) : null

                const movementBadge = !isDefinitelyQualified && movement ? (
                  <span
                    aria-label={movement.ariaLabel}
                    className={cn(
                      'rounded-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                      movement.className
                    )}>
                    {movement.label}
                  </span>
                ) : null

                const qualifierBadgeMobile = isDefinitelyQualified ? (
                  <span className="inline-block rounded-sm bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-green-700">
                    Q
                  </span>
                ) : null
                const qualifierBadgeDesktop = isDefinitelyQualified ? (
                  <CircleCheckBig className="h-5 w-5 text-green-600" strokeWidth={1.75} />
                ) : null

                return (
                  <CustomTableRow
                    key={playerId}
                    className={cn(
                      isKenyaNumber1
                        ? 'bg-amber-50/50 border-l-2 border-l-amber-500 hover:bg-amber-100/50'
                        : isAlternateQualifier
                          ? 'bg-teal-50/80 border-l-2 border-l-teal-600 hover:bg-teal-100'
                          : isAutomaticQualifier
                            ? 'bg-blue-50/70 border-l-2 border-l-blue-600 hover:bg-blue-100'
                            : index % 2 === 0
                              ? 'bg-gray-50/50 hover:bg-gray-100/50'
                              : 'bg-white hover:bg-gray-50/50',
                      isJuniorChampion ? 'ring-1 ring-inset ring-purple-200' : ''
                    )}>
                    <CustomTableCell isHeader className="text-right">
                      {isKenyaNumber1 ? (
                        <div className="flex items-center justify-end gap-1">
                          <Crown className="h-3 w-3 text-amber-600" />
                          <span className="font-semibold text-amber-700">{tableRank}</span>
                        </div>
                      ) : isAlternateQualifier ? (
                        <span className="font-semibold text-teal-700">{tableRank}</span>
                      ) : isAutomaticQualifier ? (
                        <span className="font-semibold text-blue-700">{tableRank}</span>
                      ) : isJuniorChampion ? (
                        <span className="font-semibold text-purple-700">{tableRank}</span>
                      ) : (
                        tableRank
                      )}
                    </CustomTableCell>
                    <CustomTableCell>
                      <div className="truncate space-y-1">
                        {player.fide_id ? (
                          <Link
                            href={`/player/${player.fide_id}`}
                            className={cn(
                              'font-medium group flex items-center gap-2',
                              isKenyaNumber1
                                ? 'text-amber-700 hover:text-amber-800'
                                : isAlternateQualifier
                                  ? 'text-teal-700 hover:text-teal-800'
                                  : isAutomaticQualifier
                                    ? 'text-blue-700 hover:text-blue-800'
                                    : isJuniorChampion
                                      ? 'text-purple-700 hover:text-purple-800'
                                      : 'text-blue-600 hover:text-blue-700'
                            )}
                            title={player.name}>
                            <span className="sm:hidden flex items-center gap-1">
                              {getDisplayName(player.name)}
                              <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:text-blue-500 transition-colors" />
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
                                : isAlternateQualifier
                                  ? 'text-teal-700'
                                  : isAutomaticQualifier
                                    ? 'text-blue-700'
                                    : isJuniorChampion
                                      ? 'text-purple-700'
                                      : ''
                            )}
                            title={player.name}>
                            {getDisplayName(player.name)}
                          </span>
                        )}
                      </div>
                    </CustomTableCell>
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
                    <CustomTableCell className="hidden sm:table-cell text-right tabular-nums">
                      {player.tournaments_played}
                    </CustomTableCell>
                    <CustomTableCell
                      className={cn('text-right tabular-nums', view === 'best_1' ? 'table-cell' : 'hidden md:table-cell')}>
                      <div className="tabular-nums font-medium">{player.best_1}</div>
                    </CustomTableCell>
                    <CustomTableCell
                      className={cn('text-right tabular-nums', view === 'best_2' ? 'table-cell' : 'hidden md:table-cell')}>
                      {player.best_2}
                    </CustomTableCell>
                    <CustomTableCell
                      className={cn('text-right tabular-nums', view === 'best_3' ? 'table-cell' : 'hidden md:table-cell')}>
                      {player.best_3}
                    </CustomTableCell>
                    <CustomTableCell
                      className={cn('text-right tabular-nums', view === 'best_4' ? 'table-cell' : 'hidden md:table-cell')}>
                      {isHighlightedQualifier ? (
                        <span className={cn('font-semibold', isAlternateQualifier ? 'text-teal-700' : 'text-blue-700')}>
                          {player.best_4}
                        </span>
                      ) : (
                        player.best_4
                      )}
                    </CustomTableCell>
                  </CustomTableRow>
                )
              })
            )}
          </CustomTableBody>
        </CustomTable>
      </Card>

      {showLegend && (
        <div className="border border-gray-200 bg-white/95 shadow-sm">
          <div className="px-4 py-3 flex flex-wrap items-center gap-4 text-xs font-medium text-gray-700">
            <span className="inline-flex items-center gap-1.5 text-amber-700">
              <Crown className="h-3.5 w-3.5 text-amber-600" />
              Kenya #1
            </span>
            <span className="inline-flex items-center gap-1.5 text-blue-700">
              <span className="h-2.5 w-2.5 rounded-full border-[1.5px] border-blue-600 bg-blue-50" />
              Top 9 Qualifier
            </span>
            <span className="inline-flex items-center gap-1.5 text-teal-700">
              <span className="h-2.5 w-2.5 rounded-full border-[1.5px] border-teal-600 bg-teal-50" />
              Alternate Qualifier
            </span>
            <span className="inline-flex items-center gap-1.5 text-purple-700">
              <span className="h-2.5 w-2.5 rounded-full border-[1.5px] border-purple-500 bg-purple-50" />
              National Junior Champion
            </span>
            <span className="inline-flex items-center gap-1.5 text-green-700">
              <span className="inline-flex h-4 items-center justify-center rounded-sm bg-green-100 px-1.5 text-[11px] font-semibold leading-tight text-green-700 sm:hidden">
                Q
              </span>
              <CircleCheckBig className="hidden sm:inline-block h-3.5 w-3.5 text-green-600" strokeWidth={1.75} />
              Confirmed Qualifier
            </span>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          basePath={basePath}
          queryParams={{
            sort,
            dir,
            view,
            ...(search ? { q: search } : {})
          }}
          className="mt-4"
        />
      )}
    </div>
  )
}
