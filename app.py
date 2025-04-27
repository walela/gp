from flask import Flask, jsonify, request
from flask_cors import CORS
from chess_results import ChessResultsScraper
from db import Database
import sqlite3
import os
import logging
import functools
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes
db = Database()

# Tournament IDs for 2025 Grand Prix
TOURNAMENTS = {
    "1095243": "Eldoret Open",
    "1126042": "Mavens Open",
    "1130967": "Waridi Chess Festival",
    "1135144": "Kisumu Open",
}

PLAYERS_PER_PAGE = 25

# Simple in-memory cache
cache = {}
CACHE_DURATION = 2592000  # Cache duration in seconds (30 days)

def timed_cache(seconds=CACHE_DURATION):
    """
    Decorator that caches the result of a function for a specified number of seconds.
    """
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Create a cache key from function name and arguments
            key = f"{func.__name__}:{str(args)}:{str(kwargs)}"
            
            # Check if result is in cache and not expired
            if key in cache:
                result, timestamp = cache[key]
                if datetime.now() - timestamp < timedelta(seconds=seconds):
                    logger.info(f"Cache hit for {key}")
                    return result
            
            # Call the function and cache the result
            result = func(*args, **kwargs)
            cache[key] = (result, datetime.now())
            return result
        return wrapper
    return decorator

@timed_cache(seconds=2592000)  # Cache for 30 days
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
    db.save_tournament(tournament_id, TOURNAMENTS[tournament_id], results_dict)

    return TOURNAMENTS[tournament_id], results_dict


