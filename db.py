import sqlite3
import logging
from typing import Dict, List, Optional, Tuple

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
                    start_date DATE,
                    end_date DATE,
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
                    start_rank INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
                    FOREIGN KEY (player_id) REFERENCES players(id),
                    PRIMARY KEY (tournament_id, player_id)
                )
            ''')
            
            # Create player_rankings table
            c.execute('''
                CREATE TABLE IF NOT EXISTS player_rankings (
                    player_id INTEGER PRIMARY KEY,
                    name TEXT NOT NULL,
                    fide_id TEXT,
                    rating INTEGER,
                    tournaments_played INTEGER,
                    best_1 REAL,
                    tournament_1 TEXT,
                    best_2 REAL,
                    best_3 REAL,
                    best_4 REAL,
                    FOREIGN KEY (player_id) REFERENCES players(id)
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
                    (tournament_id, player_id, rating, points, tpr, has_walkover, start_rank)
                    VALUES (?, ?, ?, ?, ?, ?, ?) 
                ''', (
                    tournament_id,
                    player_db_id, # Use the unique ID
                    player_rating, # Use rating from player object
                    result.points,
                    result.tpr, # Access TPR via dot notation
                    bool(result.has_walkover), # Access walkover via dot notation
                    result.start_rank # Access start_rank via dot notation
                ))
            
            conn.commit()

    def get_all_tournaments(self) -> List[Dict]:
        """Get all tournaments."""
        with sqlite3.connect(self.db_file) as conn:
            c = conn.cursor()
            c.execute('SELECT id, name, start_date, end_date, short_name FROM tournaments ORDER BY start_date DESC')
            return c.fetchall()
    
    def get_tournament(self, tournament_id: str) -> Optional[Dict]:
        """Get tournament details and results."""
        with sqlite3.connect(self.db_file) as conn:
            c = conn.cursor()
            
            # Get tournament name and dates
            c.execute('SELECT name, start_date, end_date, short_name FROM tournaments WHERE id = ?', (tournament_id,))
            tournament_row = c.fetchone()
            if not tournament_row:
                return None # Tournament not found
            tournament_name = tournament_row[0]
            start_date = tournament_row[1] if len(tournament_row) > 1 else None
            end_date = tournament_row[2] if len(tournament_row) > 2 else None
            short_name = tournament_row[3] if len(tournament_row) > 3 else None
            
            # Get results, joining players correctly
            try:
                c.execute('''
                    SELECT 
                        p.name, p.fide_id, p.federation,
                        r.rating, r.points, r.tpr, r.has_walkover, r.start_rank, r.result_status
                    FROM results r
                    JOIN players p ON r.player_id = p.id 
                    WHERE r.tournament_id = ?
                    ORDER BY r.tpr DESC
                ''', (tournament_id,))
            except sqlite3.OperationalError as e:
                # If start_rank column doesn't exist or can't be accessed, try without it
                if 'no such column: r.start_rank' in str(e):
                    logger.warning("start_rank column not found, using query without it")
                    c.execute('''
                        SELECT 
                            p.name, p.fide_id, p.federation,
                            r.rating, r.points, r.tpr, r.has_walkover, r.result_status
                        FROM results r
                        JOIN players p ON r.player_id = p.id 
                        WHERE r.tournament_id = ?
                        ORDER BY r.tpr DESC
                    ''', (tournament_id,))
                else:
                    raise
            
            results = []
            for row in c.fetchall():
                # Check row structure based on length
                has_start_rank = len(row) > 8  # With result_status, we have at least 9 columns
                has_result_status = len(row) > 7  # Either 8 (without start_rank) or 9 columns
                
                result_data = {
                    'player': {
                        'name': row[0],
                        'fide_id': row[1],
                        'federation': row[2]
                    },
                    'rating': row[3],
                    'points': row[4],
                    'tpr': row[5],
                    'has_walkover': bool(row[6])
                }
                
                # Add result_status if available (should be in all new data)
                if has_result_status:
                    result_status_idx = 8 if has_start_rank else 7
                    result_data['result_status'] = row[result_status_idx]
                else:
                    result_data['result_status'] = 'valid'  # Default for old data
                
                # Add start_rank if available
                if has_start_rank:
                    result_data['start_rank'] = row[7]
                
                results.append(result_data)
            
            return {
                'name': tournament_name,
                'short_name': short_name,
                'start_date': start_date,
                'end_date': end_date,
                'results': results
            }
    
    def get_all_results(self) -> Dict[str, List]:
        """Get all results grouped by player."""
        with sqlite3.connect(self.db_file) as conn:
            c = conn.cursor()
            
            try:
                c.execute('''
                    SELECT 
                        p.name, p.fide_id, p.federation,
                        r.rating, r.points, r.tpr, r.has_walkover, r.start_rank, r.result_status,
                        t.id, t.name, t.start_date, t.end_date,
                        p.id 
                    FROM results r
                    JOIN players p ON r.player_id = p.id
                    JOIN tournaments t ON r.tournament_id = t.id
                    ORDER BY r.tpr DESC
                ''')
            except sqlite3.OperationalError as e:
                # If start_rank column doesn't exist or can't be accessed, try without it
                if 'no such column: r.start_rank' in str(e):
                    logger.warning("start_rank column not found, using query without it")
                    c.execute('''
                        SELECT 
                            p.name, p.fide_id, p.federation,
                            r.rating, r.points, r.tpr, r.has_walkover, r.result_status,
                            t.id, t.name, t.start_date, t.end_date,
                            p.id 
                        FROM results r
                        JOIN players p ON r.player_id = p.id
                        JOIN tournaments t ON r.tournament_id = t.id
                        ORDER BY r.tpr DESC
                    ''')
                else:
                    raise
            
            all_results = {}
            for row in c.fetchall():
                # Check row length to determine structure
                has_start_rank = len(row) > 13  # With dates, we have at least 14 columns
                has_result_status = True  # We always expect result_status now
                
                # Calculate offsets based on available columns
                if has_start_rank:
                    # Full row with start_rank, result_status, and dates
                    # [name, fide_id, fed, rating, points, tpr, has_walkover, start_rank, result_status, t_id, t_name, t_start_date, t_end_date, p_id]
                    player_db_id = row[13]
                    tournament_id_idx = 9
                    tournament_name_idx = 10
                    tournament_start_date_idx = 11
                    tournament_end_date_idx = 12
                    result_status_idx = 8
                    start_rank_idx = 7
                else:
                    # Row without start_rank but with result_status and dates
                    # [name, fide_id, fed, rating, points, tpr, has_walkover, result_status, t_id, t_name, t_start_date, t_end_date, p_id]
                    player_db_id = row[12]
                    tournament_id_idx = 8
                    tournament_name_idx = 9
                    tournament_start_date_idx = 10
                    tournament_end_date_idx = 11
                    result_status_idx = 7
                    start_rank_idx = None
                
                if player_db_id not in all_results:
                    all_results[player_db_id] = []
            
                result_data = {
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
                        'id': row[tournament_id_idx],
                        'name': row[tournament_name_idx],
                        'start_date': row[tournament_start_date_idx],
                        'end_date': row[tournament_end_date_idx]
                    }
                }
                
                # Add result_status
                if has_result_status:
                    result_data['result_status'] = row[result_status_idx]
                
                # Add start_rank if available
                if has_start_rank:
                    result_data['start_rank'] = row[start_rank_idx]
                else:
                    result_data['start_rank'] = None
                
                all_results[player_db_id].append(result_data)
            
            return all_results

    def get_all_player_rankings(self) -> List[Dict]:
        """Get all player rankings from the pre-computed table."""
        with sqlite3.connect(self.db_file) as conn:
            conn.row_factory = sqlite3.Row
            c = conn.cursor()
            c.execute('SELECT * FROM player_rankings')
            return [dict(row) for row in c.fetchall()]

    def recalculate_rankings(self):
        """Recalculate and store all player rankings."""
        all_results = self.get_all_results()
        player_rankings_data = []

        for player_id, results in all_results.items():
            valid_results = [r for r in results if r["player"]["federation"] == "KEN" and
                             (r.get("result_status", "valid") == "valid" or r.get("result_status") is None)]

            if not valid_results:
                continue

            valid_results.sort(key=lambda x: x["tpr"] if x["tpr"] else 0, reverse=True)

            best_1 = valid_results[0]["tpr"] if len(valid_results) >= 1 else 0
            tournament_1 = valid_results[0]["tournament"]["name"] if len(valid_results) >= 1 else None
            best_2 = sum(r["tpr"] for r in valid_results[:2]) / 2 if len(valid_results) >= 2 else 0
            best_3 = sum(r["tpr"] for r in valid_results[:3]) / 3 if len(valid_results) >= 3 else 0
            best_4 = sum(r["tpr"] for r in valid_results[:4]) / 4 if len(valid_results) >= 4 else 0
            
            player_info = valid_results[0]["player"]
            player_rankings_data.append(
                (
                    player_id,
                    player_info["name"],
                    player_info["fide_id"],
                    player_info["rating"],
                    len(valid_results),
                    round(best_1),
                    tournament_1,
                    round(best_2),
                    round(best_3),
                    round(best_4),
                )
            )

        with sqlite3.connect(self.db_file) as conn:
            c = conn.cursor()
            c.execute('DELETE FROM player_rankings')
            c.executemany('''
                INSERT INTO player_rankings 
                (player_id, name, fide_id, rating, tournaments_played, best_1, tournament_1, best_2, best_3, best_4)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', player_rankings_data)
            conn.commit()
            logger.info(f"Recalculated and stored rankings for {c.rowcount} players.")


    def get_tournament_dates(self, tournament_id: str) -> Tuple[Optional[str], Optional[str]]:
        """Get start and end dates for a tournament."""
        with sqlite3.connect(self.db_file) as conn:
            c = conn.cursor()
            c.execute('SELECT start_date, end_date FROM tournaments WHERE id = ?', (tournament_id,))
            result = c.fetchone()
            if result:
                return result[0], result[1]
            return None, None
    
    def get_tournament_info(self, tournament_id: str) -> Optional[Dict]:
        """Get tournament info including short_name."""
        with sqlite3.connect(self.db_file) as conn:
            c = conn.cursor()
            c.execute('SELECT name, short_name, start_date, end_date FROM tournaments WHERE id = ?', (tournament_id,))
            result = c.fetchone()
            if result:
                return {
                    'name': result[0],
                    'short_name': result[1],
                    'start_date': result[2],
                    'end_date': result[3]
                }
            return None
            
    def delete_tournament_data(self, tournament_id: str):
        """Delete tournament and its associated results."""
        with sqlite3.connect(self.db_file) as conn:
            c = conn.cursor()
            c.execute('DELETE FROM results WHERE tournament_id = ?', (tournament_id,))
            c.execute('DELETE FROM tournaments WHERE id = ?', (tournament_id,))
            conn.commit()
            logger.info(f"Deleted data for tournament ID: {tournament_id}")

    def does_tournament_exist(self, tournament_id: str) -> bool:
        """Check if a tournament ID exists in the tournaments table."""
        with sqlite3.connect(self.db_file) as conn:
            conn.row_factory = sqlite3.Row
            c = conn.cursor()
            c.execute("SELECT 1 FROM tournaments WHERE id = ? LIMIT 1", (tournament_id,))
            return c.fetchone() is not None

    def get_tournament_results_count(self, tournament_id: str) -> int:
        """Get the count of results for a specific tournament."""
        with sqlite3.connect(self.db_file) as conn:
            conn.row_factory = sqlite3.Row
            c = conn.cursor()
            # Ensure the results table exists, handle potential error if it doesn't
            # (Though usually it should exist if tournaments do)
            try:
                c.execute("SELECT COUNT(*) as count FROM results WHERE tournament_id = ?", (tournament_id,))
                row = c.fetchone()
                return row['count'] if row else 0
            except sqlite3.OperationalError as e:
                logger.error(f"Error counting results for tournament {tournament_id}: {e}")
                return 0 # Return 0 if table/column missing or other SQL error

    def update_tournament_dates(self, tournament_id: str, start_date: str, end_date: str):
        """Update tournament start and end dates."""
        with sqlite3.connect(self.db_file) as conn:
            c = conn.cursor()
            c.execute('''
                UPDATE tournaments 
                SET start_date = ?, end_date = ? 
                WHERE id = ?
            ''', (start_date, end_date, tournament_id))
            conn.commit()
            return c.rowcount
