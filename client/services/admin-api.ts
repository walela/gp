import { getAdminToken } from '@/lib/admin-auth'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://gp-tracker-hidden-rain-8594.fly.dev/api'

function authHeaders(): HeadersInit {
  const token = getAdminToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function adminFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...init?.headers },
    cache: 'no-store',
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Request failed: ${res.status}`)
  }
  return res.json()
}

// Auth
export async function adminLogin(password: string): Promise<{ ok: boolean }> {
  return adminFetch('/admin/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  })
}

// Scrape workflow
export interface ScrapedResult {
  player: {
    name: string
    fide_id: string | null
    federation: string
    rating: number | null
  }
  points: number
  tpr: number | null
  has_walkover: boolean
  rank: number
  start_rank: number
  result_status?: string
}

export interface ScrapeSection {
  name: string
  tournament_id: string
  url_param: string
  is_ladies: boolean
}

export interface ScrapePreview {
  name: string
  results: ScrapedResult[]
  metadata: {
    rounds: number | null
    round_fetched?: number | null
    location: string | null
    start_date: string | null
    end_date: string | null
    section: string
  }
}

export async function scrapeSections(tournamentId: string): Promise<{ sections: ScrapeSection[] }> {
  return adminFetch('/admin/scrape/sections', {
    method: 'POST',
    body: JSON.stringify({ tournament_id: tournamentId }),
  })
}

export async function scrapePreview(tournamentId: string, sectionParam?: string, roundNumber?: number | null, isLadies?: boolean): Promise<ScrapePreview> {
  return adminFetch('/admin/scrape/preview', {
    method: 'POST',
    body: JSON.stringify({ tournament_id: tournamentId, section_param: sectionParam || '', round_number: roundNumber || null, is_ladies: isLadies || false }),
  })
}

export async function scrapeValidate(tournamentId: string, results: ScrapedResult[]): Promise<{ results: ScrapedResult[] }> {
  return adminFetch('/admin/scrape/validate', {
    method: 'POST',
    body: JSON.stringify({ tournament_id: tournamentId, results }),
  })
}

export async function scrapeCommit(
  tournamentId: string,
  name: string,
  results: ScrapedResult[],
  metadata: ScrapePreview['metadata']
): Promise<{ ok: boolean; tournament_id: string }> {
  return adminFetch('/admin/scrape/commit', {
    method: 'POST',
    body: JSON.stringify({ tournament_id: tournamentId, name, results, metadata }),
  })
}

// Tournament management
export interface AdminTournament {
  id: string
  name: string
  short_name: string | null
  start_date: string | null
  end_date: string | null
  location: string | null
  rounds: number | null
  section: string
  results_count: number
}

export async function getAdminTournaments(season?: number): Promise<AdminTournament[]> {
  const params = season ? `?season=${season}` : ''
  return adminFetch(`/admin/tournaments${params}`)
}

export async function updateTournament(id: string, data: Record<string, unknown>): Promise<{ ok: boolean }> {
  return adminFetch(`/admin/tournament/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteTournament(id: string): Promise<{ ok: boolean }> {
  return adminFetch(`/admin/tournament/${id}`, { method: 'DELETE' })
}

// Result editing
export async function updateResult(
  tournamentId: string,
  fideId: string,
  data: Record<string, unknown>
): Promise<{ ok: boolean }> {
  return adminFetch(`/admin/tournament/${tournamentId}/result/${fideId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteResult(tournamentId: string, fideId: string): Promise<{ ok: boolean }> {
  return adminFetch(`/admin/tournament/${tournamentId}/result/${fideId}`, { method: 'DELETE' })
}
