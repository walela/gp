import { PlayerRanking } from '@/services/api';
import { shouldExcludePlayerTpr } from '@/utils/tournament';

/**
 * Hook to filter and process player rankings
 * Handles exclusion of invalid TPRs from specific tournaments
 */
export function usePlayerRankings(rankings: PlayerRanking[]) {
  // Process rankings to exclude invalid TPRs
  const processedRankings = rankings.map(player => {
    // For now, we only need to handle Alex's invalid TPR from Eldoret Open
    // If the player's best tournament is Eldoret Open and they're Alex, we need to adjust
    if (player.name === 'Magana Alex' && player.tournament_1?.includes('Eldoret')) {
      // We need to create a copy to avoid mutating the original data
      return {
        ...player,
        // Mark the tournament as invalid in the name
        tournament_1: player.tournament_1 ? `${player.tournament_1} (invalid)` : null,
      };
    }
    
    return player;
  });
  
  return processedRankings;
}
