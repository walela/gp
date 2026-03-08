from flask import Flask, jsonify, request, g
from flask_compress import Compress
from flask_cors import CORS
from chess_results import ChessResultsScraper
from result_validator import ResultValidator
from db import Database
import sqlite3
import os
import logging
import csv
import io
import time
import hmac
from functools import wraps
from flask import Response

from tournament_metadata import infer_location, infer_rounds

logger = logging.getLogger(__name__)

app = Flask(__name__)
Compress(app)
CORS(app)  # Enable CORS for all routes
db = Database()

PLAYERS_PER_PAGE = 30
REQUEST_LOGGING_ENABLED = os.environ.get("REQUEST_LOGGING_ENABLED", "true").lower() == "true"
REQUEST_IP_LOGGING_ENABLED = os.environ.get("REQUEST_IP_LOGGING_ENABLED", "true").lower() == "true"
SLOW_REQUEST_MS = int(os.environ.get("SLOW_REQUEST_MS", "1000"))


def _get_client_ip() -> str:
    """Resolve best-effort client IP from common proxy headers."""
    x_forwarded_for = request.headers.get("X-Forwarded-For", "")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.headers.get("CF-Connecting-IP") or request.remote_addr or "unknown"


@app.before_request
def start_request_timer():
    g.request_start = time.perf_counter()

@app.after_request
def add_cache_headers(response):
    duration_ms = 0.0
    if hasattr(g, "request_start"):
        duration_ms = (time.perf_counter() - g.request_start) * 1000

    if REQUEST_LOGGING_ENABLED:
        size = response.calculate_content_length() or 0
        log_payload = {
            "method": request.method,
            "path": request.path,
            "status": response.status_code,
            "duration_ms": round(duration_ms, 2),
            "size_bytes": size,
        }
        if REQUEST_IP_LOGGING_ENABLED:
            log_payload["client_ip"] = _get_client_ip()

        if duration_ms >= SLOW_REQUEST_MS:
            logger.warning("slow_request %s", log_payload)
        else:
            logger.info("request %s", log_payload)

    """Add cache headers to GET requests (skip admin routes)."""
    if request.method == 'GET' and response.status_code == 200 and not request.path.startswith('/api/admin'):
        if app.debug:
            response.headers['Cache-Control'] = 'no-store'
        else:
            response.headers['Cache-Control'] = 'public, max-age=86400'
    return response


def get_tournament_data(tournament_id: str):
    """Get tournament data from database or scrape if needed."""
    # Try to get from database first
    data = db.get_tournament(tournament_id)
    if data:
        return data["name"], data["results"]

    # Not in database, scrape it
    scraper = ChessResultsScraper()
    name, results, metadata = scraper.get_tournament_data(tournament_id)

    # Convert to dict for storage
    results_dict = []
    for result in results:
        r = {
            "player": {
                "name": result.player.name,
                "fide_id": result.player.fide_id,
                "rating": result.player.rating,
                "federation": result.player.federation,
            },
            "points": result.points,
            "tpr": result.tpr,
            "has_walkover": result.has_walkover,
        }
        results_dict.append(r)

    # Save to database
    db.save_tournament(
        tournament_id,
        name,
        results_dict,
        start_date=metadata.get("start_date"),
        end_date=metadata.get("end_date"),
        location=metadata.get("location"),
        rounds=metadata.get("rounds"),
        section=metadata.get("section", "open"),
    )
    
    # Recalculate rankings after new data is saved
    db.recalculate_rankings()

    return name, results_dict


@app.route("/api/tournaments")
def tournaments():
    """Get list of all tournaments."""
    # Get season filter (optional)
    from datetime import datetime
    season = request.args.get("season")
    if season:
        season = int(season)

    tournament_list = []
    all_db_tournaments = db.get_all_tournaments(season=season)

    # Get all tournament stats and results counts in batch
    all_stats = db.get_all_tournament_stats(season=season)
    all_results_counts = db.get_all_tournament_results_counts(season=season)

    for t_data in all_db_tournaments:
        try:
            t_id = t_data["id"]
            t_name = t_data["name"]
            t_start_date = t_data.get("start_date")
            t_end_date = t_data.get("end_date")
            t_short_name = t_data.get("short_name")
            t_location = t_data.get("location")
            t_rounds = t_data.get("rounds")

            results_count = all_results_counts.get(t_id, 0)
            stats = all_stats.get(t_id, {'avg_top10_tpr': 0, 'avg_top24_rating': 0})

            rounds = t_rounds or infer_rounds(t_name)
            location = t_location or infer_location(t_name)

            tournament_list.append(
                {
                    "id": t_id,
                    "name": t_name,
                    "short_name": t_short_name if t_short_name else t_name,
                    "results": results_count,
                    "status": "Completed", # Assuming all in DB are completed
                    "start_date": t_start_date,
                    "end_date": t_end_date,
                    "location": location,
                    "rounds": rounds,
                    "section": t_data.get("section", "open"),
                    "avgTop10TPR": stats['avg_top10_tpr'],
                    "avgTop24Rating": stats['avg_top24_rating'],
                }
            )
        except Exception as e:
            logger.error(f"Error processing tournament from DB {t_data.get('id', 'N/A')}: {e}")

    return jsonify(tournament_list)


