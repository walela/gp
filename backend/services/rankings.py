"""
Ranking calculation service.

The GP ranking system:
1. Get all valid TPR scores for KEN players in a season
2. For each player, take their best 4 TPR scores
3. Rank by cascading sort: best_1, best_2, best_3, best_4, tournaments_played
"""

from collections import defaultdict
from typing import Optional

from db.queries import rankings as rankings_db
from db.queries import results as results_db


def recalculate(conn, season_id: str) -> int:
    """
    Recalculate all rankings for a season.

    Args:
        conn: Database connection
        season_id: The season to recalculate

    Returns:
        Number of players ranked
    """
    # Get current ranks before we update (for previous_rank tracking)
    previous_ranks = rankings_db.get_previous_ranks(conn, season_id)

    # Get all valid results for Kenyan players
    all_results = results_db.get_valid_kenyan_results_for_season(conn, season_id)

    # Group results by player
    player_results = defaultdict(list)
    player_info = {}

    for r in all_results:
        player_id = r["player_id"]
        player_results[player_id].append(r)

        # Store player info (name, fide_id, etc.) - last one wins but they should all be same
        player_info[player_id] = {
            "name": r["name"],
            "fide_id": r["fide_id"],
            "sex": r["sex"],
        }

    # Calculate rankings for each player
    ranking_data = []

    for player_id, results in player_results.items():
        # Sort by TPR descending, take best 4
        sorted_results = sorted(results, key=lambda x: x["tpr"] or 0, reverse=True)
        best_4 = sorted_results[:4]

        # Extract TPR values
        tprs = [r["tpr"] for r in best_4]
        best_1 = tprs[0] if len(tprs) > 0 else None
        best_2 = tprs[1] if len(tprs) > 1 else None
        best_3 = tprs[2] if len(tprs) > 2 else None
        best_4_val = tprs[3] if len(tprs) > 3 else None

        # Get tournament name for best result
        tournament_1 = best_4[0]["tournament_name"] if best_4 else None

        # Get latest rating (from most recent tournament)
        latest_result = max(results, key=lambda x: x.get("start_date") or "")
        rating = latest_result.get("rating")

        info = player_info[player_id]

        ranking_data.append({
            "player_id": player_id,
            "name": info["name"],
            "fide_id": info["fide_id"],
            "rating": rating,
            "tournaments_played": len(results),
            "best_1": best_1,
            "tournament_1": tournament_1,
            "best_2": best_2,
            "best_3": best_3,
            "best_4": best_4_val,
            "previous_rank": previous_ranks.get(player_id),
        })

    # Sort by cascading criteria
    ranking_data.sort(key=lambda x: _sort_key(x), reverse=True)

    # Assign ranks and save
    for i, data in enumerate(ranking_data, start=1):
        data["current_rank"] = i
        rankings_db.upsert(
            conn,
            player_id=data["player_id"],
            season_id=season_id,
            name=data["name"],
            fide_id=data["fide_id"],
            rating=data["rating"],
            tournaments_played=data["tournaments_played"],
            best_1=data["best_1"],
            tournament_1=data["tournament_1"],
            best_2=data["best_2"],
            best_3=data["best_3"],
            best_4=data["best_4"],
            current_rank=data["current_rank"],
            previous_rank=data["previous_rank"],
        )

    return len(ranking_data)


def _sort_key(data: dict) -> tuple:
    """
    Generate sort key for ranking.

    Cascading order:
    1. best_1 (highest single TPR)
    2. best_2
    3. best_3
    4. best_4
    5. tournaments_played (more is better tiebreaker)

    Returns tuple for comparison (higher is better).
    """
    return (
        data["best_1"] or 0,
        data["best_2"] or 0,
        data["best_3"] or 0,
        data["best_4"] or 0,
        data["tournaments_played"] or 0,
    )


def get_rank_change(current: int, previous: Optional[int]) -> Optional[int]:
    """
    Calculate rank change for display.

    Returns:
        Positive = moved down (worse), Negative = moved up (better), None = new entry
    """
    if previous is None:
        return None
    return current - previous
