import { getTournaments, getTournamentAllResults, type Tournament } from '@/services/api'

export interface TournamentWithStats extends Tournament {
  avgTop10TPR: number
  avgTop24Rating: number
}

export async function getTournamentData(): Promise<TournamentWithStats[]> {
  const tournaments = await getTournaments()
  
  // Fetch detailed results for each tournament to compute averages
  const stats: Record<string, { avgTop10TPR: number; avgTop24Rating: number }> = {}

  await Promise.all(
    tournaments.map(async tournament => {
      try {
        const results = await getTournamentAllResults(tournament.id)

        // Calculate average top 10 TPR
        const top10TPRs = results
          .filter(r => r.tpr !== null)
          .sort((a, b) => (b.tpr || 0) - (a.tpr || 0))
          .slice(0, 10)
          .map(r => r.tpr || 0)

        const avgTop10TPR =
          top10TPRs.length > 0 ? Math.round(top10TPRs.reduce((sum, tpr) => sum + tpr, 0) / top10TPRs.length) : 0

        // Calculate average top 24 rating
        const top24Ratings = results
          .filter(r => r.rating !== null)
          .sort((a, b) => (b.rating || 0) - (a.rating || 0))
          .slice(0, 24)
          .map(r => r.rating || 0)

        const avgTop24Rating =
          top24Ratings.length > 0
            ? Math.round(top24Ratings.reduce((sum, rating) => sum + rating, 0) / top24Ratings.length)
            : 0

        stats[tournament.id] = { avgTop10TPR, avgTop24Rating }
      } catch (error) {
        console.error(`Failed to fetch results for tournament ${tournament.id}:`, error)
        stats[tournament.id] = { avgTop10TPR: 0, avgTop24Rating: 0 }
      }
    })
  )

  // Combine tournament data with computed stats
  return tournaments.map(tournament => ({
    ...tournament,
    avgTop10TPR: stats[tournament.id]?.avgTop10TPR || 0,
    avgTop24Rating: stats[tournament.id]?.avgTop24Rating || 0
  }))
}