@app.route("/api/tournament/<tournament_id>")
def tournament(tournament_id):
    sort = request.args.get("sort", "points")
    dir = request.args.get("dir", "desc")
    page = int(request.args.get("page", "1"))
    per_page = 25
    all_results = request.args.get("all_results", "false").lower() == "true"

    try:
        data = db.get_tournament(tournament_id)
        if not data:
            return jsonify({"error": "Tournament not found"}), 404

        tournament_name = data["name"]
        short_name = data.get("short_name", tournament_name)
        start_date = data.get("start_date")
        end_date = data.get("end_date")
        location = data.get("location")
        section = data.get("section", "open")
        results = data["results"]

        rounds = data.get("rounds") or infer_rounds(tournament_name)
        location = location or infer_location(tournament_name)

        # Find sibling section (open <-> ladies)
        sibling_id = None
        if tournament_id.endswith("_ladies"):
            candidate = tournament_id.replace("_ladies", "")
            if db.get_tournament_info(candidate):
                sibling_id = candidate
        else:
            candidate = f"{tournament_id}_ladies"
            if db.get_tournament_info(candidate):
                sibling_id = candidate
        # Fallback: match by short_name + different section + same season
        if not sibling_id and short_name and start_date:
            sibling_id = db.find_sibling_tournament(tournament_id, short_name, section, start_date[:4])

        # Sort results
        if sort == "name":
            results.sort(key=lambda x: x["player"]["name"].lower(), reverse=dir == "desc")
        elif sort == "rating":
            results.sort(key=lambda x: x["rating"] or 0, reverse=dir == "desc")
        elif sort == "points":
            results.sort(key=lambda x: x["points"], reverse=dir == "desc")
        elif sort == "tpr":
            results.sort(key=lambda x: x["tpr"] or 0, reverse=dir == "desc")

        # If all_results is true, return all results without pagination
        if all_results:
            return jsonify(
                {
                    "name": tournament_name,
                    "id": tournament_id,
                    "start_date": start_date,
                    "end_date": end_date,
                    "location": location,
                    "rounds": rounds,
                    "section": section,
                    "sibling_id": sibling_id,
                    "results": results,
                    "total": len(results),
                    "page": 1,
                    "total_pages": 1,
                }
            )

        # Paginate results
        total_pages = (len(results) + per_page - 1) // per_page
        start = (page - 1) * per_page
        end = start + per_page
        paginated_results = results[start:end]

        return jsonify(
            {
                "name": tournament_name,
                "short_name": short_name,
                "id": tournament_id,
                "start_date": start_date,
                "end_date": end_date,
                "location": location,
                "rounds": rounds,
                "section": section,
                "sibling_id": sibling_id,
                "results": paginated_results,
                "total": len(results),
                "page": page,
                "total_pages": total_pages,
            }
        )
    except Exception as e:
        logger.error(f"Error getting tournament {tournament_id}: {e}")
        return jsonify({"error": f"Error getting tournament data: {str(e)}"}), 500


# Qualification probability calculation removed for performance


@app.route("/api/seasons")
def seasons():
    """Get available seasons."""
    available_seasons = db.get_available_seasons()
    return jsonify({"seasons": available_seasons})


@app.route("/api/rankings")
def rankings():
    """Get current GP rankings."""
    sort = request.args.get("sort", "best_4")
    dir = request.args.get("dir", "desc")
    page = int(request.args.get("page", "1"))
    search_query = request.args.get("q")  # Get the search query
    per_page = 25

    # Get season (default to current year)
    from datetime import datetime
    current_year = datetime.now().year
    season = request.args.get("season")
    if season:
        season = int(season)
    else:
        season = current_year

    # Get gender filter ('f' for ladies, None for all/open)
    gender = request.args.get("gender")

    player_rankings = db.get_all_player_rankings(season=season, gender=gender)
    reverse = dir == "desc"

    rank_change_map = db.get_rank_changes(top_n=25, season=season)

    # Filter by search query if provided
    if search_query:
        search_query_lower = search_query.lower()
        player_rankings = [
            p for p in player_rankings if search_query_lower in p["name"].lower()
        ]

    # Map frontend sort keys to data keys
    sort_key = {
        "name": "name",
        "rating": "rating",
        "tournaments_played": "tournaments_played",
        "best_1": "best_1",
        "best_2": "best_2",
        "best_3": "best_3",
        "best_4": "best_4",
    }.get(sort, "best_4")

    # Implement cascading sort for best_4 rankings
    if sort_key == "best_4":
        def cascading_sort_key(player):
            # Use best_4 if player has 4+ tournaments
            if player["tournaments_played"] >= 4 and player["best_4"] > 0:
                return (4, player["best_4"])  # Priority 4 (highest)
            # Use best_3 if player has 3+ tournaments
            elif player["tournaments_played"] >= 3 and player["best_3"] > 0:
                return (3, player["best_3"])  # Priority 3
            # Use best_2 if player has 2+ tournaments
            elif player["tournaments_played"] >= 2 and player["best_2"] > 0:
                return (2, player["best_2"])  # Priority 2
            # Use best_1 if player has 1+ tournaments
            elif player["tournaments_played"] >= 1 and player["best_1"] > 0:
                return (1, player["best_1"])  # Priority 1 (lowest)
            else:
                return (0, 0)  # No valid data

        player_rankings.sort(key=cascading_sort_key, reverse=reverse)
    else:
        # Use original single-column sort for other columns
        player_rankings.sort(
            key=lambda x: (x[sort_key] if x[sort_key] is not None else -float("inf")),
            reverse=reverse,
        )

    total_pages = (len(player_rankings) + per_page - 1) // per_page
    start = (page - 1) * per_page
    end = start + per_page
    current_page_rankings = player_rankings[start:end]

    for player in current_page_rankings:
        change_info = rank_change_map.get(player.get("player_id")) if player.get("player_id") is not None else None
        player["rank_change"] = change_info.get("rank_change") if change_info else None
        player["previous_rank"] = change_info.get("previous_rank") if change_info else None
        player["is_new"] = change_info.get("is_new") if change_info else False

    return jsonify(
        {
            "rankings": current_page_rankings,
            "total": len(player_rankings),
            "page": page,
            "total_pages": total_pages,
        }
    )


