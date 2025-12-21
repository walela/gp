"""
Admin endpoints (protected).

These endpoints handle:
- Scraping tournaments
- Managing seasons
- Editing player/tournament data
- Recalculating rankings
"""

import os
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from typing import Optional

from api.deps import get_db
from db.queries import seasons as seasons_db
from db.queries import tournaments as tournaments_db
from db.queries import players as players_db
from db.queries import results as results_db
from services import rankings as rankings_service
from scraper import fetch_tournament_page, parse_tournament, enrich_tournament

router = APIRouter()


# Simple password auth via header
def verify_admin(x_admin_password: str = Header(None)):
    """Verify admin password from header."""
    expected = os.environ.get("ADMIN_PASSWORD")
    if not expected:
        raise HTTPException(status_code=500, detail="ADMIN_PASSWORD not configured")
    if x_admin_password != expected:
        raise HTTPException(status_code=401, detail="Invalid admin password")
    return True


# --- Scraping ---

class ScrapeRequest(BaseModel):
    tournament_id: str
    season_id: str
    section_type: Optional[str] = None  # 'open', 'ladies', etc.


@router.get("/scrape/preview/{tournament_id}")
def preview_scrape(tournament_id: str, _=Depends(verify_admin)):
    """
    Preview what would be scraped from a tournament.

    Returns tournament name, player count, and related sections.
    """
    try:
        html = fetch_tournament_page(tournament_id)
        tournament = parse_tournament(html, tournament_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch: {str(e)}")

    return {
        "id": tournament.id,
        "name": tournament.name,
        "rounds": tournament.rounds,
        "start_date": tournament.start_date,
        "end_date": tournament.end_date,
        "player_count": len(tournament.results),
        "related_sections": [
            {"name": s.name, "tournament_id": s.tournament_id}
            for s in tournament.related_sections
        ],
    }


@router.post("/scrape")
def scrape_tournament(req: ScrapeRequest, db=Depends(get_db), _=Depends(verify_admin)):
    """
    Scrape a tournament and save to database.

    1. Fetches tournament page
    2. Parses all players and results
    3. Creates/updates players
    4. Creates tournament record
    5. Creates result records
    """
    # Auto-create season if it doesn't exist
    season = seasons_db.get_by_id(db, req.season_id)
    if not season:
        seasons_db.create(
            db,
            season_id=req.season_id,
            name=f"{req.season_id} Grand Prix Season",
            is_active=(req.season_id == "2026"),  # 2026 is current
        )

    # Check if already scraped
    if tournaments_db.exists(db, req.tournament_id):
        raise HTTPException(status_code=400, detail="Tournament already exists")

    # Fetch and parse
    try:
        html = fetch_tournament_page(req.tournament_id)
        tournament = parse_tournament(html, req.tournament_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Scrape failed: {str(e)}")

    # Create tournament record
    tournaments_db.create(
        db,
        tournament_id=tournament.id,
        name=tournament.name,
        season_id=req.season_id,
        section_type=req.section_type,
        rounds=tournament.rounds,
        start_date=tournament.start_date,
        end_date=tournament.end_date,
    )

    # Process each result
    players_created = 0
    results_created = 0

    for result in tournament.results:
        # Get or create player
        player_id = players_db.get_or_create(
            db,
            name=result.player.name,
            federation=result.player.federation,
            sex=result.player.sex,
            fide_id=result.player.fide_id,
        )

        # Create result
        results_db.create(
            db,
            tournament_id=tournament.id,
            player_id=player_id,
            rating=result.rating,
            points=result.points,
            tpr=result.tpr,
            rank=result.rank,
            start_rank=result.start_rank,
        )
        results_created += 1

    return {
        "success": True,
        "tournament_id": tournament.id,
        "tournament_name": tournament.name,
        "results_created": results_created,
    }


@router.post("/enrich/{tournament_id}")
def enrich_tournament_data(tournament_id: str, db=Depends(get_db), _=Depends(verify_admin)):
    """
    Enrich a tournament with FIDE IDs and walkover detection.

    Fetches player detail pages for results missing FIDE IDs or walkover status.
    This is slow (one HTTP request per player) so run after initial scrape.
    """
    # Check tournament exists
    tournament = tournaments_db.get_by_id(db, tournament_id)
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")

    # Get results needing enrichment
    needs_enrichment = results_db.get_results_needing_enrichment(db, tournament_id)
    if not needs_enrichment:
        return {"success": True, "message": "No results need enrichment", "enriched": 0}

    # Get start numbers for enrichment
    start_numbers = [r["start_rank"] for r in needs_enrichment]

    # Build a map of start_rank -> (player_id, current_fide_id)
    player_map = {
        r["start_rank"]: {"player_id": r["player_id"], "fide_id": r["fide_id"]}
        for r in needs_enrichment
    }

    # Fetch enrichment data
    try:
        enriched_data = enrich_tournament(tournament_id, start_numbers)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Enrichment failed: {str(e)}")

    # Apply enrichment
    fide_ids_updated = 0
    walkovers_found = 0

    for data in enriched_data:
        snr = data["start_number"]
        if snr not in player_map:
            continue

        player_id = player_map[snr]["player_id"]
        current_fide_id = player_map[snr]["fide_id"]

        # Update FIDE ID if found and not already set
        if data.get("fide_id") and not current_fide_id:
            players_db.update_fide_id(db, player_id, data["fide_id"])
            fide_ids_updated += 1

        # Update walkover status
        if data.get("has_walkover") is not None:
            results_db.update_walkover_status(db, tournament_id, player_id, data["has_walkover"])
            if data["has_walkover"]:
                walkovers_found += 1

    return {
        "success": True,
        "tournament_id": tournament_id,
        "players_checked": len(enriched_data),
        "fide_ids_updated": fide_ids_updated,
        "walkovers_found": walkovers_found,
    }


# --- Seasons ---

class CreateSeasonRequest(BaseModel):
    id: str
    name: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_active: bool = False


@router.post("/season")
def create_season(req: CreateSeasonRequest, db=Depends(get_db), _=Depends(verify_admin)):
    """Create a new season."""
    if seasons_db.get_by_id(db, req.id):
        raise HTTPException(status_code=400, detail="Season already exists")

    seasons_db.create(
        db,
        season_id=req.id,
        name=req.name,
        start_date=req.start_date,
        end_date=req.end_date,
        is_active=req.is_active,
    )

    return {"success": True, "season_id": req.id}


@router.post("/season/{season_id}/activate")
def activate_season(season_id: str, db=Depends(get_db), _=Depends(verify_admin)):
    """Set a season as active (deactivates all others)."""
    if not seasons_db.get_by_id(db, season_id):
        raise HTTPException(status_code=404, detail="Season not found")

    seasons_db.set_active(db, season_id)
    return {"success": True, "active_season": season_id}


# --- Rankings ---

@router.post("/rankings/recalculate")
def recalculate_rankings(
    season_id: Optional[str] = None,
    db=Depends(get_db),
    _=Depends(verify_admin),
):
    """
    Recalculate rankings for a season.

    Defaults to active season if not specified.
    """
    if not season_id:
        active = seasons_db.get_active(db)
        if not active:
            raise HTTPException(status_code=400, detail="No active season")
        season_id = active["id"]

    count = rankings_service.recalculate(db, season_id)

    return {
        "success": True,
        "season_id": season_id,
        "players_ranked": count,
    }


# --- Player/Tournament editing ---

class UpdatePlayerRequest(BaseModel):
    name: Optional[str] = None
    federation: Optional[str] = None
    sex: Optional[str] = None
    fide_id: Optional[str] = None


@router.patch("/player/{player_id}")
def update_player(
    player_id: int,
    req: UpdatePlayerRequest,
    db=Depends(get_db),
    _=Depends(verify_admin),
):
    """Update player data."""
    player = players_db.get_by_id(db, player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    # Update fields that were provided
    if req.fide_id is not None:
        players_db.update_fide_id(db, player_id, req.fide_id)
    if req.sex is not None:
        players_db.update_sex(db, player_id, req.sex)

    return {"success": True, "player_id": player_id}


class UpdateTournamentRequest(BaseModel):
    name: Optional[str] = None
    season_id: Optional[str] = None
    section_type: Optional[str] = None


@router.patch("/tournament/{tournament_id}")
def update_tournament(
    tournament_id: str,
    req: UpdateTournamentRequest,
    db=Depends(get_db),
    _=Depends(verify_admin),
):
    """Update tournament metadata."""
    tournament = tournaments_db.get_by_id(db, tournament_id)
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")

    updates = {}
    if req.name is not None:
        updates["name"] = req.name
    if req.season_id is not None:
        updates["season_id"] = req.season_id
    if req.section_type is not None:
        updates["section_type"] = req.section_type

    if updates:
        tournaments_db.update(db, tournament_id, **updates)

    return {"success": True, "tournament_id": tournament_id}