@app.route("/api/tournaments")
@timed_cache(seconds=2592000)  # Cache for 30 days
def tournaments():
    """Get list of all tournaments."""
    tournament_list = []
    for id, name in TOURNAMENTS.items():
        try:
            data = db.get_tournament(id)
            tournament_list.append(
                {
                    "id": id,
                    "name": name,
                    "results": len(data["results"]) if data else 0,
                    "status": "Completed" if data else "Upcoming",
                }
            )
        except Exception as e:
            logger.error(f"Error getting tournament {id}: {e}")
            tournament_list.append(
                {
                    "id": id,
                    "name": name,
                    "results": 0,
                    "status": "Error",
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

    # Create a cache key based on the request parameters
    cache_key = f"tournament:{tournament_id}:{sort}:{dir}:{page}:{all_results}"
    
    # Check if result is in cache and not expired
    if cache_key in cache:
        result, timestamp = cache[cache_key]
        if datetime.now() - timestamp < timedelta(seconds=CACHE_DURATION):
            logger.info(f"Cache hit for {cache_key}")
            return result

    try:
        data = db.get_tournament(tournament_id)
        if not data:
            return jsonify({"error": "Tournament not found"}), 404
            
        tournament_name = data["name"]
        results = data["results"]

        # Sort results - optimize by using key functions
        if sort == "name":
            key_func = lambda x: x["player"]["name"].lower()
        elif sort == "rating":
            key_func = lambda x: x.get("rating", 0) or 0
        elif sort == "points":
            key_func = lambda x: x["points"]
        elif sort == "tpr":
            key_func = lambda x: x.get("tpr", 0) or 0
        else:
            key_func = lambda x: x["points"]
            
        results.sort(key=key_func, reverse=dir == "desc")

        # If all_results is true, return all results without pagination
        if all_results:
            response = jsonify(
                {
                    "name": tournament_name,
                    "id": tournament_id,
                    "results": results,
                    "total": len(results),
                    "page": 1,
                    "total_pages": 1,
                }
            )
            cache[cache_key] = (response, datetime.now())
            return response

        # Paginate results
        total_pages = (len(results) + per_page - 1) // per_page
        start = (page - 1) * per_page
        end = start + per_page
        paginated_results = results[start:end]

        response = jsonify(
            {
                "name": tournament_name,
                "id": tournament_id,
                "results": paginated_results,
                "total": len(results),
                "page": page,
                "total_pages": total_pages,
            }
        )
        
        # Cache the response
        cache[cache_key] = (response, datetime.now())
        return response
    except Exception as e:
        logger.error(f"Error getting tournament {tournament_id}: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/player-rankings")
@timed_cache(seconds=2592000)  # Cache for 30 days
def get_player_rankings():
    # Get all results grouped by player
    all_results = db.get_all_results()
    
    # Process results to calculate GP points
    player_rankings = []
    
    for player_id, results in all_results.items():
        # Only include players with at least one result
        if not results:
            continue
            
        # Get player details from first result
        player = results[0]["player"]
        
        # Calculate best TPRs
        valid_results = [r for r in results if r["tpr"] is not None]
        valid_results.sort(key=lambda x: x["tpr"] or 0, reverse=True)
        
        # Take up to 4 best results
        best_results = valid_results[:4]
        
        # Fill missing slots with zeros
        while len(best_results) < 4:
            best_results.append({"tpr": 0, "tournament": {"id": None, "name": None}})
        
        # Create ranking entry
        ranking = {
            "name": player["name"],
            "fide_id": player["fide_id"],
            "rating": player["rating"],
            "tournaments_played": len(valid_results),
            "best_1": best_results[0]["tpr"] if len(best_results) > 0 else 0,
            "tournament_1": best_results[0]["tournament"]["name"] if len(best_results) > 0 else None,
            "best_2": best_results[1]["tpr"] if len(best_results) > 1 else 0,
            "best_3": best_results[2]["tpr"] if len(best_results) > 2 else 0,
            "best_4": best_results[3]["tpr"] if len(best_results) > 3 else 0,
        }
        
        player_rankings.append(ranking)
    
    return player_rankings


@app.route("/api/rankings")
def rankings():
    """Get current GP rankings."""
    sort = request.args.get("sort", "best_2")
    dir = request.args.get("dir", "desc")
    page = int(request.args.get("page", "1"))
    per_page = 25
    search_query = request.args.get("q", "").lower()
    limit = request.args.get("limit")
    top_only = request.args.get("top_only", "false").lower() == "true"
    
    # Create a cache key based on the request parameters
    cache_key = f"rankings:{sort}:{dir}:{page}:{search_query}:{limit}:{top_only}"
    
    # Check if result is in cache and not expired
    if cache_key in cache:
        result, timestamp = cache[cache_key]
        if datetime.now() - timestamp < timedelta(seconds=CACHE_DURATION):
            logger.info(f"Cache hit for {cache_key}")
            return result

    try:
        # Get player rankings
        player_rankings = get_player_rankings()
        
        # Filter by search query if provided
        if search_query:
            player_rankings = [
                p for p in player_rankings 
                if search_query in p["name"].lower()
            ]
        
        # Sort rankings
        if sort == "name":
            player_rankings.sort(key=lambda x: x["name"].lower(), reverse=dir == "desc")
        elif sort == "rating":
            player_rankings.sort(key=lambda x: x["rating"] or 0, reverse=dir == "desc")
        elif sort == "tournaments_played":
            player_rankings.sort(key=lambda x: x["tournaments_played"], reverse=dir == "desc")
        elif sort == "best_1":
            player_rankings.sort(key=lambda x: x["best_1"], reverse=dir == "desc")
        elif sort == "best_2":
            # Sort by sum of best 2 TPRs
            player_rankings.sort(key=lambda x: x["best_1"] + x["best_2"], reverse=dir == "desc")
        elif sort == "best_3":
            # Sort by sum of best 3 TPRs
            player_rankings.sort(key=lambda x: x["best_1"] + x["best_2"] + x["best_3"], reverse=dir == "desc")
        elif sort == "best_4":
            # Sort by sum of best 4 TPRs
            player_rankings.sort(key=lambda x: x["best_1"] + x["best_2"] + x["best_3"] + x["best_4"], reverse=dir == "desc")
        
        # Apply limit if specified (for top players)
        if limit:
            try:
                limit_val = int(limit)
                player_rankings = player_rankings[:limit_val]
            except ValueError:
                pass
        
        # If top_only is true, return all filtered results without pagination
        if top_only:
            response = jsonify({
                "rankings": player_rankings,
                "total": len(player_rankings),
                "page": 1,
                "total_pages": 1
            })
            cache[cache_key] = (response, datetime.now())
            return response
        
        # Paginate results
        total = len(player_rankings)
        total_pages = (total + per_page - 1) // per_page
        start = (page - 1) * per_page
        end = start + per_page
        paginated_rankings = player_rankings[start:end]
        
        response = jsonify({
            "rankings": paginated_rankings,
            "total": total,
            "page": page,
            "total_pages": total_pages
        })
        
        # Cache the response
        cache[cache_key] = (response, datetime.now())
        return response
    except Exception as e:
        logger.error(f"Error getting rankings: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/player/<fide_id>")
def player(fide_id):
    """Get player tournament history."""
    # Create a cache key based on the player ID
    cache_key = f"player:{fide_id}"
    
    # Check if result is in cache and not expired
    if cache_key in cache:
        result, timestamp = cache[cache_key]
        if datetime.now() - timestamp < timedelta(seconds=CACHE_DURATION):
            logger.info(f"Cache hit for {cache_key}")
            return result

    try:
        with sqlite3.connect(db.db_file) as conn:
            conn.row_factory = sqlite3.Row
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
                        CASE
                            WHEN t.name LIKE '%Mavens%' THEN 8
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
                            CASE
                                WHEN t.name LIKE '%Mavens%' THEN 8
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
        response = jsonify(
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
                        "chess_results_url": f"https://chess-results.com/tnr{result['tournament_id']}.aspx?lan=1",
                        "player_card_url": f"https://chess-results.com/tnr{result['tournament_id']}.aspx?lan=1&art=9&snr={result.get('start_rank', '')}" if result.get("start_rank") else None
                    }
                    for result in tournament_results
                ],
                # Note: 'rating' (current rating) isn't stored directly on players table
                # Could calculate from latest 'rating_in_tournament' if needed
            }
        )
        
        # Cache the response
        cache[cache_key] = (response, datetime.now())
        return response
    except Exception as e:
        logger.error(f"Error getting player {fide_id}: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/refresh/<tournament_id>")
def refresh_tournament(tournament_id):
    """Force refresh tournament data from chess-results.com."""
    try:
        # Clear cache entries for this tournament
        for key in list(cache.keys()):
            if f"tournament:{tournament_id}" in key or "rankings:" in key:
                del cache[key]
                
        # Delete existing tournament data
        db.delete_tournament_data(tournament_id)
        
        # Re-scrape tournament data
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
                "start_rank": result.start_rank if hasattr(result, 'start_rank') else None
            }
            results_dict.append(r)
        
        # Save to database
        db.save_tournament(tournament_id, TOURNAMENTS.get(tournament_id, name), results_dict)
        
        return jsonify({"status": "success", "message": f"Tournament {tournament_id} refreshed successfully"})
    except Exception as e:
        logger.error(f"Error refreshing tournament {tournament_id}: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5003))
    app.run(host="0.0.0.0", port=port)
