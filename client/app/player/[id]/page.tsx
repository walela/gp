import { getPlayer, PlayerDetails, getRankings, PlayerRanking, getSeasons } from '@/services/api'
import Link from 'next/link'
import PlayerClientContent from './player-client-content'
import { Metadata } from 'next'

// Render HTML per request while allowing explicitly cached data fetches.
export const revalidate = 0

interface PlayerPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ season?: string; gender?: string }>
}

type DisplayRanking = PlayerRanking & { currentRank?: number }

async function resolvePlayerRequest(searchParams: PlayerPageProps['searchParams']) {
  const [resolvedSearchParams, { seasons }] = await Promise.all([
    searchParams,
    getSeasons(),
  ])
  const currentYear = new Date().getFullYear()

  return {
    seasons,
    season: resolvedSearchParams.season
      ? Number(resolvedSearchParams.season)
      : (seasons[0] || currentYear),
    gender: resolvedSearchParams.gender,
  }
}

export async function generateMetadata({ params, searchParams }: PlayerPageProps): Promise<Metadata> {
  const [{ id }, requestOptions] = await Promise.all([
    params,
    resolvePlayerRequest(searchParams),
  ])
  
  try {
    const player = await getPlayer(id, {
      season: requestOptions.season,
      gender: requestOptions.gender,
    })
    
    if (!player) {
      return {
        title: 'Player Not Found - Chess Kenya 2025 Grand Prix',
        description: 'The requested player could not be found.'
      }
    }

    const ratingText = player.current_fide_rating ? `FIDE ${player.current_fide_rating}` : 'Unrated'
    const tournamentsPlayed = player.results.length
    
    return {
      title: `${player.name} - ${ratingText} - Chess Kenya Grand Prix`,
      description: `View ${player.name}'s chess tournament results, ratings and performance in the Chess Kenya 2025 Grand Prix. ${tournamentsPlayed} tournaments played. ${ratingText} player from ${player.federation}.`,
      openGraph: {
        title: `${player.name} - Chess Kenya Player Profile`,
        description: `${ratingText} chess player from ${player.federation}. View tournament results and performance ratings.`,
        type: 'profile',
        siteName: 'Chess Kenya Grand Prix',
        url: `https://1700chess.sh/player/${id}`
      },
      twitter: {
        card: 'summary',
        title: `${player.name} - ${ratingText}`,
        description: `Chess player profile: ${tournamentsPlayed} tournaments in Kenya Grand Prix`
      }
    }
  } catch {
    return {
      title: 'Error - Chess Kenya 2025 Grand Prix',
      description: 'An error occurred while loading player information.'
    }
  }
}

export default async function PlayerPage({ params, searchParams }: PlayerPageProps) {
  const [{ id }, requestOptions] = await Promise.all([
    params,
    resolvePlayerRequest(searchParams),
  ])
  const { seasons, season, gender } = requestOptions

  let player: PlayerDetails | null = null
  let playerRanking: DisplayRanking | null = null
  let error: Error | null = null

  try {
    // generateMetadata uses this same URL, allowing Next to memoize the request
    // across metadata and page rendering.
    const loadedPlayer = await getPlayer(id, { season, gender })
    if (!loadedPlayer) {
      // Optionally handle 'player not found' scenario specifically if API returns null/undefined
      throw new Error('Player not found')
    }
    player = loadedPlayer

    if (loadedPlayer.ranking) {
      const { current_rank, ...restRanking } = loadedPlayer.ranking
      playerRanking = {
        ...restRanking,
        currentRank: current_rank ?? undefined
      }
    }

    // Fallback: fetch ranking page if player ranking data is missing (e.g. legacy API)
    if (!playerRanking) {
      try {
        const rankingsData = await getRankings({ sort: 'best_4', dir: 'desc', season })
        const rankingIndex = rankingsData.rankings.findIndex(r => r.fide_id === loadedPlayer.fide_id)
        if (rankingIndex !== -1) {
          playerRanking = {
            ...rankingsData.rankings[rankingIndex],
            currentRank: rankingIndex + 1 // Add 1-based rank position
          }
        }
      } catch (rankingErr) {
        console.warn('Could not fetch player ranking:', rankingErr)
        // Continue without ranking data
      }
    }
  } catch (err) {
    console.error('Error fetching player:', err)
    error = err instanceof Error ? err : new Error('An unknown error occurred')
  }

  // Handle error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-6 text-center">
        <h2 className="text-xl font-bold mb-2">Error Loading Player</h2>
        <p className="text-muted-foreground mb-4">{error.message || 'An unknown error occurred'}</p>
        <Link href="/" className="text-blue-600 hover:underline">
          Return to Rankings
        </Link>
      </div>
    )
  }

  // Handle player not found state
  if (!player) {
    return (
      <div className="container mx-auto px-4 py-6 text-center">
        <h2 className="text-xl font-bold mb-2">Player Not Found</h2>
        <p className="text-muted-foreground mb-4">The player with ID {id} could not be found.</p>
        <Link href="/" className="text-blue-600 hover:underline">
          Return to Rankings
        </Link>
      </div>
    )
  }

  // Generate JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: player.name,
    nationality: player.federation === 'KEN' ? 'Kenyan' : player.federation,
    affiliation: {
      '@type': 'Organization',
      name: 'Chess Kenya'
    },
    url: `https://1700chess.sh/player/${id}`,
    ...(player.current_fide_rating && {
      award: `FIDE Rating: ${player.current_fide_rating}`
    }),
    identifier: {
      '@type': 'PropertyValue',
      name: 'FIDE ID',
      value: player.fide_id
    },
    sameAs: [
      `https://ratings.fide.com/profile/${player.fide_id}`
    ]
  }

  // Render the client component with the fetched data
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PlayerClientContent player={player} playerRanking={playerRanking} seasons={seasons} currentSeason={season} />
    </>
  )
}
