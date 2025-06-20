from flask import Flask, jsonify, request
from flask_cors import CORS
from chess_results import ChessResultsScraper
from db import Database
import sqlite3
import os
import logging
import csv
import io
from flask import Response

logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes
db = Database()

# Tournament IDs for 2025 Grand Prix
TOURNAMENT_NAMES = {
    "1095243": "Eldoret Open",
    "1126042": "Mavens Open",
    "1130967": "Waridi Chess Festival",
    "1135144": "Kisumu Open",
    "1165146": "The East Africa Chess Championship Nakuru Grand Prix 2025",
    "1173578": "Kiambu Open",
    "1188044": "Nairobi County Open",
    "1193135": "QUO VADIS OPEN 2025",
}

PLAYERS_PER_PAGE = 25


def get_tournament_data(tournament_id: str):
    """Get tournament data from database or scrape if needed."""
    # Try to get from database first
    data = db.get_tournament(tournament_id)
    if data:
        return data["name"], data["results"]

    # Not in database, scrape it
    scraper = ChessResultsScraper()
    name, results = scraper.get_tournament_data(tournament_id)

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
    db.save_tournament(tournament_id, TOURNAMENT_NAMES[tournament_id], results_dict)

    return TOURNAMENT_NAMES[tournament_id], results_dict


@app.route("/api/tournaments")
def tournaments():
    """Get list of all tournaments."""
    tournament_list = []
    for id, name in TOURNAMENT_NAMES.items():
        try:
            # Check if tournament exists in DB (implies it's completed/scraped)
            tournament_exists = db.does_tournament_exist(id)
            
            if tournament_exists:
                # Get only the count of results
                results_count = db.get_tournament_results_count(id)
                
                # Get tournament dates
                start_date, end_date = db.get_tournament_dates(id)
                
                # Determine rounds based on tournament name
                rounds = 6  # default
                if any(keyword in name.upper() for keyword in ['MAVENS', 'NAIROBI COUNTY', 'QUO VADIS']):
                    rounds = 8
                
                tournament_list.append(
                    {
                        "id": id,
                        "name": name,
                        "results": results_count, # Use the count
                        "status": "Completed",
                        "start_date": start_date,
                        "end_date": end_date,
                        "rounds": rounds,
                    }
                )
            else:
                # Tournament doesn't exist in DB, assume Upcoming
                # Determine rounds based on tournament name
                rounds = 6  # default
                if any(keyword in name.upper() for keyword in ['MAVENS', 'NAIROBI COUNTY', 'QUO VADIS']):
                    rounds = 8
                    
                tournament_list.append(
                    {
                        "id": id,
                        "name": name,
                        "results": 0, # No results yet
                        "status": "Upcoming",
                        "rounds": rounds,
                    }
                )
        except Exception as e:
            logger.error(f"Error processing tournament {id} ({name}): {e}")
            # Add entry with error status if needed, or skip
            # Determine rounds based on tournament name
            rounds = 6  # default
            if any(keyword in name.upper() for keyword in ['MAVENS', 'NAIROBI COUNTY', 'QUO VADIS']):
                rounds = 8
                
            tournament_list.append(
                {
                    "id": id,
                    "name": name,
                    "results": 0,
                    "status": "Error", # Indicate an issue processing this one
                    "rounds": rounds,
                }
            )
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
        start_date = data.get("start_date")
        end_date = data.get("end_date")
        results = data["results"]
        
        # Determine rounds based on tournament name
        rounds = 6  # default
        if any(keyword in tournament_name.upper() for keyword in ['MAVENS', 'NAIROBI COUNTY', 'QUO VADIS']):
            rounds = 8

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
                    "rounds": rounds,
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
                "id": tournament_id,
                "start_date": start_date,
                "end_date": end_date,
                "rounds": rounds,
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


def get_player_rankings():
    all_results = db.get_all_results()

    # Calculate best N results for each player
    player_rankings = []
    for player_id, results in all_results.items():
        # Filter results by federation and result_status
        valid_results = [r for r in results if r["player"]["federation"] == "KEN" and 
                         (r.get("result_status", "valid") == "valid" or r.get("result_status") is None)]
        
        # Skip players with no valid results
        if not valid_results:
            continue
            
        # Sort by chronological order (start_date) for trend analysis
        chronological_results = sorted(valid_results, key=lambda x: x["tournament"]["start_date"] or "1900-01-01")
        
        # Sort by TPR for best results calculation
        valid_results.sort(key=lambda x: x["tpr"] if x["tpr"] else 0, reverse=True)

        # Get best results
        best_1 = valid_results[0]["tpr"] if len(valid_results) >= 1 else 0
        best_2 = sum(r["tpr"] for r in valid_results[:2]) / 2 if len(valid_results) >= 2 else 0
        best_3 = sum(r["tpr"] for r in valid_results[:3]) / 3 if len(valid_results) >= 3 else 0
        best_4 = sum(r["tpr"] for r in valid_results[:4]) / 4 if len(valid_results) >= 4 else 0

