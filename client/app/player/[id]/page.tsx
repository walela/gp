import { getPlayer, PlayerDetails, getRankings, PlayerRanking } from '@/services/api'
import Link from 'next/link'
import PlayerClientContent from './player-client-content'
import { Metadata } from 'next'

interface PlayerPageProps {
  params: { id: string }
}

export async function generateMetadata({ params }: PlayerPageProps): Promise<Metadata> {
  const { id } = await params
  
  try {
    const player = await getPlayer(id)
    
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
        url: `https://1700chess.vercel.app/player/${id}`
      },
      twitter: {
        card: 'summary',
        title: `${player.name} - ${ratingText}`,
        description: `Chess player profile: ${tournamentsPlayed} tournaments in Kenya Grand Prix`
      }
    }
  } catch (error) {
    return {
      title: 'Error - Chess Kenya 2025 Grand Prix',
      description: 'An error occurred while loading player information.'
    }
  }
}

export default async function PlayerPage({ params }: PlayerPageProps) {
  // Properly await params to access its properties
  const { id } = await params

  let player: PlayerDetails | null = null
  let playerRanking: PlayerRanking | null = null
  let error: Error | null = null

  try {
    player = await getPlayer(id)
    if (!player) {
      // Optionally handle 'player not found' scenario specifically if API returns null/undefined
      throw new Error('Player not found')
    }

    // Fetch player ranking data
    try {
      const rankingsData = await getRankings({ sort: 'best_4', dir: 'desc' })
      const rankingIndex = rankingsData.rankings.findIndex(r => r.fide_id === player.fide_id)
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
        <Link href="/rankings" className="text-blue-600 hover:underline">
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
        <Link href="/rankings" className="text-blue-600 hover:underline">
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
    url: `https://1700chess.vercel.app/player/${id}`,
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
      <PlayerClientContent player={player} playerRanking={playerRanking} />
    </>
  )
}
