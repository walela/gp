"""
Rankings endpoints.
"""

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from typing import Optional
import csv
import io

from api.deps import get_db
from db.queries import rankings as rankings_db
from db.queries import seasons as seasons_db
from services.rankings import get_rank_change

router = APIRouter()


@router.get("/rankings")
def get_rankings(
    season: Optional[str] = Query(None, description="Season ID (defaults to active)"),
    category: Optional[str] = Query(None, description="Category: 'ladies' for women only"),
    db=Depends(get_db),
):
    """
    Get rankings for a season.

    - Default: active season, open category
    - ?category=ladies: ladies rankings only
    """
    # Get season (default to active)
    if not season:
        active = seasons_db.get_active(db)
        if not active:
            return {"rankings": [], "season": None}
        season = active["id"]

    # Get rankings
    if category == "ladies":
        rankings = rankings_db.get_ladies_by_season(db, season)
    else:
        rankings = rankings_db.get_by_season(db, season)

    # Add rank change info
    for r in rankings:
        r["rank_change"] = get_rank_change(r["current_rank"], r["previous_rank"])

    return {
        "rankings": rankings,
        "season": season,
        "category": category or "open",
    }


@router.get("/rankings/export")
def export_rankings(
    season: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    db=Depends(get_db),
):
    """Export rankings as CSV."""
    # Get season
    if not season:
        active = seasons_db.get_active(db)
        if not active:
            return {"error": "No active season"}
        season = active["id"]

    # Get rankings
    if category == "ladies":
        rankings = rankings_db.get_ladies_by_season(db, season)
    else:
        rankings = rankings_db.get_by_season(db, season)

    # Build CSV
    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow([
        "Rank", "Name", "FIDE ID", "Rating", "Tournaments",
        "Best 1", "Best 2", "Best 3", "Best 4"
    ])

    # Data rows
    for r in rankings:
        writer.writerow([
            r["current_rank"],
            r["name"],
            r["fide_id"] or "",
            r["rating"] or "",
            r["tournaments_played"],
            r["best_1"] or "",
            r["best_2"] or "",
            r["best_3"] or "",
            r["best_4"] or "",
        ])

    output.seek(0)
    filename = f"gp-rankings-{season}-{category or 'open'}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