# Qualification probability calculation removed for performance

        player_rankings.append(
            {
                "name": valid_results[0]["player"]["name"],
                "fide_id": valid_results[0]["player"]["fide_id"],
                "rating": valid_results[0]["player"]["rating"],
                "tournaments_played": len(valid_results),
                "best_1": round(best_1),
                "tournament_1": (
                    valid_results[0]["tournament"]["name"] if len(valid_results) >= 1 else None
                ),
                "best_2": round(best_2),
                "best_3": round(best_3),
                "best_4": round(best_4),
            }
        )

    return player_rankings


@app.route("/api/rankings")
def rankings():
    """Get current GP rankings."""
    sort = request.args.get("sort", "best_4")
    dir = request.args.get("dir", "desc")
    page = int(request.args.get("page", "1"))
    search_query = request.args.get("q")  # Get the search query
    per_page = 25

    player_rankings = get_player_rankings()
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

    total_pages = (len(player_rankings) + per_page - 1) // per_page
    start = (page - 1) * per_page
    end = start + per_page
    current_page_rankings = player_rankings[start:end]

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
    player_details = None
    tournament_results = []

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
        # We filter by players.fide_id
        try:
            c.execute(
                """
                SELECT 
                    t.id as tournament_id, 
                    t.name as tournament_name, 
                    r.points, 
                    r.tpr, 
                    r.rating as rating_in_tournament,
                    r.start_rank,
                    r.result_status,
                    CASE
                        WHEN t.name LIKE '%Mavens%' THEN 8
                        WHEN t.name LIKE '%Nairobi County%' THEN 8
                        WHEN t.name LIKE '%Quo Vadis%' THEN 8
                        ELSE 6
                    END as rounds
                FROM results r
                JOIN players p ON r.player_id = p.id 
                JOIN tournaments t ON r.tournament_id = t.id
                WHERE p.fide_id = ?
                ORDER BY t.id DESC -- Or however you want to order results
            """,
                (fide_id,),
            )
        except sqlite3.OperationalError as e:
            # If start_rank column doesn't exist or can't be accessed, try without it
            if 'no such column: r.start_rank' in str(e):
                logger.warning("start_rank column not found, using query without it")
                c.execute(
                    """
                    SELECT 
                        t.id as tournament_id, 
                        t.name as tournament_name, 
                        r.points, 
                        r.tpr, 
                        r.rating as rating_in_tournament,
                        r.result_status,
                        CASE
                            WHEN t.name LIKE '%Mavens%' THEN 8
                            WHEN t.name LIKE '%Nairobi County%' THEN 8
                            WHEN t.name LIKE '%Quo Vadis%' THEN 8
                            ELSE 6
                        END as rounds
                    FROM results r
                    JOIN players p ON r.player_id = p.id 
                    JOIN tournaments t ON r.tournament_id = t.id
                    WHERE p.fide_id = ?
                    ORDER BY t.id DESC -- Or however you want to order results
                """,
                    (fide_id,),
                )
            else:
                raise

        results_rows = c.fetchall()
        tournament_results = [dict(row) for row in results_rows]

    # Combine player details and results into the response
    return jsonify(
        {
            "name": player_details["name"],
            "fide_id": player_details["fide_id"],
            "federation": player_details["federation"],
            "results": [
                {
                    "tournament_id": result["tournament_id"],
                    "tournament_name": result["tournament_name"],
                    "points": result["points"],
                    "tpr": result["tpr"],
                    "rating_in_tournament": result["rating_in_tournament"],
                    "start_rank": result.get("start_rank"),
                    "rounds": result.get("rounds"),
                    "result_status": result.get("result_status", "valid"),
                    "chess_results_url": f"https://chess-results.com/tnr{result['tournament_id']}.aspx?lan=1",
                    "player_card_url": f"https://chess-results.com/tnr{result['tournament_id']}.aspx?lan=1&art=9&snr={result.get('start_rank', '')}" if result.get("start_rank") else None
                }
                for result in tournament_results
            ],
            # Note: 'rating' (current rating) isn't stored directly on players table
            # Could calculate from latest 'rating_in_tournament' if needed
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
    
    try:
        player_rankings = get_player_rankings()
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
                    r.points, 
                    r.tpr, 
                    r.rating as rating_in_tournament,
                    r.start_rank,
                    r.result_status,
                    CASE
                        WHEN t.name LIKE '%Mavens%' THEN 8
                        WHEN t.name LIKE '%Nairobi County%' THEN 8
                        WHEN t.name LIKE '%Quo Vadis%' THEN 8
                        ELSE 6
                    END as rounds
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
                result["rounds"],
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


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5004))
    app.run(host="0.0.0.0", port=port)
