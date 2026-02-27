/**
 * Utility functions for tournament-related operations
 */

/**
 * Get a shortened version of a tournament name for display in space-constrained contexts
 * @param name The full tournament name
 * @returns A shortened version of the tournament name
 */
import dayjs from '@/lib/dayjs'

export const SHORT_NAMES: Record<string, string> = {
  // Eldoret
  'Eldoret  Chess Championships Open': 'Eldoret Open',
  'Eldoret  Chess Championships Open - Ladies': 'Eldoret Open',
  '2026 Eldoret Open Chess Championship Grand Prix': 'Eldoret Open',
  '2026 Eldoret Open Chess Championship Grand Prix - Ladies': 'Eldoret Open',
  // Kisumu
  'Kisumu Open Chess Tournament': 'Kisumu Open',
  'Kisumu Open Chess Tournament - Ladies': 'Kisumu Open',
  // Mavens
  'Mavens Open Chess Championship 2025': 'Mavens Open',
  // Nakuru
  'The East Africa Chess Championship - Nakuru Grand Prix 2025': 'Nakuru Open',
  'The East Africa Chess Championship Nakuru Grand Prix 2025': 'Nakuru Open',
  'The East Africa Chess Championship - Nakuru Grand Prix 2025 - Ladies': 'Nakuru Open',
  'Nakuru Open 2025 (Nov)': 'Nakuru Open (Nov)',
  'Nakuru Open 2025 (Nov) - Ladies': 'Nakuru Open (Nov)',
  // Waridi
  'Waridi Chess Festival 2025': 'Waridi Chess Festival',
  // Kiambu
  'Kiambu Open Grand Prix Chess Championship 2025': 'Kiambu Open',
  'Kiambu Open Grand Prix Chess Championship 2025 - Ladies': 'Kiambu Open',
  // Nairobi County
  'Nairobi County Chess Championship 2025': 'Nairobi County Open',
  // Quo Vadis
  'QUO VADIS OPEN 2025': 'Quo Vadis Nyeri Open',
  // Kitale
  'KITALE OPEN CHESS TOURNAMENT OPEN': 'Kitale Open',
  'KITALE OPEN CHESS TOURNAMENT - LADIES': 'Kitale Open',
  // JYAM
  'JYAM Open 2025': 'JYAM Open',
  'JYAM Open 2025 - Ladies': 'JYAM Open',
  // KCB
  'KCB Chess Open 2025': 'KCB Chess Open',
  'KCB Chess Open 2025 - Ladies': 'KCB Chess Open',
  // Mombasa
  'Mombasa Open Chess Championship 2025 Open': 'Mombasa Chess Festival',
  'Mombasa Open Chess Championship 2025 - Ladies': 'Mombasa Chess Festival',
  'Mombasa International Chess Festival 2025': 'Mombasa Chess Festival',
  'Mombasa International Chess Festival 2025 - Ladies': 'Mombasa Chess Festival',
  // Bungoma
  '2025 Bungoma Open Chess Championship': 'Bungoma Open',
  '2025 Bungoma Open Chess Championship - Ladies': 'Bungoma Open',
  // Chess Through Challenges
  'Chess Through Challenges': 'Chess Through Challenges',
}

export function getShortTournamentName(name: string): string {
  return SHORT_NAMES[name] || name
}

/**
 * Infer a tournament location from its name when explicit metadata is missing.
 */
export function inferTournamentLocation(name?: string): string {
  if (!name) return 'Nairobi'

  const normalizedName = name.trim().toUpperCase()

  if (normalizedName.includes('ELDORET')) return 'Eldoret'
  if (normalizedName.includes('KISUMU')) return 'Kisumu'
  if (normalizedName.includes('WARIDI')) return 'Nairobi'
  if (normalizedName.includes('MAVENS')) return 'Nairobi'
  if (normalizedName.includes('NAKURU')) return 'Nakuru'
  if (normalizedName.includes('QUO VADIS')) return 'Nyeri'
  if (normalizedName.includes('KIAMBU')) return 'Kiambu'
  if (normalizedName.includes('KITALE')) return 'Kitale'
  if (normalizedName.includes('MOMBASA')) return 'Mombasa'
  if (normalizedName.includes('BUNGOMA')) return 'Bungoma'

  return 'Nairobi'
}

/**
 * Format a day number with ordinal suffix (1st, 2nd, 3rd, etc.)
 * @param day The day number
 * @returns The day with ordinal suffix
 */
export function formatOrdinal(day: number): string {
  if (day >= 11 && day <= 13) {
    return day + 'th'
  }
  
  switch (day % 10) {
    case 1:
      return day + 'st'
    case 2:
      return day + 'nd'
    case 3:
      return day + 'rd'
    default:
      return day + 'th'
  }
}

/**
 * Format a tournament date range in a consistent way
 * @param startDate Start date string in ISO format (YYYY-MM-DD)
 * @param endDate Optional end date string in ISO format (YYYY-MM-DD)
 * @returns Formatted date string
 */
export function formatTournamentDate(startDate?: string, endDate?: string): string {
  if (!startDate) return 'TBD'

  const start = dayjs(startDate)
  const end = endDate ? dayjs(endDate) : null

  if (!end || start.isSame(end, 'day')) {
    return start.format('MMMM D, YYYY')
  }

  if (start.isSame(end, 'month')) {
    return `${start.format('MMMM D')}-${end.format('D')}, ${start.format('YYYY')}`
  }

  return `${start.format('MMMM D, YYYY')} - ${end!.format('MMMM D, YYYY')}`
}

/**
 * Format a tournament date range with ordinal suffixes (1st, 2nd, etc.)
 * @param startDate Start date string in ISO format (YYYY-MM-DD)
 * @param endDate Optional end date string in ISO format (YYYY-MM-DD)
 * @returns Formatted date string with ordinal suffixes
 */
export function formatTournamentDateWithOrdinals(startDate?: string, endDate?: string): string {
  if (!startDate) return 'TBD'

  const start = dayjs(startDate)
  const end = endDate ? dayjs(endDate) : null

  if (!end || start.isSame(end, 'day')) {
    return start.format('MMM Do')
  }

  if (start.isSame(end, 'month')) {
    return `${start.format('MMM Do')}–${end.format('Do')}`
  }

  return `${start.format('MMM Do')} – ${end!.format('MMM Do')}`
}
