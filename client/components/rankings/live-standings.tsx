import { getLiveOdds } from '@/lib/live-odds'
import { getQualifierConfig } from '@/lib/qualifiers'
import { formatChance, type ForecastEntry } from '@/lib/qualification-odds'
import type { LiveCategory, LiveStandings as LiveStandingsData } from '@/services/api'
import { LiveStandingsView, type LiveCategoryView, type LiveRow } from '@/components/rankings/live-standings-view'

const SPOTS = 9
// Odds below this aren't worth a row.
const CONTENDER_ODDS = 0.005

// Players whose odds have stayed at >99.9% (or <0.1%) all event.
function isSettled(row: LiveRow): boolean {
  const odds = [row.before, row.odds, ...row.rounds.map(round => round.odds)]
  if (odds.some(p => p === null)) return false
  const shown = new Set(odds.map(p => formatChance(p as number)))
  return shown.size === 1 && (shown.has('>99.9%') || shown.has('<0.1%'))
}

function categoryView(
  data: LiveStandingsData,
  category: LiveCategory,
  season: number,
  odds: ReturnType<typeof getLiveOdds>,
  published: Record<string, ForecastEntry> | null
): LiveCategoryView | null {
  const section = data.sections[category] ?? data.sections.open
  if (!section) return null

  const qualifiers = getQualifierConfig(season, category)
  const excluded = new Set(qualifiers?.excluded ?? [])
  const kenyaNumber1 = qualifiers?.kenyaNumber1 ?? null
  const juniorChampion = qualifiers?.juniorChampion ?? null

  const eligible = data.categories[category].filter(player => !player.fide_id || !excluded.has(player.fide_id))
  const leaders = eligible.slice(0, SPOTS).map(player => player.fide_id)
  const specialsInTop = [kenyaNumber1, juniorChampion].filter(id => id && leaders.includes(id)).length
  const qualifying = new Set(eligible.slice(0, SPOTS + specialsInTop).map(player => player.fide_id))

  const current = odds?.current[category] ?? {}
  const isContender = (id: string | null) =>
    id !== null && ((current[id] ?? 0) >= CONTENDER_ODDS || (published?.[id]?.p ?? 0) >= CONTENDER_ODDS)

  const rows: LiveRow[] = eligible
    .filter(player =>
      qualifying.has(player.fide_id) ||
      isContender(player.fide_id) ||
      (player.rank_before !== null && player.rank_before <= SPOTS + specialsInTop) ||
      (!odds && player.rank <= 20)
    )
    .map(player => {
      const id = player.fide_id
      const live = player.live
      return {
        id: id ?? player.name,
        fideId: id,
        name: player.name,
        rank: player.rank,
        qualifying: qualifying.has(id),
        kenyaNumber1: id !== null && id === kenyaNumber1,
        points: live?.games ? live.points : null,
        games: live?.games || null,
        tpr: live?.tpr ?? null,
        voided: live !== null && live.status !== 'valid',
        odds: id !== null && id in current ? current[id] : null,
        before: id !== null ? published?.[id]?.p ?? null : null,
        rounds: (odds?.rounds ?? []).map((round, index) => {
          const snapshot = live?.rounds?.[index]
          return {
            odds: id !== null && id in round[category] ? round[category][id] : null,
            game: snapshot?.game ?? null,
            points: snapshot?.points ?? null,
            tpr: snapshot?.tpr ?? null,
          }
        }),
      }
    })

  const shownRows = rows.filter(row => !isSettled(row))
  if (shownRows.length === 0) return null
  return {
    rows: shownRows,
    completedRound: section.completed_round,
    pairedRound: section.paired_round,
  }
}

interface LiveStandingsProps {
  data: LiveStandingsData
  category: LiveCategory
  season: number
  published: Record<LiveCategory, Record<string, ForecastEntry> | null>
}

export function LiveStandings({ data, category, season, published }: LiveStandingsProps) {
  const odds = getLiveOdds(data)
  const views = {
    open: categoryView(data, 'open', season, odds, published.open),
    ladies: categoryView(data, 'ladies', season, odds, published.ladies),
  }
  if (!views.open && !views.ladies) return null

  return (
    <LiveStandingsView
      event={data.event}
      rounds={data.rounds}
      views={views}
      initialCategory={views[category] ? category : 'open'}
    />
  )
}
