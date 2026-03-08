const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://gp-tracker-hidden-rain-8594.fly.dev/api'

const NO_CACHE = { cache: 'no-store' } as RequestInit

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
  section?: 'open' | 'ladies'
  avgTop10TPR?: number
  avgTop24Rating?: number
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
  section?: 'open' | 'ladies'
  sibling_id?: string | null
}

export interface PlayerResult {
  tournament_id: string
  tournament_name: string
  start_date?: string
  end_date?: string
  points: number
  tpr: number | null
  rating_in_tournament: number | null
  start_rank: number | null
  chess_results_url: string
  player_card_url: string
  rounds: number
  location?: string
  result_status?: 'valid' | 'walkover' | 'incomplete' | 'withdrawn' | string
  section?: 'open' | 'ladies'
}

export interface PlayerDetails {
  name: string
  fide_id: string
  federation: string
  gender: string | null
  current_fide_rating: number | null
  latest_tournament_rating: number | null
  ranking: (PlayerRanking & { current_rank?: number }) | null
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
  player_id?: number
  rank_change?: number | null
  previous_rank?: number | null
  is_new?: boolean
  current_rank?: number
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
    season?: number
  } = {}
): Promise<Tournament[]> {
  const searchParams = new URLSearchParams()
  if (params.sort) searchParams.set('sort', params.sort)
  if (params.dir) searchParams.set('dir', params.dir)
  if (params.page) searchParams.set('page', params.page.toString())
  if (params.season) searchParams.set('season', params.season.toString())

  const response = await fetch(`${API_BASE}/tournaments?${searchParams}`, NO_CACHE)
  if (!response.ok) throw new Error('Failed to fetch tournaments')
  return response.json()
}

export interface SeasonsResponse {
  seasons: number[]
}

export async function getSeasons(): Promise<SeasonsResponse> {
  const response = await fetch(`${API_BASE}/seasons`, NO_CACHE)
  if (!response.ok) throw new Error('Failed to fetch seasons')
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

  const response = await fetch(`${API_BASE}/tournament/${id}?${searchParams}`, NO_CACHE)
  if (!response.ok) throw new Error('Failed to fetch tournament details')
  return response.json()
}

export async function getRankings({
  sort = 'best_4',
  dir = 'desc',
  page = 1,
  q,
  season,
  gender
}: {
  sort?: string
  dir?: 'asc' | 'desc'
  page?: number
  q?: string
  season?: number
  gender?: 'f' | 'm'
} = {}) {
  let url = `${API_BASE}/rankings?sort=${sort}&dir=${dir}&page=${page}`
  if (q) {
    url += `&q=${encodeURIComponent(q)}`
  }
  if (season) {
    url += `&season=${season}`
  }
  if (gender) {
    url += `&gender=${gender}`
  }
  const res = await fetch(url, NO_CACHE)
  const data = await res.json()
  return data as RankingsResponse
}

export async function getPlayer(id: string, params: { season?: number; gender?: string } = {}): Promise<PlayerDetails> {
  const searchParams = new URLSearchParams()
  if (params.season) searchParams.set('season', params.season.toString())
  if (params.gender) searchParams.set('gender', params.gender)
  const queryString = searchParams.toString()
  const url = queryString ? `${API_BASE}/player/${id}?${queryString}` : `${API_BASE}/player/${id}`
  const res = await fetch(url, NO_CACHE)
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

  const res = await fetch(`${API_BASE}/tournament/${id}?${searchParams}`, NO_CACHE)
  const data = await res.json()
  return data as TournamentDetails
}

export async function refreshTournament(id: string): Promise<{ status: string }> {
  const response = await fetch(`${API_BASE}/refresh/${id}`, { cache: 'no-store' })
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
  q = '',
  season,
  gender
}: {
  count?: number
  sortBy?: string
  dir?: 'asc' | 'desc'
  q?: string
  season?: number
  gender?: 'f' | 'm'
} = {}): Promise<TopPlayersResponse> {
  const data = await getRankings({ sort: sortBy, dir, page: 1, q, season, gender })

  return {
    topPlayers: data.rankings.slice(0, count)
  }
}

export interface Insight {
  category: string
  title: string
  detail: string
  data: unknown
}

export interface InsightsResponse {
  season: number
  total_players: number
  total_tournaments: number
  insights: Insight[]
}

export async function getInsights(season: number): Promise<InsightsResponse> {
  const res = await fetch(`${API_BASE}/${season}/insights`, NO_CACHE)
  if (!res.ok) throw new Error('Failed to fetch insights')
  return res.json()
}

export async function getTournamentAllResults(id: string): Promise<TournamentResult[]> {
  const res = await fetch(`${API_BASE}/tournament/${id}?all_results=true`, NO_CACHE)
  const data = await res.json()
  return data.results as TournamentResult[]
}
