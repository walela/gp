import forecastJson from './qualification-forecast.json'
import type { ForecastEntry, Kenya1Race } from './qualification-odds'
import { getQualifierConfig } from './qualifiers'
import type { LiveCategory, LiveSnapshot, LiveStandings } from '@/services/api'

// Plays out the rest of the event from the live scores, using each player's expected TPR, spread and
// walkover rate from the published forecast (qualification_model.py), then applies the same
// qualification rules. Server-only: it imports the full forecast file.
interface ForecastFile {
  season: number
  categories: Record<LiveCategory, { players: Record<string, ForecastEntry>; kenya1?: Kenya1Race }>
}

const forecast = forecastJson as unknown as ForecastFile

const SIMS = 5000
const SPOTS = 9
// A woman who makes both teams takes the Ladies place, so Ladies is settled first.
const CATEGORY_ORDER: LiveCategory[] = ['ladies', 'open']

export type OddsByCategory = Record<LiveCategory, Record<string, number>>

export interface LiveOdds {
  current: OddsByCategory
  // Odds after each completed round, starting with round 1.
  rounds: OddsByCategory[]
}

function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function standingsKey(tprs: number[]): [number, number] {
  const top = [...tprs].sort((a, b) => b - a).slice(0, 4)
  if (top.length === 0) return [0, 0]
  return [top.length, Math.floor(top.reduce((sum, tpr) => sum + tpr, 0) / top.length + 0.5)]
}

function pick(random: number, options: Array<[string, number]>): string | null {
  let total = 0
  for (const [id, p] of options) {
    total += p
    if (random < total) return id
  }
  return null
}

interface Entrant {
  id: string
  section: LiveCategory
  snapshot: (round: number | null) => LiveSnapshot | null
  expected: number
  swing: number
  walkover: number
}

function entrants(data: LiveStandings): Entrant[] {
  const byId = new Map<string, Entrant>()
  for (const category of CATEGORY_ORDER) {
    for (const player of data.categories[category]) {
      const live = player.live
      if (!live || !player.fide_id || byId.has(player.fide_id)) continue
      const players = forecast.categories
      const factors = (players[live.section].players[player.fide_id] ?? players[category].players[player.fide_id])?.factors
      if (!factors) continue
      const history = live.rounds ?? []
      byId.set(player.fide_id, {
        id: player.fide_id,
        section: live.section,
        snapshot: round => round === null ? live : history[Math.min(round, history.length) - 1] ?? null,
        expected: factors.expected_tpr,
        swing: factors.swing,
        walkover: factors.walkover,
      })
    }
  }
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id))
}

// round null uses every game played so far, including the round in progress.
function simulate(data: LiveStandings, players: Entrant[], round: number | null): OddsByCategory {
  const random = seededRandom(1700)
  const total = data.rounds
  const categories = CATEGORY_ORDER.map(category => {
    const { players: entries, kenya1 } = forecast.categories[category]
    const config = getQualifierConfig(forecast.season, category)
    const contenders = Object.entries(entries).filter(([, entry]) => entry.status === 'forecast' && entry.tprs)
    return {
      category,
      contenders,
      excluded: new Set(config?.excluded ?? []),
      kenya1Options: kenya1 ? kenya1.candidates.map(c => [c.fide_id, c.p] as [string, number]) : null,
      kenya1Fixed: config?.kenyaNumber1 ?? null,
      juniorFixed: config?.juniorChampion ?? null,
      juniorOptions: contenders.map(([id, entry]) => [id, entry.p_junior_title ?? 0] as [string, number]),
      counts: new Map<string, number>(),
    }
  })

  for (let sim = 0; sim < SIMS; sim++) {
    // Every draw is taken whether it's used or not, so each round's odds share the same simulated seasons.
    const results = new Map<string, { tpr: number; section: LiveCategory }>()
    for (const player of players) {
      const voidDraw = random()
      const z = Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(2 * Math.PI * random())
      const live = player.snapshot(round)
      if (!live || live.status !== 'valid' || (live.tpr === null && live.games > 0)) continue
      const played = live.tpr ?? 0
      const left = Math.max(total - live.games, 0)
      if (left === 0) {
        results.set(player.id, { tpr: played, section: player.section })
        continue
      }
      if (voidDraw < player.walkover * left / total) continue
      const mean = (live.games * played + left * player.expected) / total
      results.set(player.id, {
        tpr: Math.round(mean + z * player.swing * Math.sqrt(left / total)),
        section: player.section,
      })
    }

    const takenByLadies = new Set<string>()
    for (const category of categories) {
      const kenya1Draw = random()
      const juniorDraw = random()
      const kenya1 = category.kenya1Options ? pick(kenya1Draw, category.kenya1Options) : category.kenya1Fixed
      const junior = category.juniorFixed ?? pick(juniorDraw, category.juniorOptions)

      const order = category.contenders
        .map(([id, entry]) => {
          const result = results.get(id)
          const counts = result && (category.category === 'ladies' || result.section === 'open')
          return { id, key: standingsKey(counts ? [...entry.tprs!, result.tpr] : entry.tprs!) }
        })
        .sort((a, b) => b.key[0] - a.key[0] || b.key[1] - a.key[1] || a.id.localeCompare(b.id))

      const qualified = new Set([kenya1, junior].filter((id): id is string => id !== null))
      let open = SPOTS + (kenya1 !== null && kenya1 === junior ? 1 : 0)
      for (const { id } of order) {
        if (open === 0) break
        if (qualified.has(id) || category.excluded.has(id)) continue
        if (category.category === 'open' && takenByLadies.has(id)) continue
        qualified.add(id)
        open--
      }
      for (const id of qualified) {
        category.counts.set(id, (category.counts.get(id) ?? 0) + 1)
        if (category.category === 'ladies') takenByLadies.add(id)
      }
    }
  }

  const odds = { open: {}, ladies: {} } as OddsByCategory
  for (const category of categories) {
    for (const [id] of category.contenders) {
      odds[category.category][id] = (category.counts.get(id) ?? 0) / SIMS
    }
  }
  return odds
}

const cache = new Map<string, LiveOdds>()

export function getLiveOdds(data: LiveStandings): LiveOdds | null {
  if (forecast.season !== Number(data.updated_at.slice(0, 4))) return null
  const cached = cache.get(data.updated_at)
  if (cached) return cached

  try {
    const players = entrants(data)
    const completed = Math.max(...Object.values(data.sections).map(section => section?.completed_round ?? 0))
    const odds: LiveOdds = {
      current: simulate(data, players, null),
      rounds: Array.from({ length: completed }, (_, index) => simulate(data, players, index + 1)),
    }
    cache.clear()
    cache.set(data.updated_at, odds)
    return odds
  } catch (error) {
    console.error('live_odds_failed', error)
    return null
  }
}
