#!/usr/bin/env python3
"""
Monte Carlo simulation for GP qualification probabilities.
Simulates the final tournament to estimate each player's chance of qualifying.
"""
import random
import statistics
from typing import Dict, List, Tuple
from db import Database
from collections import defaultdict

# Configuration
NUM_SIMULATIONS = 10000
QUALIFICATION_SPOTS = 10  # Top 10 qualify (Jadon already in as Kenya 1, so effectively 11)
KENYA_1_PLAYER = "Simiyu, Jadon"  # Already qualified

def get_player_tpr_stats(db: Database) -> Dict[str, Dict]:
    """Get historical TPR statistics for each player."""
    all_results = db.get_all_results()
    player_stats = {}

    for player_id, results in all_results.items():
        valid_results = [r for r in results if r['player']['federation'] == 'KEN' and
                         r.get('result_status', 'valid') == 'valid' and r.get('tpr')]

        if valid_results:
            player_name = valid_results[0]['player']['name']
            tprs = [r['tpr'] for r in valid_results]

            if len(tprs) >= 2:
                player_stats[player_name] = {
                    'mean': statistics.mean(tprs),
                    'stdev': statistics.stdev(tprs),
                    'count': len(tprs)
                }
            elif len(tprs) == 1:
                # Single tournament - use overall variance
                player_stats[player_name] = {
                    'mean': tprs[0],
                    'stdev': 268,  # Overall StdDev
                    'count': 1
                }

    return player_stats


def ranking_priority(player: Dict) -> Tuple[int, float, float]:
    """Calculate ranking priority (matches db.py logic)."""
    tournaments = player.get('tournaments_played', 0) or 0
    best_1 = player.get('best_1') or 0
    best_2 = player.get('best_2') or 0
    best_3 = player.get('best_3') or 0
    best_4 = player.get('best_4') or 0

    if tournaments >= 4 and best_4 > 0:
        return (4, best_4, best_3)
    if tournaments >= 3 and best_3 > 0:
        return (3, best_3, best_2)
    if tournaments >= 2 and best_2 > 0:
        return (2, best_2, best_1)
    if tournaments >= 1 and best_1 > 0:
        return (1, best_1, 0)
    return (0, 0, 0)


def get_player_all_tprs(db: Database) -> Dict[str, List[int]]:
    """Get all individual tournament TPRs for each player."""
    all_results = db.get_all_results()
    player_tprs = {}

    for player_id, results in all_results.items():
        valid_results = [r for r in results if r['player']['federation'] == 'KEN' and
                         r.get('result_status', 'valid') == 'valid' and r.get('tpr')]

        if valid_results:
            player_name = valid_results[0]['player']['name']
            tprs = [r['tpr'] for r in valid_results]
            player_tprs[player_name] = sorted(tprs, reverse=True)  # Sort descending

    return player_tprs


def simulate_final_tournament(
    current_rankings: List[Dict],
    player_stats: Dict[str, Dict],
    player_all_tprs: Dict[str, List[int]],
    participation_rate: float = 0.8
) -> List[Dict]:
    """
    Simulate one instance of the final tournament.

    Args:
        current_rankings: Current player rankings
        player_stats: Historical TPR statistics for each player
        player_all_tprs: All individual TPRs for each player
        participation_rate: Probability each player participates (default 80%)

    Returns:
        Simulated rankings after the final tournament
    """
    simulated_rankings = []

    for player in current_rankings:
        name = player['name']

        # Clone player data
        new_player = player.copy()

        # Skip if player doesn't participate (random chance)
        if random.random() > participation_rate:
            simulated_rankings.append(new_player)
            continue

        # Get historical stats or use defaults
        if name in player_stats:
            stats = player_stats[name]
            # Sample from normal distribution with player's historical mean/stdev
            simulated_tpr = max(600, int(random.gauss(stats['mean'], stats['stdev'])))
        else:
            # New player or no history - use overall distribution
            simulated_tpr = max(600, int(random.gauss(1582, 268)))

        # Get player's actual tournament TPRs
        if name in player_all_tprs:
            all_tprs = player_all_tprs[name] + [simulated_tpr]
        else:
            all_tprs = [simulated_tpr]

        # Sort descending to get best results
        all_tprs.sort(reverse=True)

        # Calculate new best-N averages
        new_tournaments = len(all_tprs)
        new_player['tournaments_played'] = new_tournaments

        if len(all_tprs) >= 1:
            new_player['best_1'] = all_tprs[0]
        if len(all_tprs) >= 2:
            new_player['best_2'] = sum(all_tprs[:2]) / 2
        if len(all_tprs) >= 3:
            new_player['best_3'] = sum(all_tprs[:3]) / 3
        if len(all_tprs) >= 4:
            new_player['best_4'] = sum(all_tprs[:4]) / 4

        simulated_rankings.append(new_player)

    # Sort by ranking priority
    simulated_rankings.sort(key=ranking_priority, reverse=True)

    return simulated_rankings


