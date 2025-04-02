from flask import Flask, render_template, redirect, url_for, request
from scraper.chess_results import ChessResultsScraper
from db import Database
from typing import Dict, List
import math

app = Flask(__name__)
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

@app.route('/')
def home():
    """Home page showing list of tournaments."""
    return render_template('home.html', tournaments=TOURNAMENTS)

@app.route('/tournament/<tournament_id>')
def tournament(tournament_id):
    """Individual tournament results page."""
    tournament_name, results = get_tournament_data(tournament_id)
    
    # Sort by TPR
    results.sort(key=lambda x: x['tpr'] if x['tpr'] else 0, reverse=True)
    
    return render_template('tournament.html', 
                         tournament_name=tournament_name,
                         tournament_id=tournament_id,
                         results=results)

@app.route('/rankings')
def rankings():
    """Rankings page showing running tally."""
    # Get sort parameters
    sort_by = request.args.get('sort', 'best_4')  # Default sort by best 4
    sort_dir = request.args.get('dir', 'desc')  # Default descending
    page = int(request.args.get('page', 1))  # Default to first page
    
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
    
    # Sort rankings
    sort_key = sort_by
    reverse = sort_dir == 'desc'
    player_rankings.sort(key=lambda x: (x[sort_key] if x[sort_key] is not None else -float('inf')), reverse=reverse)
    
    # Paginate results
    total_pages = math.ceil(len(player_rankings) / PLAYERS_PER_PAGE)
    start_idx = (page - 1) * PLAYERS_PER_PAGE
    end_idx = start_idx + PLAYERS_PER_PAGE
    current_page_rankings = player_rankings[start_idx:end_idx]
    
    return render_template('rankings.html', 
                         rankings=current_page_rankings,
                         sort_by=sort_by,
                         sort_dir=sort_dir,
                         current_page=page,
                         total_pages=total_pages)

@app.route('/refresh/<tournament_id>')
def refresh_tournament(tournament_id):
    """Force refresh tournament data."""
    get_tournament_data(tournament_id, force_refresh=True)
    return redirect(url_for('tournament', tournament_id=tournament_id))

if __name__ == '__main__':
    app.run(debug=True, port=5003)