@app.route("/api/player/<fide_id>")
def player(fide_id):
    """Get player tournament history."""
    # Get season filter (default to current year)
    from datetime import datetime
    current_year = datetime.now().year
    season = request.args.get("season")
    if season:
        season = int(season)
    else:
        season = current_year

    player_details = None
    tournament_results = []
    player_ranking = None

    with sqlite3.connect(db.db_file) as conn:
        conn.row_factory = sqlite3.Row  # Return rows as dictionary-like objects
        c = conn.cursor()

        # 1. Fetch player details
        c.execute(
            "SELECT name, fide_id, federation FROM players WHERE fide_id = ?",
            (fide_id,),
        )
        player_row = c.fetchone()

        if not player_row:
            # Return 404 or empty if player not found by FIDE ID
            return jsonify({"error": "Player not found"}), 404

        player_details = dict(player_row)

        # 2. Fetch tournament results for this player using the correct JOIN
        # We join results -> players (on player_id) and results -> tournaments (on tournament_id)
        # We filter by players.fide_id and season (year from start_date)
        try:
            c.execute(
                """
                SELECT
                    t.id as tournament_id,
                    COALESCE(t.short_name, t.name) as tournament_name,
                    t.location,
                    t.rounds,
                    t.start_date,
                    t.end_date,
                    r.points,
                    r.tpr,
                    r.rating as rating_in_tournament,
                    r.start_rank,
                    r.result_status,
                    t.section,
                    COALESCE(t.source_id, t.id) as source_id
                FROM results r
                JOIN players p ON r.player_id = p.id
                JOIN tournaments t ON r.tournament_id = t.id
                WHERE p.fide_id = ?
                AND CAST(strftime('%Y', t.start_date) AS INTEGER) = ?
                ORDER BY COALESCE(t.start_date, '0000-00-00') ASC, t.id ASC
            """,
                (fide_id, season),
            )
        except sqlite3.OperationalError as e:
            # If start_rank column doesn't exist or can't be accessed, try without it
            if 'no such column: r.start_rank' in str(e):
                logger.warning("start_rank column not found, using query without it")
                c.execute(
                    """
                    SELECT
                        t.id as tournament_id,
                        COALESCE(t.short_name, t.name) as tournament_name,
                        t.location,
                        t.rounds,
                        t.start_date,
                        t.end_date,
                        r.points,
                        r.tpr,
                        r.rating as rating_in_tournament,
                        r.result_status
                    FROM results r
                    JOIN players p ON r.player_id = p.id
                    JOIN tournaments t ON r.tournament_id = t.id
                    WHERE p.fide_id = ?
                    AND CAST(strftime('%Y', t.start_date) AS INTEGER) = ?
                    ORDER BY COALESCE(t.start_date, '0000-00-00') ASC, t.id ASC
                """,
                    (fide_id, season),
                )
            else:
                raise

        results_rows = c.fetchall()
        tournament_results = [dict(row) for row in results_rows]

        # Fetch precomputed ranking data for the player (filtered by season and gender)
        gender = request.args.get("gender")
        if gender and gender.lower() == 'f':
            gender_filter = "gender = 'F'"
        else:
            gender_filter = "gender IS NULL"

        c.execute(
            f"""
            SELECT player_id, name, fide_id, rating, tournaments_played,
                   best_1, tournament_1, best_2, best_3, best_4, rank
            FROM player_rankings
            WHERE fide_id = ? AND season = ? AND {gender_filter}
            """,
            (fide_id, season),
        )
        ranking_row = c.fetchone()
        if ranking_row:
            player_ranking = dict(ranking_row)
            player_ranking.pop("player_id", None)

    if player_ranking:
        # Rank is stored directly in player_rankings
        if player_ranking.get("rank"):
            player_ranking["current_rank"] = player_ranking["rank"]

    latest_tournament_rating = next(
        (
            result.get("rating_in_tournament")
            for result in reversed(tournament_results)
            if result.get("rating_in_tournament") is not None
        ),
        None,
    )

    # Combine player details and results into the response
    return jsonify(
        {
            "name": player_details["name"],
            "fide_id": player_details["fide_id"],
            "federation": player_details["federation"],
            "current_fide_rating": player_ranking.get("rating") if player_ranking else None,
            "latest_tournament_rating": latest_tournament_rating,
            "ranking": player_ranking,
            "results": [
                {
                    "tournament_id": result["tournament_id"],
                    "tournament_name": result["tournament_name"],
                    "location": result.get("location") or infer_location(result["tournament_name"]),
                    "start_date": result.get("start_date"),
                    "end_date": result.get("end_date"),
                    "points": result["points"],
                    "tpr": result["tpr"],
                    "rating_in_tournament": result["rating_in_tournament"],
                    "start_rank": result.get("start_rank"),
                    "rounds": result.get("rounds") or infer_rounds(result["tournament_name"]),
                    "result_status": result.get("result_status", "valid"),
                    "section": result.get("section", "open"),
                    "chess_results_url": f"https://chess-results.com/tnr{result['source_id']}.aspx?lan=1",
                    "player_card_url": f"https://chess-results.com/tnr{result['source_id']}.aspx?lan=1&art=9&snr={result.get('start_rank', '')}" if result.get("start_rank") else None
                }
                for result in tournament_results
            ],
        }
    )


@app.route("/api/tournament/<tournament_id>/export")
def export_tournament(tournament_id):
    """Export tournament data as CSV."""
    sort = request.args.get("sort", "points")
    dir = request.args.get("dir", "desc")

    try:
        data = db.get_tournament(tournament_id)
        if not data:
            return jsonify({"error": "Tournament not found"}), 404

        tournament_name = data["name"]
        results = data["results"]

        # Sort results based on parameters
        if sort == "name":
            results.sort(key=lambda x: x["player"]["name"].lower(), reverse=dir == "desc")
        elif sort == "rating":
            results.sort(key=lambda x: x.get("rating") or x["player"]["rating"] or 0, reverse=dir == "desc")
        elif sort == "points":
            results.sort(key=lambda x: x["points"], reverse=dir == "desc")
        elif sort == "tpr":
            results.sort(key=lambda x: x["tpr"] or 0, reverse=dir == "desc")
        elif sort == "start_rank":
            results.sort(key=lambda x: x.get("start_rank") or 999999, reverse=dir == "desc")

        # Create CSV content
        output = io.StringIO()
        csv_writer = csv.writer(output)
        csv_writer.writerow(["Rank", "Name", "FIDE ID", "Rating", "Federation", "Points", "TPR", "Valid Result"])

        for idx, result in enumerate(results, 1):
            csv_writer.writerow([
                idx,
                result["player"]["name"],
                result["player"]["fide_id"],
                result.get("rating") or result["player"]["rating"] or "Unrated",
                result["player"]["federation"],
                result["points"],
                result["tpr"] or "-",
                "Yes" if result.get("result_status", "valid") == "valid" else "No"
            ])

        # Create CSV response
        response = Response(output.getvalue(), content_type="text/csv")
        response.headers["Content-Disposition"] = f"attachment; filename={tournament_name.replace(' ', '_')}_results.csv"
        return response
    except Exception as e:
        logger.error(f"Error exporting tournament {tournament_id}: {e}")
        return jsonify({"error": f"Error exporting tournament data: {str(e)}"}), 500


