const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://gp-backend-viuj.onrender.com/api'

export interface Tournament {
  id: string
  name: string
  short_name?: string
  results: number
  status: 'Completed' | 'Upcoming'
  start_date?: string
  end_date?: string
  rounds?: number
  location?: string
}

export interface TournamentPlayer {
  name: string
  fide_id: string | null
  rating: number | null
  federation: string
}

export interface TournamentResult {
  player: TournamentPlayer
  points: number
  tpr: number | null
  has_walkover: boolean
  rating: number | null
  start_rank: number | null
  result_status?: 'valid' | 'walkover' | 'incomplete' | 'withdrawn' | 'unknown' | string
}

export interface TournamentDetails {
  name: string
  short_name?: string
  id: string
  results: TournamentResult[]
  total: number
  page: number
  total_pages: number
  start_date?: string
  end_date?: string
  rounds?: number
  location?: string
}

export interface PlayerResult {
  tournament_id: string
  tournament_name: string
  points: number
  tpr: number | null
  rating_in_tournament: number | null
  start_rank: number | null
  chess_results_url: string
  player_card_url: string
  rounds: number
  location?: string
  result_status?: 'valid' | 'walkover' | 'incomplete' | 'withdrawn' | string
}

export interface PlayerDetails {
  name: string
  fide_id: string
  federation: string
  current_fide_rating: number | null
  latest_tournament_rating: number | null
  results: PlayerResult[]
}

export interface PlayerRanking {
  name: string
  fide_id: string | null
  rating: number | null
  tournaments_played: number
  best_1: number
  tournament_1: string | null
  best_2: number
  best_3: number
  best_4: number
}

export interface RankingsResponse {
  rankings: PlayerRanking[]
  total: number
  page: number
  total_pages: number
}

export async function getTournaments(
  params: {
    sort?: string
    dir?: 'asc' | 'desc'
    page?: number
  } = {}
): Promise<Tournament[]> {
  const searchParams = new URLSearchParams()
  if (params.sort) searchParams.set('sort', params.sort)
  if (params.dir) searchParams.set('dir', params.dir)
  if (params.page) searchParams.set('page', params.page.toString())

  const response = await fetch(`${API_BASE}/tournaments?${searchParams}`)
  if (!response.ok) throw new Error('Failed to fetch tournaments')
  return response.json()
}

export async function getTournamentDetails(
  id: string,
  params: {
    sort?: string
    dir?: 'asc' | 'desc'
    page?: number
  } = {}
): Promise<TournamentDetails> {
  const searchParams = new URLSearchParams()
  if (params.sort) searchParams.set('sort', params.sort)
  if (params.dir) searchParams.set('dir', params.dir)
  if (params.page) searchParams.set('page', params.page.toString())

  const response = await fetch(`${API_BASE}/tournament/${id}?${searchParams}`)
  if (!response.ok) throw new Error('Failed to fetch tournament details')
  return response.json()
}

export async function getRankings({
  sort = 'best_4',
  dir = 'desc',
  page = 1,
  q
}: {
  sort?: string
  dir?: 'asc' | 'desc'
  page?: number
  q?: string
} = {}) {
  let url = `${API_BASE}/rankings?sort=${sort}&dir=${dir}&page=${page}`
  if (q) {
    url += `&q=${encodeURIComponent(q)}`
  }
  const res = await fetch(url)
  const data = await res.json()
  return data as RankingsResponse
}

export async function getPlayer(id: string): Promise<PlayerDetails> {
  const res = await fetch(`${API_BASE}/player/${id}`)
  const data = await res.json()
  return data as PlayerDetails
}

export async function getTournament(
  id: string,
  params: {
    sort?: string
    dir?: 'asc' | 'desc'
    page?: number
  } = {}
): Promise<TournamentDetails> {
  const searchParams = new URLSearchParams()
  if (params.sort) searchParams.set('sort', params.sort)
  if (params.dir) searchParams.set('dir', params.dir)
  if (params.page) searchParams.set('page', params.page.toString())

  const res = await fetch(`${API_BASE}/tournament/${id}?${searchParams}`)
  const data = await res.json()
  return data as TournamentDetails
}

export async function refreshTournament(id: string): Promise<{ status: string }> {
  const response = await fetch(`${API_BASE}/refresh/${id}`)
  if (!response.ok) throw new Error('Failed to refresh tournament')
  return response.json()
}

export interface TopPlayersResponse {
  topPlayers: PlayerRanking[]
}

export async function getTopPlayers({
  count = 9,
  sortBy = 'best_4',
  dir = 'desc',
  q = ''
}: {
  count?: number
  sortBy?: string
  dir?: 'asc' | 'desc'
  q?: string
} = {}): Promise<TopPlayersResponse> {
  // Get first page with all top players
  const data = await getRankings({ sort: sortBy, dir, page: 1, q })

  return {
    topPlayers: data.rankings.slice(0, count)
  }
}

export async function getTournamentAllResults(id: string): Promise<TournamentResult[]> {
  // Fetch all results without pagination
  const res = await fetch(`${API_BASE}/tournament/${id}?all_results=true`)
  const data = await res.json()
  return data.results as TournamentResult[]
}
