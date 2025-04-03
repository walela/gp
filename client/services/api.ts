const API_BASE = 'http://localhost:5003/api'

export interface Tournament {
  id: string
  name: string
  results: number
  status: 'Completed' | 'Upcoming'
}

export interface TournamentResult {
  player: {
    name: string
    fide_id: string | null
    rating: number | null
    federation: string
  }
  points: number
  tpr: number | null
  has_walkover: boolean
}

export interface TournamentDetails {
  name: string
  id: string
  results: TournamentResult[]
  total: number
  page: number
  total_pages: number
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

export interface PlayerDetails {
  name: string
  fide_id: string
  rating: number
  results: {
    tournament_id: string
    tournament_name: string
    points: number
    tpr: number
    rating: number
  }[]
}

export async function getTournaments(params: {
  sort?: string
  dir?: 'asc' | 'desc'
  page?: number
} = {}): Promise<Tournament[]> {
  const searchParams = new URLSearchParams()
  if (params.sort) searchParams.set('sort', params.sort)
  if (params.dir) searchParams.set('dir', params.dir)
  if (params.page) searchParams.set('page', params.page.toString())
  
  const response = await fetch(`${API_BASE}/tournaments?${searchParams}`)
  if (!response.ok) throw new Error('Failed to fetch tournaments')
  return response.json()
}

export async function getTournament(id: string, params: {
  sort?: string
  dir?: 'asc' | 'desc'
  page?: number
} = {}): Promise<TournamentDetails> {
  const searchParams = new URLSearchParams()
  if (params.sort) searchParams.set('sort', params.sort)
  if (params.dir) searchParams.set('dir', params.dir)
  if (params.page) searchParams.set('page', params.page.toString())
  
  const response = await fetch(`${API_BASE}/tournament/${id}?${searchParams}`)
  if (!response.ok) throw new Error('Failed to fetch tournament details')
  return response.json()
}

export async function getRankings(params: {
  sort?: string
  dir?: 'asc' | 'desc'
  page?: number
} = {}): Promise<RankingsResponse> {
  const searchParams = new URLSearchParams()
  if (params.sort) searchParams.set('sort', params.sort)
  if (params.dir) searchParams.set('dir', params.dir)
  if (params.page) searchParams.set('page', params.page.toString())
  
  const response = await fetch(`${API_BASE}/rankings?${searchParams}`)
  if (!response.ok) throw new Error('Failed to fetch rankings')
  return response.json()
}

export async function getPlayer(fideId: string, params: {
  sort?: string
  dir?: 'asc' | 'desc'
  page?: number
} = {}): Promise<PlayerDetails> {
  const searchParams = new URLSearchParams()
  if (params.sort) searchParams.set('sort', params.sort)
  if (params.dir) searchParams.set('dir', params.dir)
  if (params.page) searchParams.set('page', params.page.toString())
  
  const response = await fetch(`${API_BASE}/player/${fideId}?${searchParams}`)
  if (!response.ok) throw new Error('Failed to fetch player details')
  return response.json()
}

export async function refreshTournament(id: string): Promise<{ status: string }> {
  const response = await fetch(`${API_BASE}/refresh/${id}`)
  if (!response.ok) throw new Error('Failed to refresh tournament')
  return response.json()
}
