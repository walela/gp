import { getPlayer, PlayerDetails, getRankings, PlayerRanking } from '@/services/api'
import Link from 'next/link'
import PlayerClientContent from './player-client-content'

export default async function PlayerPage({ params }: { params: { id: string } }) {
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

  // Render the client component with the fetched data
  return <PlayerClientContent player={player} playerRanking={playerRanking} />
}