@app.route("/api/rankings/export")
def export_rankings():
    """Export current GP rankings as CSV."""
    sort = request.args.get("sort", "best_4")
    dir = request.args.get("dir", "desc")
    search_query = request.args.get("q")

    # Get season (default to current year)
    from datetime import datetime
    current_year = datetime.now().year
    season = request.args.get("season")
    if season:
        season = int(season)
    else:
        season = current_year

    # Get gender filter
    gender = request.args.get("gender")

    try:
        player_rankings = db.get_all_player_rankings(season=season, gender=gender)
        reverse = dir == "desc"

        # Filter by search query if provided
        if search_query:
            search_query_lower = search_query.lower()
            player_rankings = [
                p for p in player_rankings if search_query_lower in p["name"].lower()
            ]

        # Map frontend sort keys to data keys
        sort_key = {
            "name": "name",
            "rating": "rating",
            "tournaments_played": "tournaments_played",
            "best_1": "best_1",
            "best_2": "best_2",
            "best_3": "best_3",
            "best_4": "best_4",
        }.get(sort, "best_4")

        # Implement cascading sort for best_4 rankings
        if sort_key == "best_4":
            def cascading_sort_key(player):
                # Use best_4 if player has 4+ tournaments
                if player["tournaments_played"] >= 4 and player["best_4"] > 0:
                    return (4, player["best_4"])  # Priority 4 (highest)
                # Use best_3 if player has 3+ tournaments
                elif player["tournaments_played"] >= 3 and player["best_3"] > 0:
                    return (3, player["best_3"])  # Priority 3
                # Use best_2 if player has 2+ tournaments
                elif player["tournaments_played"] >= 2 and player["best_2"] > 0:
                    return (2, player["best_2"])  # Priority 2
                # Use best_1 if player has 1+ tournaments
                elif player["tournaments_played"] >= 1 and player["best_1"] > 0:
                    return (1, player["best_1"])  # Priority 1 (lowest)
                else:
                    return (0, 0)  # No valid data

            player_rankings.sort(key=cascading_sort_key, reverse=reverse)
        else:
            # Use original single-column sort for other columns
            player_rankings.sort(
                key=lambda x: (x[sort_key] if x[sort_key] is not None else -float("inf")),
                reverse=reverse,
            )

        # Create CSV content
        output = io.StringIO()
        csv_writer = csv.writer(output)
        csv_writer.writerow(["Rank", "Name", "FIDE ID", "Rating", "Tournaments Played", "Best 1 TPR", "Tournament (Best 1)", "Best 2 Avg", "Best 3 Avg", "Best 4 Avg"])

        for idx, ranking in enumerate(player_rankings, 1):
            csv_writer.writerow([
                idx,
                ranking["name"],
                ranking["fide_id"],
                ranking["rating"] or "Unrated",
                ranking["tournaments_played"],
                ranking["best_1"],
                ranking["tournament_1"] or "-",
                ranking["best_2"],
                ranking["best_3"],
                ranking["best_4"]
            ])

        # Create CSV response
        response = Response(output.getvalue(), content_type="text/csv")
        filename = "GP_rankings"
        if search_query:
            filename += f"_search_{search_query.replace(' ', '_')}"
        filename += f"_by_{sort}.csv"
        response.headers["Content-Disposition"] = f"attachment; filename={filename}"
        return response
    except Exception as e:
        logger.error(f"Error exporting rankings: {e}")
        return jsonify({"error": f"Error exporting rankings: {str(e)}"}), 500


@app.route("/api/player/<fide_id>/export")
def export_player(fide_id):
    """Export player tournament history as CSV."""
    player_details = None
    tournament_results = []

    with sqlite3.connect(db.db_file) as conn:
        conn.row_factory = sqlite3.Row
        c = conn.cursor()

        # Fetch player details
        c.execute(
            "SELECT name, fide_id, federation FROM players WHERE fide_id = ?",
            (fide_id,),
        )
        player_row = c.fetchone()

        if not player_row:
            return jsonify({"error": "Player not found"}), 404

        player_details = dict(player_row)

        # Fetch tournament results
        try:
            c.execute(
                """
                SELECT
                    t.id as tournament_id,
                    t.name as tournament_name,
                    t.location,
                    t.rounds,
                    r.points,
                    r.tpr,
                    r.rating as rating_in_tournament,
                    r.start_rank,
                    r.result_status
                FROM results r
                JOIN players p ON r.player_id = p.id
                JOIN tournaments t ON r.tournament_id = t.id
                WHERE p.fide_id = ?
                ORDER BY t.id DESC
            """,
                (fide_id,),
            )
            results_rows = c.fetchall()
            tournament_results = [dict(row) for row in results_rows]
        except Exception as e:
            logger.error(f"Error fetching player results: {e}")

    try:
        # Create CSV content
        output = io.StringIO()
        csv_writer = csv.writer(output)

        # Write player info
        csv_writer.writerow([f"Player: {player_details['name']}"])
        csv_writer.writerow([f"FIDE ID: {player_details['fide_id']}"])
        csv_writer.writerow([f"Federation: {player_details['federation']}"])
        csv_writer.writerow([])  # Empty row

        # Write tournament results header
        csv_writer.writerow(["Tournament", "Rating", "Points", "Rounds", "TPR", "Status"])

        # Write results
        for result in tournament_results:
            csv_writer.writerow([
                result["tournament_name"],
                result["rating_in_tournament"] or "Unrated",
                result["points"],
                result.get("rounds") or infer_rounds(result["tournament_name"]),
                result["tpr"] or "-",
                result.get("result_status", "valid")
            ])

        # Create CSV response
        response = Response(output.getvalue(), content_type="text/csv")
        response.headers["Content-Disposition"] = f"attachment; filename={player_details['name'].replace(' ', '_')}_tournament_history.csv"
        return response
    except Exception as e:
        logger.error(f"Error exporting player data: {e}")
        return jsonify({"error": f"Error exporting player data: {str(e)}"}), 500


