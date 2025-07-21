/**
 * Utility functions for tournament-related operations
 */

/**
 * Get a shortened version of a tournament name for display in space-constrained contexts
 * @param name The full tournament name
 * @returns A shortened version of the tournament name
 */
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

  // Parse dates
  const start = new Date(startDate)
  const end = endDate ? new Date(endDate) : null

  // Format options
  const options: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', year: 'numeric' }

  // Format start date
  const startFormatted = start.toLocaleDateString('en-US', options)

  // If no end date or same as start date, return just start date
  if (!end || startDate === endDate) {
    return startFormatted
  }

  // If same month and year, just show the day for end date
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${start.toLocaleDateString('en-US', { month: 'long' })} ${start.getDate()}-${end.getDate()}, ${start.getFullYear()}`
  }

  // Otherwise show full end date
  return `${startFormatted} - ${end.toLocaleDateString('en-US', options)}`
}

/**
 * Format a tournament date range with ordinal suffixes (1st, 2nd, etc.)
 * @param startDate Start date string in ISO format (YYYY-MM-DD)
 * @param endDate Optional end date string in ISO format (YYYY-MM-DD)
 * @returns Formatted date string with ordinal suffixes
 */
export function formatTournamentDateWithOrdinals(startDate?: string, endDate?: string): string {
  if (!startDate) return 'TBD'

  // Parse dates
  const start = new Date(startDate)
  const end = endDate ? new Date(endDate) : null

  // Format start date with ordinal
  const startDay = formatOrdinal(start.getDate())
  const startMonth = start.toLocaleDateString('en-US', { month: 'long' })
  const startYear = start.getFullYear()
  
  // If no end date or same as start date, return just start date
  if (!end || startDate === endDate) {
    return `${startMonth} ${startDay}, ${startYear}`
  }

  // If same month and year, just show the day range
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    const endDay = formatOrdinal(end.getDate())
    return `${startMonth} ${startDay}-${endDay}, ${startYear}`
  }

  // Different months or years
  const endDay = formatOrdinal(end.getDate())
  const endMonth = end.toLocaleDateString('en-US', { month: 'long' })
  const endYear = end.getFullYear()
  
  return `${startMonth} ${startDay}, ${startYear} - ${endMonth} ${endDay}, ${endYear}`
}
