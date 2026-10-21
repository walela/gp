import qualifiers from './qualifiers.json'

export type QualifierCategory = 'open' | 'ladies'

export interface QualifierConfig {
  kenyaNumber1?: string
  // FIDE list (YYYY-MM) that decides Kenya #1; until it's out, kenyaNumber1 is the current leader.
  kenyaNumber1List?: string
  juniorChampion?: string
  excluded?: string[]
}

// Kenya #1, junior champion and players left out of the standings, per season and category.
// The qualification forecast (qualification_model.py) reads the same file.
const config: Record<string, Partial<Record<QualifierCategory, QualifierConfig>>> = qualifiers

export function getQualifierConfig(season: number, category: QualifierCategory): QualifierConfig | undefined {
  return config[String(season)]?.[category]
}