def run_simulation(num_simulations: int = NUM_SIMULATIONS):
    """Run Monte Carlo simulation for qualification probabilities."""
    db = Database()

    print("Loading current rankings...")
    current_rankings = db.get_all_player_rankings()
    current_rankings.sort(key=ranking_priority, reverse=True)

    print(f"Loading historical TPR statistics...")
    player_stats = get_player_tpr_stats(db)

    print(f"Loading all tournament TPRs...")
    player_all_tprs = get_player_all_tprs(db)

    print(f"\nRunning {num_simulations:,} simulations...")
    print("=" * 100)

    # Track qualification counts
    qualification_counts = defaultdict(int)
    rank_distributions = defaultdict(lambda: defaultdict(int))

    # Run simulations
    for sim in range(num_simulations):
        if (sim + 1) % 1000 == 0:
            print(f"Completed {sim + 1:,}/{num_simulations:,} simulations...", end='\r')

        simulated_rankings = simulate_final_tournament(current_rankings, player_stats, player_all_tprs)

        # Track qualifiers (top 10, excluding Kenya 1 if already in)
        qualifiers_count = 0
        for rank, player in enumerate(simulated_rankings, 1):
            name = player['name']
            rank_distributions[name][rank] += 1

            # Count qualification (top 10, or top 11 if Jadon is Kenya 1)
            if name == KENYA_1_PLAYER:
                qualification_counts[name] += 1  # Always qualifies as Kenya 1
            elif qualifiers_count < QUALIFICATION_SPOTS:
                qualification_counts[name] += 1
                qualifiers_count += 1

    print(f"\nCompleted {num_simulations:,} simulations!")
    print()

    # Output results
    print("QUALIFICATION PROBABILITIES")
    print("=" * 100)
    print(f"{'Rank':<6} {'Player':<30} {'Current Best-4':<15} {'Qualify %':<12} {'Avg Rank':<10}")
    print("-" * 100)

    # Sort by qualification probability
    results = []
    for player in current_rankings[:25]:  # Top 25 players
        name = player['name']
        current_best4 = player.get('best_4', 0)
        qual_prob = (qualification_counts[name] / num_simulations) * 100

        # Calculate average rank
        total_rank = sum(rank * count for rank, count in rank_distributions[name].items())
        avg_rank = total_rank / num_simulations if name in rank_distributions else 999

        results.append({
            'name': name,
            'current_best4': current_best4,
            'qual_prob': qual_prob,
            'avg_rank': avg_rank,
            'current_rank': current_rankings.index(player) + 1
        })

    results.sort(key=lambda x: x['qual_prob'], reverse=True)

    for i, r in enumerate(results, 1):
        marker = "🔒" if r['name'] == KENYA_1_PLAYER else ("✅" if r['qual_prob'] >= 90 else ("⚠️ " if r['qual_prob'] >= 50 else ""))
        print(f"{r['current_rank']:<6} {r['name'][:29]:<30} {r['current_best4']:<15.0f} {r['qual_prob']:<11.1f}% {r['avg_rank']:<10.1f} {marker}")

    print()
    print("Legend:")
    print("🔒 = Already qualified as Kenya 1")
    print("✅ = >90% qualification probability")
    print("⚠️  = 50-90% qualification probability")
    print()

    # Show bubble players (40-60% range)
    print("\nBUBBLE PLAYERS (closest race):")
    print("=" * 100)
    bubble_players = [r for r in results if 40 <= r['qual_prob'] <= 60]
    if bubble_players:
        for r in bubble_players:
            print(f"  • {r['name']}: {r['qual_prob']:.1f}% (currently #{r['current_rank']})")
    else:
        print("  No players in the 40-60% range - relatively clear cutoff!")


if __name__ == "__main__":
    run_simulation()
