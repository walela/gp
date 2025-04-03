from flask import Flask, jsonify, request
from flask_cors import CORS
from scraper.chess_results import ChessResultsScraper
from db import Database
from typing import Dict, List
import math
import sqlite3

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes
db = Database()

# Tournament IDs for 2024 Grand Prix
TOURNAMENTS = {
    "1095243": "Eldoret Chess Championships",
    "1126042": "Mavens Open",
    "1130967": "Waridi Chess Festival",
    "1135144": "Kisumu Open"
}

PLAYERS_PER_PAGE = 25

def get_tournament_data(tournament_id: str, force_refresh: bool = False):
    """Get tournament data from database or scrape if needed."""
    if not force_refresh:
        # Try to get from database first
        data = db.get_tournament(tournament_id)
        if data:
            return data['name'], data['results']
    
    # Not in database or force refresh, scrape it
    scraper = ChessResultsScraper()
    name, results = scraper.get_tournament_data(tournament_id)
    
    # Convert to dict for storage
    results_dict = []
    for result in results:
        r = {
            'player': {
                'name': result.player.name,
                'fide_id': result.player.fide_id,
                'rating': result.player.rating,
                'federation': result.player.federation
            },
            'points': result.points,
            'tpr': result.tpr,
            'has_walkover': result.has_walkover
        }
        results_dict.append(r)
    
    # Save to database
    db.save_tournament(tournament_id, TOURNAMENTS[tournament_id], results_dict)
    
    return TOURNAMENTS[tournament_id], results_dict

@app.route('/api/tournaments')
def tournaments():
    """Get list of all tournaments."""
    tournament_list = []
    for id, name in TOURNAMENTS.items():
        data = db.get_tournament(id)
        tournament_list.append({
            'id': id,
            'name': name,
            'results': len(data['results']) if data else 0,
            'status': 'Completed' if data else 'Upcoming'
        })
    return jsonify(tournament_list)

@app.route('/api/tournament/<tournament_id>')
def tournament(tournament_id):
    sort = request.args.get('sort', 'points')
    dir = request.args.get('dir', 'desc')
    page = int(request.args.get('page', '1'))
    per_page = 25

    tournament_name, results = get_tournament_data(tournament_id)
    
    # Sort results
    if sort == 'name':
        results.sort(key=lambda x: x['player']['name'].lower(), reverse=dir == 'desc')
    elif sort == 'rating':
        results.sort(key=lambda x: x['player']['rating'] or 0, reverse=dir == 'desc')
    elif sort == 'points':
        results.sort(key=lambda x: x['points'], reverse=dir == 'desc')
    elif sort == 'tpr':
        results.sort(key=lambda x: x['tpr'] or 0, reverse=dir == 'desc')

    # Paginate results
    total_pages = (len(results) + per_page - 1) // per_page
    start = (page - 1) * per_page
    end = start + per_page
    paginated_results = results[start:end]

    return jsonify({
        'name': tournament_name,
        'id': tournament_id,
        'results': paginated_results,
        'total': len(results),
        'page': page,
        'total_pages': total_pages
    })

def get_player_rankings():
    all_results = db.get_all_results()
    
    # Calculate best N results for each player
    player_rankings = []
    for player_id, results in all_results.items():
        # Sort by TPR
        results.sort(key=lambda x: x['tpr'] if x['tpr'] else 0, reverse=True)
        
        # Get best results
        best_1 = results[0]['tpr'] if len(results) >= 1 else 0
        best_2 = sum(r['tpr'] for r in results[:2]) / 2 if len(results) >= 2 else 0
        best_3 = sum(r['tpr'] for r in results[:3]) / 3 if len(results) >= 3 else 0
        best_4 = sum(r['tpr'] for r in results[:4]) / 4 if len(results) >= 4 else 0
        
        player_rankings.append({
            'name': results[0]['player']['name'],
            'fide_id': results[0]['player']['fide_id'],
            'rating': results[0]['player']['rating'],
            'tournaments_played': len(results),
            'best_1': round(best_1),
            'tournament_1': results[0]['tournament']['name'] if len(results) >= 1 else None,
            'best_2': round(best_2),
            'best_3': round(best_3),
            'best_4': round(best_4)
        })
    
    return player_rankings

@app.route('/api/rankings')
def rankings():
    """Get current GP rankings."""
    sort = request.args.get('sort', 'best_4')
    dir = request.args.get('dir', 'desc')
    page = int(request.args.get('page', '1'))
    per_page = 25

    player_rankings = get_player_rankings()
    reverse = dir == 'desc'

    # Map frontend sort keys to data keys
    sort_key = {
        'name': 'name',
        'rating': 'rating',
        'tournaments_played': 'tournaments_played',
        'best_1': 'best_1',
        'best_2': 'best_2',
        'best_3': 'best_3',
        'best_4': 'best_4'
    }.get(sort, 'best_4')

    player_rankings.sort(key=lambda x: (x[sort_key] if x[sort_key] is not None else -float('inf')), reverse=reverse)

    total_pages = (len(player_rankings) + per_page - 1) // per_page
    start = (page - 1) * per_page
    end = start + per_page
    current_page_rankings = player_rankings[start:end]

    return jsonify({
        'rankings': current_page_rankings,
        'total': len(player_rankings),
        'page': page,
        'total_pages': total_pages
    })

@app.route('/api/player/<fide_id>')
def player(fide_id):
    """Get player tournament history."""
    # Query database for all tournaments
    with sqlite3.connect(db.db_file) as conn:
        c = conn.cursor()
        c.execute('''
            SELECT t.id, t.name, r.points, r.tpr, r.rating
            FROM tournaments t
            JOIN results r ON t.id = r.tournament_id
            JOIN players p ON r.player_fide_id = p.fide_id AND r.player_name = p.name
            WHERE p.fide_id = ?
            ORDER BY t.created_at DESC
        ''', (fide_id,))
        results = c.fetchall()
        
        # Get player name and latest rating
        c.execute('''
            SELECT p.name, r.rating 
            FROM players p
            JOIN results r ON r.player_fide_id = p.fide_id AND r.player_name = p.name
            WHERE p.fide_id = ?
            ORDER BY r.created_at DESC
            LIMIT 1
        ''', (fide_id,))
        player_info = c.fetchone()
        
        if not player_info:
            return jsonify({'error': 'Player not found'}), 404
            
        player_name, player_rating = player_info
        
        tournament_results = []
        for tournament_id, tournament_name, points, tpr, rating in results:
            tournament_results.append({
                'tournament_id': tournament_id,
                'tournament_name': tournament_name,
                'points': points,
                'tpr': tpr,
                'rating': rating
            })
        
        return jsonify({
            'name': player_name,
            'fide_id': fide_id,
            'rating': player_rating,
            'results': tournament_results
        })

@app.route('/api/refresh/<tournament_id>')
def refresh_tournament(tournament_id):
    """Force refresh tournament data."""
    get_tournament_data(tournament_id, force_refresh=True)
    return jsonify({'status': 'success'})

if __name__ == '__main__':
    app.run(debug=True, port=5003)
