"""
Player endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException

from api.deps import get_db
from db.queries import players as players_db
from db.queries import results as results_db
from db.queries import rankings as rankings_db

router = APIRouter()


@router.get("/player/{identifier}")
def get_player(identifier: str, db=Depends(get_db)):
    """
    Get player profile with tournament history and rankings.

    Identifier can be:
    - FIDE ID (numeric string like "10800018")
    - Internal player ID (integer)
    """
    # Try FIDE ID first (more common in URLs)
    player = players_db.get_by_fide_id(db, identifier)

    # Fall back to internal ID
    if not player:
        try:
            player_id = int(identifier)
            player = players_db.get_by_id(db, player_id)
        except ValueError:
            pass

    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    # Get tournament results
    results = results_db.get_by_player(db, player["id"])

    # Get rankings across seasons
    rankings = rankings_db.get_by_player(db, player["id"])

    # Group results by season for display
    results_by_season = {}
    for r in results:
        season = r.get("season_id") or "unknown"
        if season not in results_by_season:
            results_by_season[season] = []
        results_by_season[season].append(r)

    return {
        "player": player,
        "results": results,
        "results_by_season": results_by_season,
        "rankings": rankings,
    }
