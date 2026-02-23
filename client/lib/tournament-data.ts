import { getTournaments, type Tournament } from '@/services/api'

export interface TournamentWithStats extends Tournament {
  avgTop10TPR: number
  avgTop24Rating: number
}

export async function getTournamentData(season?: number): Promise<TournamentWithStats[]> {
  // Stats are now included in the tournaments API response
  const tournaments = await getTournaments({ season })
  return tournaments as TournamentWithStats[]
}