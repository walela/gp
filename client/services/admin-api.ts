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
    let message = body.error || `Request failed: ${res.status}`
    if (body.debug) {
      message += ` (received ${body.debug.received_len}/${body.debug.received_hash}, expected ${body.debug.expected_len}/${body.debug.expected_hash})`
    }
    throw new Error(message)
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

// Audits
export interface AuditEvent {
  id: string
  name: string
  csv_column: number
  tracker_ids: string[]
  tracker_url_id: string
  chess_results_id: string
  chess_results_url: string
  tracker_url: string
}

export interface AuditKind {
  id: string
  label: string
  count: number
}

export interface AuditLink {
  label: string
  href: string
}

export interface AuditImpact {
  field: string
  chess_kenya: number | string | null
  tracker: number | string | null
  delta: number | null
}

export interface ChessKenyaAuditRow {
  id: string
  section: 'open' | 'ladies'
  kind: string
  kind_label: string
  player_name: string
  chess_kenya_name: string | null
  tracker_name: string | null
  fide_id: string
  chess_kenya_fide_id: string | null
  tracker_fide_id: string | null
  field: string
  event_id: string | null
  event_name: string | null
  chess_kenya: number | string | null
  tracker: number | string | null
  delta: number | null
  detail: string
  priority_rank: number | null
  severity: 'top_10' | 'top_30' | 'top_75' | 'long_tail' | 'unranked'
  chess_kenya_section: 'open' | 'ladies' | null
  chess_kenya_row: number | null
  chess_kenya_rank: number | null
  tracker_rank: number | null
  links: AuditLink[]
  impacts: AuditImpact[]
}

export interface ChessKenyaAuditSection {
  id: 'open' | 'ladies'
  label: string
  category: 'open' | 'ladies'
  source: {
    label: string
    path: string
    loaded: boolean
  }
  events: AuditEvent[]
  kinds: AuditKind[]
  notes: string[]
  summary: {
    chess_kenya_players: number
    tracker_players: number
    discrepancy_rows: number
  }
  rows: ChessKenyaAuditRow[]
}

export interface ChessKenyaAuditResponse {
  generated_at: string
  season: number
  sections: ChessKenyaAuditSection[]
}

export async function getChessKenyaOpen2026Audit(): Promise<ChessKenyaAuditResponse> {
  return adminFetch('/admin/audits/chess-kenya-open-2026')
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