@app.route("/api/<int:season>/insights")
def season_insights(season):
    """Data-driven insights across the full GP dataset for a season."""
    from collections import defaultdict
    import statistics

    with sqlite3.connect(db.db_file) as conn:
        conn.row_factory = sqlite3.Row
        c = conn.cursor()

        # All player rankings for the season
        c.execute("""
            SELECT name, fide_id, rating, tournaments_played, best_1, best_2, best_3, best_4, rank
            FROM player_rankings
            WHERE season = ? AND gender IS NULL
            ORDER BY rank
        """, (season,))
        all_rankings = [dict(r) for r in c.fetchall()]
        if not all_rankings:
            return jsonify({"error": "No data for this season"}), 404

        # All results for the season (every player)
        c.execute("""
            SELECT p.name, p.fide_id, r.rating, r.tpr, r.points, r.start_rank,
                   r.result_status, t.id as tid, t.name as tname, t.start_date,
                   t.rounds, t.location
            FROM results r
            JOIN players p ON r.player_id = p.id
            JOIN tournaments t ON r.tournament_id = t.id
            WHERE CAST(strftime('%Y', t.start_date) AS INTEGER) = ?
            AND t.section = 'open'
            ORDER BY p.name, t.start_date
        """, (season,))
        all_results = [dict(r) for r in c.fetchall()]

        # Tournament list
        c.execute("""
            SELECT id, name, start_date, rounds, location
            FROM tournaments
            WHERE CAST(strftime('%Y', start_date) AS INTEGER) = ? AND section = 'open'
            ORDER BY start_date
        """, (season,))
        tournaments = [dict(r) for r in c.fetchall()]

    top9 = all_rankings[:9]
    top9_fides = {p["fide_id"] for p in top9}
    rank_by_fide = {p["fide_id"]: p for p in all_rankings}
    valid_results = [r for r in all_results if r["result_status"] == "valid"]
    total_unique_players = len(all_rankings)

    # Per-player groupings
    results_by_player = defaultdict(list)
    valid_by_player = defaultdict(list)
    for r in all_results:
        results_by_player[r["fide_id"]].append(r)
    for r in valid_results:
        valid_by_player[r["fide_id"]].append(r)

    insights = []

    # --- 1. The field: how big and how selective ---
    qualifier_rate = 9 / total_unique_players * 100 if total_unique_players else 0
    tp_dist = defaultdict(int)
    for p in all_rankings:
        tp_dist[p["tournaments_played"]] += 1
    one_timers = tp_dist.get(1, 0)
    four_plus = sum(v for k, v in tp_dist.items() if k >= 4)
    insights.append({
        "category": "The Field",
        "title": f"{total_unique_players} players entered at least one GP tournament",
        "detail": f"Only 9 qualified for the Olympiad ({qualifier_rate:.1f}% selection rate). "
                  f"{one_timers} players ({one_timers*100//total_unique_players}%) played just one event, "
                  f"while only {four_plus} ({four_plus*100//total_unique_players}%) played the 4 needed for a best-4 score.",
        "data": dict(sorted(tp_dist.items())),
    })

    # --- 2. The qualification cutoff ---
    if len(top9) >= 9:
        cutoff = top9[8]
        just_missed = [p for p in all_rankings[9:15]]
        cutoff_best4 = cutoff["best_4"]
        insights.append({
            "category": "The Cutoff",
            "title": f"A best-4 of {int(cutoff_best4)} was the minimum to qualify",
            "detail": f"{cutoff['name']} squeezed in at #9 with {int(cutoff_best4)}. "
                      f"The gap between #9 and #10 ({just_missed[0]['name']}) was just "
                      f"{int(cutoff_best4 - just_missed[0]['best_4'])} points. "
                      f"Margins this tight mean a single bad round can end your Olympiad hopes.",
            "data": [{"rank": p["rank"], "name": p["name"], "best_4": p["best_4"],
                       "gap_to_9": round(cutoff_best4 - p["best_4"], 1)}
                      for p in just_missed],
        })

    # --- 3. Can you get a 2100+ TPR and fail to qualify? ---
    high_tpr_outsiders = []
    for p in all_rankings:
        if p["fide_id"] not in top9_fides and p["best_1"] and p["best_1"] >= 2000:
            high_tpr_outsiders.append(p)
    if high_tpr_outsiders:
        high_tpr_outsiders.sort(key=lambda x: x["best_1"], reverse=True)
        top_example = high_tpr_outsiders[0]
        count_2100 = sum(1 for p in high_tpr_outsiders if p["best_1"] >= 2100)
        insights.append({
            "category": "Peak vs Consistency",
            "title": f"Yes, you can hit {int(top_example['best_1'])} TPR and still miss the Olympiad",
            "detail": f"{top_example['name']} posted a {int(top_example['best_1'])} peak TPR but ranked #{top_example['rank']} "
                      f"(best-4: {int(top_example['best_4']) if top_example['best_4'] else 'N/A'}). "
                      f"{count_2100} players hit 2100+ TPR in a single event but didn't qualify. "
                      f"The GP rewards sustained excellence, not one-off brilliance.",
            "data": [{"name": p["name"], "peak_tpr": p["best_1"], "best_4": p["best_4"],
                       "rank": p["rank"], "tournaments": p["tournaments_played"]}
                      for p in high_tpr_outsiders[:8]],
        })

    # --- 4. The one-tournament wonders ---
    one_event_stars = [p for p in all_rankings if p["tournaments_played"] <= 2 and p["best_1"] and p["best_1"] >= 1900]
    if one_event_stars:
        one_event_stars.sort(key=lambda x: x["best_1"], reverse=True)
        insights.append({
            "category": "What If",
            "title": f"{len(one_event_stars)} players posted 1900+ TPR in 1-2 events then vanished",
            "detail": f"Players like {one_event_stars[0]['name']} ({int(one_event_stars[0]['best_1'])} TPR) "
                      f"showed they can compete at the top, but played too few events to qualify. "
                      f"If even one of them had committed to the full circuit, the top 9 could look very different.",
            "data": [{"name": p["name"], "peak_tpr": p["best_1"], "events": p["tournaments_played"], "rank": p["rank"]}
                      for p in one_event_stars[:6]],
        })

    # --- 5. Overperformers: rating vs best-4 gap ---
    overperformers = [p for p in all_rankings if p["best_4"] and p["best_4"] > 0 and p["rating"] and p["rating"] > 0]
    overperformers.sort(key=lambda x: x["best_4"] - x["rating"], reverse=True)
    if overperformers:
        top_op = overperformers[0]
        gap = int(top_op["best_4"] - top_op["rating"])
        insights.append({
            "category": "Overperformers",
            "title": f"{top_op['name']} outperformed their rating by {gap} points",
            "detail": f"Rated {top_op['rating']} but averaged {int(top_op['best_4'])} across their best 4. "
                      f"The top 5 overperformers all exceeded their rating by 100+ points, "
                      f"suggesting the GP rewards players on an upward trajectory.",
            "data": [{"name": p["name"], "rating": p["rating"], "best_4": int(p["best_4"]),
                       "gap": int(p["best_4"] - p["rating"]), "rank": p["rank"]}
                      for p in overperformers[:8]],
        })

    # --- 6. Consistency vs explosiveness (full dataset) ---
    volatility_data = []
    for fide_id, results in valid_by_player.items():
        tprs = [r["tpr"] for r in results if r["tpr"]]
        if len(tprs) >= 4:
            player_info = rank_by_fide.get(fide_id, {})
            volatility_data.append({
                "name": results[0]["name"],
                "fide_id": fide_id,
                "range": max(tprs) - min(tprs),
                "stdev": round(statistics.stdev(tprs), 0),
                "avg_tpr": round(statistics.mean(tprs), 0),
                "rank": player_info.get("rank"),
                "events": len(tprs),
            })
    if volatility_data:
        volatility_data.sort(key=lambda x: x["range"])
        most_consistent = volatility_data[0]
        most_volatile = volatility_data[-1]
        # Is consistency correlated with higher rank?
        ranked_vol = [v for v in volatility_data if v["rank"] and v["rank"] <= 20]
        top20_avg_range = round(statistics.mean(v["range"] for v in ranked_vol), 0) if ranked_vol else 0
        all_avg_range = round(statistics.mean(v["range"] for v in volatility_data), 0)
        insights.append({
            "category": "Consistency",
            "title": f"Consistency matters: top-20 players had {int(top20_avg_range)}pt avg TPR range vs {int(all_avg_range)}pt overall",
            "detail": f"{most_consistent['name']} was the steadiest (range: {most_consistent['range']}pts over {most_consistent['events']} events). "
                      f"{most_volatile['name']} swung the widest ({most_volatile['range']}pts). "
                      f"Lower variance tends to correlate with better final rankings.",
            "data": {"most_consistent": volatility_data[:5],
                     "most_volatile": volatility_data[-5:][::-1]},
        })

    # --- 7. Tournament strength tiers ---
    tourn_stats = []
    tourn_results = defaultdict(list)
    for r in valid_results:
        if r["tpr"] and r["tpr"] > 0:
            tourn_results[r["tid"]].append(r)
    for t in tournaments:
        trs = tourn_results.get(t["id"], [])
        if len(trs) >= 10:
            tprs = [r["tpr"] for r in trs]
            tourn_stats.append({
                "name": t["name"],
                "avg_tpr": round(statistics.mean(tprs), 0),
                "max_tpr": max(tprs),
                "players": len(trs),
                "rounds": t["rounds"],
                "date": t["start_date"],
            })
    if tourn_stats:
        tourn_stats.sort(key=lambda x: x["avg_tpr"], reverse=True)
        strongest = tourn_stats[0]
        weakest = tourn_stats[-1]
        insights.append({
            "category": "Tournament Strength",
            "title": f"{strongest['name']} was the strongest field (avg TPR {int(strongest['avg_tpr'])})",
            "detail": f"With {strongest['players']} players, it had the highest average TPR. "
                      f"{weakest['name']} had the most accessible field ({int(weakest['avg_tpr'])} avg TPR, "
                      f"{weakest['players']} players). Picking your battles matters.",
            "data": tourn_stats,
        })

    # --- 8. The grinder's advantage: volume vs rank ---
    vol_ranks = [(p["tournaments_played"], p["rank"]) for p in all_rankings if p["rank"] and p["rank"] <= 30]
    if len(vol_ranks) >= 5:
        avg_events_top10 = statistics.mean(tp for tp, rk in vol_ranks if rk <= 10)
        avg_events_11_30 = statistics.mean(tp for tp, rk in vol_ranks if rk > 10)
        max_events_player = max(all_rankings, key=lambda p: p["tournaments_played"])
        insights.append({
            "category": "The Grinder's Edge",
            "title": f"Top 10 averaged {avg_events_top10:.1f} events vs {avg_events_11_30:.1f} for ranks 11-30",
            "detail": f"Playing more tournaments gives more chances for high TPRs. "
                      f"{max_events_player['name']} played {max_events_player['tournaments_played']} events "
                      f"and finished #{max_events_player['rank']}. "
                      f"But volume alone isn't enough \u2014 you still need to perform.",
            "data": {"top10_avg_events": round(avg_events_top10, 1),
                     "rank11_30_avg_events": round(avg_events_11_30, 1),
                     "most_active": {"name": max_events_player["name"],
                                     "events": max_events_player["tournaments_played"],
                                     "rank": max_events_player["rank"]}},
        })

    # --- 9. Rating is not destiny ---
    if top9:
        top9_ratings = [p["rating"] for p in top9 if p["rating"]]
        lowest_rated_qualifier = min(top9, key=lambda p: p["rating"] or 9999)
        highest_rated_non = None
        for p in all_rankings[9:]:
            if p["rating"] and p["rating"] > (lowest_rated_qualifier["rating"] or 0):
                highest_rated_non = p
                break
        detail = f"The lowest-rated qualifier was {lowest_rated_qualifier['name']} ({lowest_rated_qualifier['rating']})."
        if highest_rated_non:
            detail += f" Meanwhile, {highest_rated_non['name']} ({highest_rated_non['rating']}) was rated higher but finished #{highest_rated_non['rank']}."
        insights.append({
            "category": "Rating \u2260 Destiny",
            "title": f"Ratings ranged from {min(top9_ratings)} to {max(top9_ratings)} among qualifiers",
            "detail": detail + " The GP system means your tournament form matters more than your pre-tournament rating.",
            "data": [{"name": p["name"], "rating": p["rating"], "rank": p["rank"], "best_4": p["best_4"]}
                      for p in top9],
        })

    # --- 10. Season arc ---
    mid_date = f"{season}-07-01"
    h1_by_player = defaultdict(list)
    h2_by_player = defaultdict(list)
    for r in valid_results:
        if not r["tpr"] or not r["start_date"]:
            continue
        if r["start_date"] < mid_date:
            h1_by_player[r["fide_id"]].append(r["tpr"])
        else:
            h2_by_player[r["fide_id"]].append(r["tpr"])
    arcs = []
    for fid in set(h1_by_player.keys()) & set(h2_by_player.keys()):
        if len(h1_by_player[fid]) >= 2 and len(h2_by_player[fid]) >= 2:
            h1 = round(statistics.mean(h1_by_player[fid]))
            h2 = round(statistics.mean(h2_by_player[fid]))
            pr = rank_by_fide.get(fid, {})
            arcs.append({"name": pr.get("name", fid), "h1_avg": h1, "h2_avg": h2,
                          "change": h2 - h1, "rank": pr.get("rank")})
    if arcs:
        arcs.sort(key=lambda x: x["change"], reverse=True)
        surger = arcs[0]
        fader = arcs[-1]
        insights.append({
            "category": "Season Arc",
            "title": "Second-half surge vs first-half peak",
            "detail": f"{surger['name']} improved the most in H2 ({surger['h1_avg']} \u2192 {surger['h2_avg']}, +{surger['change']}pts). "
                      f"{fader['name']} dropped off the hardest ({fader['h1_avg']} \u2192 {fader['h2_avg']}, {fader['change']}pts). "
                      f"Peaking at the right time matters in a year-long race.",
            "data": {"surgers": arcs[:5], "faders": arcs[-5:][::-1]},
        })

    # --- 11. The walkover tax (full dataset) ---
    walkover_impact = []
    for fid, results in results_by_player.items():
        wos = [r for r in results if r["result_status"] == "walkover"]
        if wos:
            pr = rank_by_fide.get(fid, {})
            walkover_impact.append({
                "name": results[0]["name"],
                "walkovers": len(wos),
                "total_events": len(results),
                "rank": pr.get("rank"),
                "best_4": pr.get("best_4"),
            })
    if walkover_impact:
        walkover_impact.sort(key=lambda x: x["walkovers"], reverse=True)
        total_wo_players = len(walkover_impact)
        wo_in_top9 = sum(1 for w in walkover_impact if w["rank"] and w["rank"] <= 9)
        insights.append({
            "category": "The Walkover Tax",
            "title": f"{total_wo_players} players had at least one walkover",
            "detail": f"A walkover invalidates your result for that tournament, costing you a counting score. "
                      f"{wo_in_top9} of the 9 qualifiers had walkovers. "
                      f"{walkover_impact[0]['name']} had {walkover_impact[0]['walkovers']} across {walkover_impact[0]['total_events']} events.",
            "data": walkover_impact[:10],
        })

    # --- 12. Best-1 gap: spike-dependent vs well-rounded ---
    spike_data = []
    for p in all_rankings:
        if p["best_4"] and p["best_4"] > 0 and p["best_1"]:
            gap = p["best_1"] - p["best_4"]
            spike_data.append({
                "name": p["name"], "best_1": int(p["best_1"]), "best_4": int(p["best_4"]),
                "gap": int(gap), "rank": p["rank"],
            })
    if spike_data:
        spike_data.sort(key=lambda x: x["gap"], reverse=True)
        most_spiky = spike_data[0]
        most_flat = spike_data[-1]
        insights.append({
            "category": "Spike Dependency",
            "title": f"{most_spiky['name']}'s best-4 was {most_spiky['gap']}pts below their peak",
            "detail": f"A {most_spiky['best_1']} peak but only {most_spiky['best_4']} best-4 "
                      f"(rank #{most_spiky['rank']}). Compare with {most_flat['name']}: "
                      f"peak {most_flat['best_1']}, best-4 {most_flat['best_4']} "
                      f"(only {most_flat['gap']}pt gap, rank #{most_flat['rank']}). "
                      f"Spiky performers need more tournaments to smooth out their average.",
            "data": spike_data[:10],
        })

    # --- 13. Bellwether tournament ---
    # For each tournament, measure how well each player's TPR predicted their final best_4
    bellwether_data = []
    for t in tournaments:
        trs = tourn_results.get(t["id"], [])
        pairs = []
        for r in trs:
            pr = rank_by_fide.get(r["fide_id"])
            if pr and pr.get("best_4") and pr["best_4"] > 0 and r["tpr"] and r["tpr"] > 0:
                pairs.append({
                    "name": r["name"],
                    "tpr": r["tpr"],
                    "best_4": round(pr["best_4"]),
                    "error": r["tpr"] - round(pr["best_4"]),
                })
        if len(pairs) >= 8:
            abs_errors = [abs(p["error"]) for p in pairs]
            avg_err = round(statistics.mean(abs_errors), 0)
            bellwether_data.append({
                "tournament": t["name"],
                "date": t["start_date"],
                "rounds": t["rounds"],
                "players_matched": len(pairs),
                "avg_abs_error": int(avg_err),
                "median_abs_error": int(round(statistics.median(abs_errors), 0)),
                "player_details": sorted(pairs, key=lambda p: abs(p["error"]))[:6],
            })
    if bellwether_data:
        bellwether_data.sort(key=lambda x: x["avg_abs_error"])
        best = bellwether_data[0]
        worst = bellwether_data[-1]
        insights.append({
            "category": "Bellwether",
            "title": f"{best['tournament']} best predicted final standings",
            "detail": f"Players' TPRs at this event averaged just {best['avg_abs_error']}pts off their "
                      f"final best-4 (median: {best['median_abs_error']}pts). "
                      f"{worst['tournament']} was the least predictive ({worst['avg_abs_error']}pt avg error). "
                      f"Later-season, longer-format events tend to be better crystal balls.",
            "data": bellwether_data,
        })

    return jsonify({
        "season": season,
        "total_players": total_unique_players,
        "total_tournaments": len(tournaments),
        "insights": insights,
    })


ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "")


