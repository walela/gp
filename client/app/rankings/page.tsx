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

import { CircleCheckBig, ChevronRight, Crown } from 'lucide-react'
import { getRankings, getTopPlayers } from '@/services/api'
import { cn } from '@/lib/utils'
import { ViewSelector } from '@/components/rankings/view-selector'
import { SearchForm } from '@/components/rankings/search-form'
import { Pagination } from '@/components/ui/pagination'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Player Rankings - Chess Kenya 2025 Grand Prix',
  description: 'View the latest Chess Kenya Grand Prix rankings and standings. Track player performance across tournaments with TPR ratings and points.',
  openGraph: {
    title: 'Chess Kenya Grand Prix Rankings',
    description: 'Official rankings for the Chess Kenya 2025 Grand Prix series. View top players, tournament performances and TPR ratings.',
    type: 'website',
    siteName: 'Chess Kenya Grand Prix',
    url: 'https://1700chess.vercel.app/rankings'
  },
  twitter: {
    card: 'summary',
    title: 'Chess Kenya GP Rankings',
    description: 'View the latest Chess Kenya Grand Prix player rankings and standings'
  }
}

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

interface RankingsPageProps {
  searchParams: {
    sort?: string
    dir?: 'asc' | 'desc'
    page?: string
    view?: string
    q?: string
  }
}

export default async function RankingsPage({ searchParams }: RankingsPageProps) {
  // Properly await the searchParams object
  const params = await searchParams

  // Now we can safely access the properties
  const sort = params.sort || 'best_4'
  const dir = params.dir || 'desc'
  const page = Number(params.page || '1')
  const view = params.view || 'best_4'
  const search = params.q || ''

  // Pass search query to the backend for filtering
  const { rankings, total_pages } = await getRankings({
    sort,
    dir,
    page,
    q: search
  })

  const highlightCount = 9
  const { topPlayers } = await getTopPlayers({ count: highlightCount + 1, sortBy: 'best_4' })
  const topPlayerIds = topPlayers.map(p => p.fide_id || p.name)

  const kenyaNumber1Player = [...rankings, ...topPlayers].find(player =>
    player.name.toLowerCase().includes('jadon')
  )
  const kenyaNumber1Id = kenyaNumber1Player?.fide_id || kenyaNumber1Player?.name

  const automaticQualifierIds = new Set(
    topPlayers.slice(0, highlightCount).map(player => player.fide_id || player.name)
  )

  const kenyaNumber1IsAutomatic = kenyaNumber1Id ? automaticQualifierIds.has(kenyaNumber1Id) : false
  const provisionalQualifierId =
    kenyaNumber1IsAutomatic && topPlayers.length > highlightCount ? topPlayerIds[highlightCount] : null

  const highlightedQualifierIds = new Set(automaticQualifierIds)
  if (provisionalQualifierId) {
    highlightedQualifierIds.add(provisionalQualifierId)
  }

  const juniorChampionId = '10831533'

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Grand Prix Rankings</h1>
        </div>
      </div>

      <div className="flex flex-col gap-4 mb-6">
        <SearchForm defaultValue={search} />
      </div>

      <div className="mb-0 w-full">
        <ViewSelector
          view={view}
          exportUrl={`${process.env.NEXT_PUBLIC_API_URL || 'https://gp-backend-viuj.onrender.com/api'}/rankings/export?sort=${sort}&dir=${dir}${search ? `&q=${encodeURIComponent(search)}` : ''}`}
          exportFilename={`GP_rankings${search ? `_search_${search.replace(' ', '_')}` : ''}_by_${sort}.csv`}
        />
      </div>

      <Card
        className={cn(
          'rounded-bl-lg rounded-br-lg rounded-tr-lg border-0 shadow-sm overflow-hidden bg-white/90 backdrop-blur-sm p-0',
          'rounded-tl-none'
        )}>
        <CustomTable className="h-full">
          <CustomTableHeader>
            <CustomTableRow>
              <CustomTableHead className="w-[36px] text-right">
                <SortableHeader column="rank" label="Rank" basePath="/rankings" className="w-full hidden sm:block" />
                <SortableHeader column="rank" label="#" basePath="/rankings" className="w-full sm:hidden" />
              </CustomTableHead>
              <CustomTableHead className="min-w-[120px]">
                <SortableHeader column="name" label="Name" basePath="/rankings" className="w-full" />
              </CustomTableHead>
              <CustomTableHead className="w-[60px] text-center sm:hidden">Qualified</CustomTableHead>
              <CustomTableHead className="w-[40px] text-center hidden sm:table-cell">
                Qualified
              </CustomTableHead>
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
                const isKenyaNumber1 = kenyaNumber1Id ? playerId === kenyaNumber1Id : false
                const isAutomaticQualifier = automaticQualifierIds.has(playerId)
                const isProvisionalQualifier = provisionalQualifierId === playerId
                const isHighlightedQualifier = highlightedQualifierIds.has(playerId)
                const isJuniorChampion =
                  player.fide_id === juniorChampionId || player.name.toLowerCase().includes('kyle kuka')
                const tableRank = (page - 1) * 25 + index + 1

                const isDefinitelyQualified = isKenyaNumber1 || isJuniorChampion

                return (
                  <CustomTableRow
                    key={playerId}
                    className={cn(
                      isKenyaNumber1
                        ? 'bg-amber-50/50 border-l-2 border-l-amber-500 hover:bg-amber-100/50'
                        : isProvisionalQualifier
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
                      ) : isProvisionalQualifier ? (
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
                      <div className="truncate">
                        {player.fide_id ? (
                          <Link
                            href={`/player/${player.fide_id}`}
                            className={cn(
                              'font-medium group flex items-center gap-2',
                              isKenyaNumber1
                                ? 'text-amber-700 hover:text-amber-800'
                                : isProvisionalQualifier
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
                                : isProvisionalQualifier
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
                      {isDefinitelyQualified ? (
                        <CircleCheckBig className="h-4 w-4 text-green-600 mx-auto" strokeWidth={2} />
                      ) : null}
                    </CustomTableCell>
                    <CustomTableCell className="hidden sm:table-cell text-center">
                      {isDefinitelyQualified ? (
                        <CircleCheckBig className="h-5 w-5 text-green-600 mx-auto" strokeWidth={1.75} />
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
                        <span className={cn('font-semibold', isProvisionalQualifier ? 'text-teal-700' : 'text-blue-700')}>
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
            <CircleCheckBig className="h-3.5 w-3.5 text-green-600" strokeWidth={1.75} />
            Confirmed Qualifier
          </span>
        </div>
      </div>

      {total_pages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={total_pages}
          basePath="/rankings"
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
