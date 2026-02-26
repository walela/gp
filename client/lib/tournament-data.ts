import { getTournaments, type Tournament } from '@/services/api'

export interface TournamentWithStats extends Tournament {
  avgTop10TPR: number
  avgTop24Rating: number
  ladiesId?: string
}

export async function getTournamentData(season?: number): Promise<TournamentWithStats[]> {
  const tournaments = await getTournaments({ season }) as TournamentWithStats[]

  // Group open/ladies sections into single rows
  const openMap = new Map<string, TournamentWithStats>()
  const ladiesList: TournamentWithStats[] = []

  for (const t of tournaments) {
    if (t.section === 'ladies') {
      ladiesList.push(t)
    } else {
      openMap.set(t.id, t)
    }
  }

  // Link ladies sections to their open siblings
  for (const ladies of ladiesList) {
    // Convention 1: ladies ID = "{openId}_ladies"
    const baseId = ladies.id.replace(/_ladies$/, '')
    const openSibling = openMap.get(baseId)
    if (openSibling) {
      openSibling.ladiesId = ladies.id
      continue
    }

    // Convention 2: match by short_name + same start_date (e.g. Eldoret 2026)
    const match = [...openMap.values()].find(
      o => o.short_name === ladies.short_name && o.start_date === ladies.start_date
    )
    if (match) {
      match.ladiesId = ladies.id
      continue
    }

    // No sibling found — show ladies tournament as its own row
    openMap.set(ladies.id, ladies)
  }

  return [...openMap.values()]
}
