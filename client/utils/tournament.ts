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
  'Eldoret Open': 'Eldoret Open',
  'Eldoret  Chess Championships Open': 'Eldoret Open',
  'Kisumu Open': 'Kisumu Open',
  'Kisumu Open Chess Tournament': 'Kisumu Open',
  'Mavens Open': 'Mavens Open',
  'Mavens Open Chess Championship 2025': 'Mavens Open',
  'The East Africa Chess Championship - Nakuru Grand Prix 2025': 'Nakuru Open',
  'The East Africa Chess Championship Nakuru Grand Prix 2025': 'Nakuru Open',
  'Waridi Chess Festival': 'Waridi Chess Festival',
  'Waridi Chess Festival 2025': 'Waridi Chess Festival',
  'Kiambu Open Grand Prix Chess Championship 2025': 'Kiambu Open',
  'Kiambu Open': 'Kiambu Open',
  'Nairobi County Chess Championship 2025': 'Nairobi County Open',
  'Nairobi County Open': 'Nairobi County Open',
  'QUO VADIS OPEN 2025': 'Quo Vadis Nyeri Open',
  'KITALE OPEN CHESS TOURNAMENT OPEN': 'Kitale Open',
  'Mombasa International Chess Festival 2025': 'Mombasa Chess Festival'
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
    return `${start.format('MMM Do')}-${end.format('Do')}`
  }

  return `${start.format('MMM Do')} - ${end!.format('MMM Do')}`
}
