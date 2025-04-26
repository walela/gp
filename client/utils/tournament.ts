/**
 * Utility functions for tournament-related operations
 */

/**
 * Get a shortened version of a tournament name for display in space-constrained contexts
 * @param fullName The full tournament name
 * @returns A shortened version of the tournament name
 */
export const getShortTournamentName = (fullName: string): string => {
  // Special cases for known tournaments
  const specialCases: Record<string, string> = {
    "Eldoret Chess Championships Open": "Eldoret Open",
    "Mavens Open Chess Championship 2025": "Mavens Open",
    "Waridi Chess Festival 2025": "Waridi Chess Festival",
    "Waridi Chess Festival": "Waridi Chess Festival",
    "Kisumu Open Chess Tournament": "Kisumu Open"
  };

  // Check if we have a special case for this tournament
  if (specialCases[fullName]) {
    return specialCases[fullName];
  }

  // Common patterns to remove
  const patterns = [
    / Chess Championship( \d+)?$/i,
    / Chess Tournament( \d+)?$/i,
    / Chess Festival( \d+)?$/i,
    / Championships?( \d+)?$/i,
    / \d{4}$/
  ];
  
  let shortName = fullName;
  
  // Apply each pattern
  patterns.forEach(pattern => {
    shortName = shortName.replace(pattern, '');
  });
  
  // If the name is still long, take just the first two words
  const words = shortName.split(' ');
  if (words.length > 2) {
    shortName = words.slice(0, 2).join(' ');
  }

  // Make sure we keep "Open" if it's in the original name
  if (fullName.toLowerCase().includes(" open") && !shortName.toLowerCase().includes("open")) {
    shortName += " Open";
  }
  
  return shortName.trim();
};
