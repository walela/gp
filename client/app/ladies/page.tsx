import { Metadata } from 'next'
import { getRankings, getTopPlayers, PlayerRanking } from '@/services/api'
import { RankingsView } from '@/components/rankings/rankings-view'

export const metadata: Metadata = {
  title: 'Ladies Rankings - Chess Kenya 2025 Grand Prix',
  description:
    'Official Chess Kenya Grand Prix ladies standings combining women-only sections and top Kenyan performances in the open sections.',
  openGraph: {
    title: 'Chess Kenya Ladies Grand Prix Standings',
    description: 'Track Kenyan women across both ladies-only and open GP events with validated TPR rankings.',
    type: 'website',
    siteName: 'Chess Kenya Grand Prix',
    url: 'https://1700chess.vercel.app/ladies'
  },
  twitter: {
    card: 'summary',
    title: 'CK Ladies GP Rankings',
    description: 'Live ladies standings for the 2025 Chess Kenya Grand Prix'
  }
}

interface LadiesRankingsPageProps {
  searchParams: {
    sort?: string
    dir?: 'asc' | 'desc'
    page?: string
    view?: string
    q?: string
  }
}

export default async function LadiesRankingsPage({ searchParams }: LadiesRankingsPageProps) {
  const params = await searchParams
  const sort = params.sort || 'best_4'
  const dir = params.dir || 'desc'
  const page = Number(params.page || '1')
  const view = params.view || 'best_4'
  const search = params.q || ''

  const { rankings, total_pages } = await getRankings({
    sort,
    dir,
    page,
    q: search,
    gender: 'f'
  })

  const highlightCount = 9
  const alternateCount = 2
  const { topPlayers } = await getTopPlayers({ count: highlightCount + alternateCount, sortBy: 'best_4', gender: 'f' })
  const topPlayerIds = topPlayers.map(player => player.fide_id || player.name)

  const automaticQualifierIds = new Set(
    topPlayers.slice(0, highlightCount).map(player => player.fide_id || player.name)
  )
  const alternateQualifierIds = new Set(
    topPlayers
      .slice(highlightCount, highlightCount + alternateCount)
      .map(player => player.fide_id || player.name)
      .filter(Boolean)
  )

  const kenyaNumber1Player = rankings.find(player => player.name.toLowerCase().includes('bella'))
  const kenyaNumber1Id = kenyaNumber1Player?.fide_id || kenyaNumber1Player?.name
  const fallbackAlternates = topPlayerIds.slice(highlightCount, highlightCount + alternateCount)
  fallbackAlternates.forEach(id => {
    if (id) {
      alternateQualifierIds.add(id)
    }
  })

  const highlightedQualifierIds = new Set(automaticQualifierIds)
  alternateQualifierIds.forEach(id => highlightedQualifierIds.add(id))

  const qualifierConfig = {
    kenyaNumber1Id,
    automaticQualifierIds,
    provisionalQualifierId: null,
    alternateQualifierIds,
    highlightedQualifierIds,
    juniorChampionMatcher: (player: PlayerRanking) =>
      player.name.toLowerCase().includes('elizabeth cassidy') || player.name.toLowerCase().includes('elizabeth maina'),
    showLegend: true
  }

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://gp-tracker-hidden-rain-8594.fly.dev/api'
  const exportUrl = `${apiBase}/rankings/export?sort=${sort}&dir=${dir}${search ? `&q=${encodeURIComponent(search)}` : ''}&gender=f`
  const exportFilename = `GP_ladies_rankings${search ? `_search_${search.replace(' ', '_')}` : ''}_by_${sort}.csv`

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-gray-800">Ladies Grand Prix Standings</h1>
        <p className="text-sm text-gray-600">
          Filtered Kenyan performances across both ladies-only sections and open events. Valid TPRs from either section
          count toward the 2025 GP ladder.
        </p>
        <p className="text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-md px-3 py-2 max-w-2xl">
          Entries that earned their score inside an open section are tagged &quot;Open Section&quot; so you can tell where their
          TPR came from at a glance.
        </p>
      </div>

      <RankingsView
        basePath="/ladies"
        rankings={rankings}
        sort={sort}
        dir={dir as 'asc' | 'desc'}
        page={page}
        view={view}
        search={search}
        totalPages={total_pages}
        exportUrl={exportUrl}
        exportFilename={exportFilename}
        qualifierConfig={qualifierConfig}
        searchPlaceholder="Search ladies standings..."
      />
    </div>
  )
}