def require_admin(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not ADMIN_PASSWORD:
            return jsonify({"error": "Admin not configured"}), 503
        auth = request.headers.get("Authorization", "")
        token = auth.removeprefix("Bearer ").strip()
        if not token or not hmac.compare_digest(token, ADMIN_PASSWORD):
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated


@app.route("/api/admin/login", methods=["POST"])
def admin_login():
    body = request.get_json(silent=True) or {}
    password = body.get("password", "")
    if not ADMIN_PASSWORD:
        return jsonify({"error": "Admin not configured"}), 503
    if hmac.compare_digest(password, ADMIN_PASSWORD):
        return jsonify({"ok": True})
    return jsonify({"error": "Invalid password"}), 401


@app.route("/api/admin/scrape/sections", methods=["POST"])
@require_admin
def admin_scrape_sections():
    body = request.get_json(silent=True) or {}
    tournament_id = body.get("tournament_id", "").strip()
    if not tournament_id:
        return jsonify({"error": "tournament_id required"}), 400
    try:
        scraper = ChessResultsScraper()
        sections = scraper.get_available_sections(tournament_id)
        return jsonify({"sections": sections})
    except Exception as e:
        logger.error(f"Error fetching sections for {tournament_id}: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/admin/scrape/preview", methods=["POST"])
@require_admin
def admin_scrape_preview():
    body = request.get_json(silent=True) or {}
    tournament_id = body.get("tournament_id", "").strip()
    section_param = body.get("section_param", "")
    round_number = body.get("round_number")
    if round_number is not None:
        round_number = int(round_number)
    is_ladies = body.get("is_ladies", False)
    if not tournament_id:
        return jsonify({"error": "tournament_id required"}), 400
    try:
        scraper = ChessResultsScraper()
        name, results, metadata = scraper.get_tournament_data(tournament_id, section_param, round_number)
        # Override section if the section selector flagged it as ladies
        if is_ladies:
            metadata["section"] = "ladies"
        results_json = []
        for r in results:
            results_json.append({
                "player": {
                    "name": r.player.name,
                    "fide_id": r.player.fide_id,
                    "federation": r.player.federation,
                    "rating": r.player.rating,
                },
                "points": r.points,
                "tpr": r.tpr,
                "has_walkover": r.has_walkover,
                "rank": r.rank,
                "start_rank": r.start_rank,
            })
        return jsonify({
            "name": name,
            "results": results_json,
            "metadata": metadata,
        })
    except Exception as e:
        logger.error(f"Error previewing scrape for {tournament_id}: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/admin/scrape/validate", methods=["POST"])
@require_admin
def admin_scrape_validate():
    """Validate individual results (check walkovers, incomplete, etc.)."""
    body = request.get_json(silent=True) or {}
    tournament_id = body.get("tournament_id", "").strip()
    results = body.get("results", [])
    if not tournament_id or not results:
        return jsonify({"error": "tournament_id and results required"}), 400
    try:
        validator = ResultValidator()
        validated = []
        for r in results:
            start_rank = r.get("start_rank")
            if start_rank:
                _, status = validator.get_player_game_results(tournament_id, start_rank)
            else:
                status = "unknown"
            validated.append({**r, "result_status": status})
        return jsonify({"results": validated})
    except Exception as e:
        logger.error(f"Error validating results for {tournament_id}: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/admin/scrape/commit", methods=["POST"])
@require_admin
def admin_scrape_commit():
    body = request.get_json(silent=True) or {}
    tournament_id = body.get("tournament_id", "").strip()
    name = body.get("name", "").strip()
    results = body.get("results", [])
    metadata = body.get("metadata", {})
    if not tournament_id or not name:
        return jsonify({"error": "tournament_id and name required"}), 400
    try:
        section = metadata.get("section", "open")
        # Determine DB tournament ID
        db_tournament_id = tournament_id
        if section == "ladies":
            db_tournament_id = f"{tournament_id}_ladies"

        db.save_tournament(
            db_tournament_id,
            name,
            results,
            start_date=metadata.get("start_date"),
            end_date=metadata.get("end_date"),
            location=metadata.get("location"),
            rounds=metadata.get("rounds"),
            section=section,
            source_id=tournament_id,
        )
        db.recalculate_rankings()
        return jsonify({"ok": True, "tournament_id": db_tournament_id})
    except Exception as e:
        logger.error(f"Error committing scrape for {tournament_id}: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/admin/tournaments")
@require_admin
def admin_tournaments():
    season = request.args.get("season")
    if season:
        season = int(season)
    all_tournaments = db.get_all_tournaments(season=season)
    counts = db.get_all_tournament_results_counts(season=season)
    result = []
    for t in all_tournaments:
        t["results_count"] = counts.get(t["id"], 0)
        result.append(t)
    return jsonify(result)


@app.route("/api/admin/tournament/<tournament_id>", methods=["PUT"])
@require_admin
def admin_update_tournament(tournament_id):
    body = request.get_json(silent=True) or {}
    updated = db.update_tournament_metadata(tournament_id, **body)
    if updated:
        return jsonify({"ok": True})
    return jsonify({"error": "Tournament not found or no changes"}), 404


@app.route("/api/admin/tournament/<tournament_id>", methods=["DELETE"])
@require_admin
def admin_delete_tournament(tournament_id):
    db.delete_tournament_data(tournament_id)
    db.recalculate_rankings()
    return jsonify({"ok": True})


@app.route("/api/admin/tournament/<tournament_id>/result/<fide_id>", methods=["PUT"])
@require_admin
def admin_update_result(tournament_id, fide_id):
    body = request.get_json(silent=True) or {}
    updated = db.update_result(tournament_id, fide_id, **body)
    if updated:
        db.recalculate_rankings()
        return jsonify({"ok": True})
    return jsonify({"error": "Result not found"}), 404


@app.route("/api/admin/tournament/<tournament_id>/result/<fide_id>", methods=["DELETE"])
@require_admin
def admin_delete_result(tournament_id, fide_id):
    deleted = db.delete_result(tournament_id, fide_id)
    if deleted:
        db.recalculate_rankings()
        return jsonify({"ok": True})
    return jsonify({"error": "Result not found"}), 404


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5004))
    app.run(host="0.0.0.0", port=port)
