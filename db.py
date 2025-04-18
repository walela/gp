import sqlite3
from typing import List, Dict, Optional
from dataclasses import asdict
import logging

logger = logging.getLogger(__name__)

class Database:
    def __init__(self, db_file: str = 'gp_tracker.db'):
        self.db_file = db_file
        self._init_db()
    
    def _init_db(self):
        """Initialize database schema."""
        with sqlite3.connect(self.db_file) as conn:
            c = conn.cursor()
            
            # Create tournaments table
            c.execute('''
                CREATE TABLE IF NOT EXISTS tournaments (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Create players table
            c.execute('''
                CREATE TABLE IF NOT EXISTS players (
                    id INTEGER PRIMARY KEY,
                    fide_id TEXT,
                    name TEXT NOT NULL,
                    federation TEXT
                )
            ''')
            
            # Create results table
            c.execute('''
                CREATE TABLE IF NOT EXISTS results (
                    tournament_id TEXT,
                    player_id INTEGER,
                    rating INTEGER,
                    points REAL,
                    tpr INTEGER,
                    has_walkover BOOLEAN,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
                    FOREIGN KEY (player_id) REFERENCES players(id),
                    PRIMARY KEY (tournament_id, player_id)
                )
            ''')
            
            conn.commit()
    
    def save_tournament(self, tournament_id: str, tournament_name: str, results: List[Dict]):
        """Save tournament data and results."""
        with sqlite3.connect(self.db_file) as conn:
            c = conn.cursor()
            
            # Save tournament info
            c.execute('''
                INSERT OR REPLACE INTO tournaments (id, name) VALUES (?, ?)
            ''', (tournament_id, tournament_name))
            
            for result in results: # result is a TournamentResult object
                # Access attributes using dot notation
                player = result.player # player is a Player object
                player_fide_id = player.fide_id 
                player_name = player.name
                player_federation = player.federation
                player_rating = player.rating 

                # --- Start: Find or Create Player --- 
                player_db_id = None

                # 1. Try to find by FIDE ID first
                if player_fide_id:
                    c.execute('SELECT id FROM players WHERE fide_id = ?', (player_fide_id,))
                    existing_player = c.fetchone()
                    if existing_player:
                        player_db_id = existing_player[0]
                        # Optional: Update name/federation if changed? For now, assume FIDE ID is master.
                        # c.execute('UPDATE players SET name = ?, federation = ? WHERE id = ?', 
                        #           (player_name, player_federation, player_db_id))

                # 2. If no FIDE ID or not found by FIDE ID, try to find by name (case-insensitive)
                if player_db_id is None:
                    c.execute('SELECT id FROM players WHERE lower(name) = lower(?) AND fide_id IS NULL', (player_name,))
                    existing_player_by_name = c.fetchone()
                    if existing_player_by_name:
                        player_db_id = existing_player_by_name[0]
                        # If we found by name, maybe update FIDE ID if it's now available?
                        if player_fide_id:
                             c.execute('UPDATE players SET fide_id = ? WHERE id = ?', (player_fide_id, player_db_id))

                # 3. If still not found, insert new player
                if player_db_id is None:
                    c.execute('''
                        INSERT INTO players (fide_id, name, federation) 
                        VALUES (?, ?, ?)
                    ''', (player_fide_id, player_name, player_federation))
                    player_db_id = c.lastrowid # Get the ID of the newly inserted player
                # --- End: Find or Create Player ---

                # Save result using the unique player_db_id and dot notation for result attributes
                c.execute('''
                    INSERT OR REPLACE INTO results 
                    (tournament_id, player_id, rating, points, tpr, has_walkover)
                    VALUES (?, ?, ?, ?, ?, ?) 
                ''', (
                    tournament_id,
                    player_db_id, # Use the unique ID
                    player_rating, # Use rating from player object
                    result.points,
                    result.tpr, # Access TPR via dot notation
                    bool(result.has_walkover) # Access walkover via dot notation
                ))
            
            conn.commit()
    
    def get_tournament(self, tournament_id: str) -> Optional[Dict]:
        """Get tournament details and results."""
        with sqlite3.connect(self.db_file) as conn:
            c = conn.cursor()
            
            # Get tournament name
            c.execute('SELECT name FROM tournaments WHERE id = ?', (tournament_id,))
            tournament_row = c.fetchone()
            if not tournament_row:
                return None # Tournament not found
            tournament_name = tournament_row[0]
            
            # Get results, joining players correctly
            c.execute('''
                SELECT 
                    p.name, p.fide_id, p.federation,
                    r.rating, r.points, r.tpr, r.has_walkover
                FROM results r
                JOIN players p ON r.player_id = p.id 
                WHERE r.tournament_id = ?
                ORDER BY r.tpr DESC
            ''', (tournament_id,))
            
            results = []
            for row in c.fetchall():
                results.append({
                    'player': {
                        'name': row[0],
                        'fide_id': row[1],
                        'federation': row[2],
                        'rating': row[3]
                    },
                    'points': row[4],
                    'tpr': row[5],
                    'has_walkover': bool(row[6])
                })
            
            return {
                'name': tournament_name,
                'results': results
            }
    
    def get_all_results(self) -> Dict[str, List]:
        """Get all results grouped by player."""
        with sqlite3.connect(self.db_file) as conn:
            c = conn.cursor()
            
            c.execute('''
                SELECT 
                    p.name, p.fide_id, p.federation,
                    r.rating, r.points, r.tpr, r.has_walkover,
                    t.id, t.name,
                    p.id 
                FROM results r
                JOIN players p ON r.player_id = p.id
                JOIN tournaments t ON r.tournament_id = t.id
                ORDER BY r.tpr DESC
            ''')
            
            all_results = {}
            for row in c.fetchall():
                player_db_id = row[9] 
                
                if player_db_id not in all_results:
                    all_results[player_db_id] = []
            
                all_results[player_db_id].append({
                    'player': {
                        'name': row[0],
                        'fide_id': row[1],
                        'federation': row[2],
                        'rating': row[3]
                    },
                    'points': row[4],
                    'tpr': row[5],
                    'has_walkover': bool(row[6]),
                    'tournament': {
                        'id': row[7],
                        'name': row[8]
                    }
                })
            
            return all_results

    def delete_tournament_data(self, tournament_id: str):
        """Delete tournament and its associated results."""
        with sqlite3.connect(self.db_file) as conn:
            c = conn.cursor()
            c.execute('DELETE FROM results WHERE tournament_id = ?', (tournament_id,))
            c.execute('DELETE FROM tournaments WHERE id = ?', (tournament_id,))
            conn.commit()
            logger.info(f"Deleted data for tournament ID: {tournament_id}")
