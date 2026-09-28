export type ForecastCategory = 'open' | 'ladies'
export type ForecastStatus = 'forecast' | 'kenya1' | 'junior_champion'

export interface ForecastEntry {
  rank: number
  status: ForecastStatus
  p?: number
  // Same model, on the morning of the latest event.
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
  factors?: ForecastFactors
  // Only for players too far off the pace to simulate; null without four results.
  best4_now?: number | null
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
  // [share of seasons, chance of qualifying in them], indexed by new valid results (0 to events_left).
  by_new: Array<[number, number | null]>
}

export interface PlayerCategoryForecast {
  category: ForecastCategory
  entry: ForecastEntry
  cutoff: Array<number | null>
}

export interface PlayerForecast {
  season: number
  afterEvent: string
  sims: number
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
