"""
Tournament endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional

from api.deps import get_db
from db.queries import tournaments as tournaments_db
from db.queries import results as results_db
from db.queries import seasons as seasons_db

router = APIRouter()


@router.get("/tournaments")
def list_tournaments(
    season: Optional[str] = Query(None, description="Season ID"),
    db=Depends(get_db),
):
    """List tournaments, optionally filtered by season."""
    if not season:
        active = seasons_db.get_active(db)
        if active:
            season = active["id"]

    if season:
        tournaments = tournaments_db.get_by_season(db, season)
    else:
        # No season filter - return empty for now
        tournaments = []

    return {
        "tournaments": tournaments,
        "season": season,
    }


@router.get("/tournament/{tournament_id}")
def get_tournament(tournament_id: str, db=Depends(get_db)):
    """
    Get tournament details with all results.

    Shows ALL players (not just KEN) for full tournament context.
    """
    tournament = tournaments_db.get_by_id(db, tournament_id)
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")

    results = results_db.get_by_tournament(db, tournament_id)

    return {
        "tournament": tournament,
        "results": results,
    }


@router.get("/seasons")
def list_seasons(db=Depends(get_db)):
    """List all seasons."""
    seasons = seasons_db.get_all(db)
    return {"seasons": seasons}
