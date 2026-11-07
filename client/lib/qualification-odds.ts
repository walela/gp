export type ForecastCategory = 'open' | 'ladies'
export type ForecastStatus = 'forecast' | 'kenya1' | 'junior_champion'

export interface ForecastEntry {
  rank: number
  status: ForecastStatus
  p?: number
  // Shown on the player card instead of the rounded odds.
  p_text?: string
  // The odds published before the latest event.
  p_before?: number
  p_play?: number
  // best4 percentiles (10th, 50th, 90th) are among simulated seasons that reach four valid results.
  p_four?: number
  best4?: Array<number | null>
  p_junior_title?: number
  // Finishes inside the standings spots, counting seasons where they also win the junior title.
  p_standings?: number
  // Only for juniors eligible for the national junior title.
  p_title_entry?: number
  // Only for Kenya #1 candidates while the deciding FIDE list is still to come.
  p_kenya1?: number
  factors?: ForecastFactors
  // Only for players too far off the pace to simulate; null without four results.
  best4_now?: number | null
  // For the TPR calculator: the valid TPRs that count now, highest first, and percentiles 0-100 of
  // the best 4 the other players set for the last standings spot.
  tprs?: number[]
  line?: number[]
}

export type FactorGroup = 'adults_open' | 'juniors_open' | 'women_open' | 'ladies'

// The inputs behind a player's simulated seasons. expected_tpr = (rating ?? unrated base) +
// form_adj + group_adj + lift, and sum(share * p_qualify) over by_new equals p.
export interface ForecastFactors {
  now: [number, number]
  rating: number | null
  form: number | null
  form_adj: number
  group: FactorGroup
  group_adj: number
  lift: number
  expected_tpr: number
  swing: number
  // Weakest TPR in the current best 4; null until there are four results.
  weakest: number | null
  p_improve: number | null
  entered: [number, number]
  expected_entries: number
  events_left: number
  walkover: number
  boost: 'bubble' | 'near_lock' | null
  near_lock_entry: number
  // Further events a near-locked player must enter; null without the near-lock boost.
  near_lock_needed: number | null
  // [share of seasons, chance of qualifying in them], indexed by new valid results (0 to events_left).
  by_new: Array<[number, number | null]>
}

// Kenya #1 is decided by a FIDE list (YYYY-MM); until it's out, each candidate's chance of topping it.
export interface Kenya1Race {
  list: string
  candidates: Array<{ fide_id: string; name: string | null; rating: number; p: number }>
}

export interface PlayerCategoryForecast {
  category: ForecastCategory
  entry: ForecastEntry
  cutoff: Array<number | null>
  // The median cutoff published before the latest event.
  cutoffBefore?: number
  kenya1?: Kenya1Race
}

export interface ForecastEvent {
  id: string
  name: string
  start_date: string
}

export interface PlayerForecast {
  fideId: string
  season: number
  afterEvent: string
  // Completes "Up 3 points since ...".
  since: string
  sims: number
  remaining: ForecastEvent[]
  categories: PlayerCategoryForecast[]
}

export type ChanceTier =
  | 'lock'
  | 'very-likely'
  | 'likely'
  | 'toss-up'
  | 'outside-chance'
  | 'long-shot'
  | 'unlikely'

function displayedPercent(p: number): number {
  return Math.round(p * 1000) / 10
}

// Tiers follow the displayed number so "95.0%" never reads as merely "Very likely".
export function chanceTier(p: number): ChanceTier {
  const shown = displayedPercent(p)
  if (shown >= 95) return 'lock'
  if (shown >= 85) return 'very-likely'
  if (shown >= 65) return 'likely'
  if (shown >= 35) return 'toss-up'
  if (shown >= 15) return 'outside-chance'
  if (shown >= 5) return 'long-shot'
  return 'unlikely'
}

export const TIER_LABEL: Record<ChanceTier, string> = {
  lock: 'Lock',
  'very-likely': 'Very likely',
  likely: 'Likely',
  'toss-up': 'Toss-up',
  'outside-chance': 'Outside chance',
  'long-shot': 'Long shot',
  unlikely: 'Unlikely',
}

export function formatChance(p: number): string {
  if (p >= 0.9995) return '>99.9%'
  if (p < 0.0005) return '<0.1%'
  return `${displayedPercent(p).toFixed(1)}%`
}

// Mean of the best four, or null with fewer than four (the line is always a four-result best 4).
export function bestFour(tprs: number[]): number | null {
  if (tprs.length < 4) return null
  const top = [...tprs].sort((a, b) => b - a).slice(0, 4)
  return top.reduce((sum, t) => sum + t, 0) / 4
}

// Share of simulated seasons whose line is below best4, interpolating between percentiles.
export function chanceOfBeatingLine(line: number[], best4: number | null): number {
  if (best4 === null || line.length < 2) return 0
  const last = line.length - 1
  if (best4 <= line[0]) return 0
  if (best4 > line[last]) return 1
  let i = 0
  while (line[i + 1] < best4) i++
  const low = line[i]
  const high = line[i + 1]
  return (i + (best4 - low) / (high - low)) / last
}
