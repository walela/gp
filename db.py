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
                    fide_id TEXT,
                    name TEXT NOT NULL,
                    federation TEXT,
                    PRIMARY KEY (fide_id, name)
                )
            ''')
            
            # Create results table
            c.execute('''
                CREATE TABLE IF NOT EXISTS results (
                    tournament_id TEXT,
                    player_fide_id TEXT,
                    player_name TEXT,
                    rating INTEGER,
                    points REAL,
                    tpr INTEGER,
                    has_walkover BOOLEAN,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
                    FOREIGN KEY (player_fide_id, player_name) REFERENCES players(fide_id, name),
                    PRIMARY KEY (tournament_id, player_fide_id, player_name)
                )
            ''')
            
            conn.commit()
    
    def save_tournament(self, tournament_id: str, name: str, results: List):
        """Save tournament and its results."""
        with sqlite3.connect(self.db_file) as conn:
            c = conn.cursor()
            
            # Save tournament
            c.execute('INSERT OR REPLACE INTO tournaments (id, name) VALUES (?, ?)',
                     (tournament_id, name))
            
            # Save results
            for result in results:
                player = result['player']
                
                # Save player
                c.execute('''
                    INSERT OR REPLACE INTO players (fide_id, name, federation)
                    VALUES (?, ?, ?)
                ''', (player['fide_id'], player['name'], player.get('federation')))
                
                # Save result
                c.execute('''
                    INSERT OR REPLACE INTO results 
                    (tournament_id, player_fide_id, player_name, rating, points, tpr, has_walkover)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (
                    tournament_id,
                    player['fide_id'],
                    player['name'],
                    player['rating'],
                    result['points'],
                    result['tpr'],
                    result['has_walkover']
                ))
            
            conn.commit()
    
    def get_tournament(self, tournament_id: str) -> Optional[Dict]:
        """Get tournament and its results."""
        with sqlite3.connect(self.db_file) as conn:
            c = conn.cursor()
            
            # Get tournament
            c.execute('SELECT name FROM tournaments WHERE id = ?', (tournament_id,))
            tournament = c.fetchone()
            if not tournament:
                return None
                
            # Get results
            c.execute('''
                SELECT 
                    p.name, p.fide_id, p.federation,
                    r.rating, r.points, r.tpr, r.has_walkover
                FROM results r
                JOIN players p ON r.player_name = p.name
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
                'name': tournament[0],
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
                    t.id, t.name
                FROM results r
                JOIN players p ON r.player_name = p.name
                JOIN tournaments t ON r.tournament_id = t.id
                ORDER BY r.tpr DESC
            ''')
            
            all_results = {}
            for row in c.fetchall():
                player_id = row[1] or row[0]  # fide_id or name
                if player_id not in all_results:
                    all_results[player_id] = []
                
                all_results[player_id].append({
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
