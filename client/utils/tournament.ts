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
  'Kiambu Open': 'Kiambu Open'
}

export function getShortTournamentName(name: string): string {
  return SHORT_NAMES[name] || name
}
