import json
import os
from typing import Dict, List, Optional
from dataclasses import asdict
from datetime import datetime, timedelta

class DataStore:
    def __init__(self, cache_file: str = 'cache.json'):
        self.cache_file = cache_file
        self.cache = self._load_cache()
    
    def _load_cache(self) -> Dict:
        """Load cache from file or create new cache."""
        if os.path.exists(self.cache_file):
            with open(self.cache_file, 'r') as f:
                return json.load(f)
        return {
            'tournaments': {},
            'last_updated': {},
            'cache_duration': 24 * 60 * 60  # 24 hours in seconds
        }
    
    def _save_cache(self):
        """Save cache to file."""
        with open(self.cache_file, 'w') as f:
            json.dump(self.cache, f, indent=2)
    
    def get_tournament_data(self, tournament_id: str) -> Optional[Dict]:
        """Get tournament data from cache if fresh."""
        if tournament_id not in self.cache['tournaments']:
            return None
            
        last_updated = datetime.fromtimestamp(self.cache['last_updated'].get(tournament_id, 0))
        if datetime.now() - last_updated > timedelta(seconds=self.cache['cache_duration']):
            return None
            
        return self.cache['tournaments'][tournament_id]
    
    def save_tournament_data(self, tournament_id: str, name: str, results: List):
        """Save tournament data to cache."""
        # Convert results to dict for JSON serialization
        results_dict = []
        for result in results:
            r = asdict(result)
            # Convert any non-serializable types
            r['player'] = {
                'name': result.player.name,
                'fide_id': result.player.fide_id,
                'rating': result.player.rating,
                'federation': result.player.federation
            }
            results_dict.append(r)
        
        self.cache['tournaments'][tournament_id] = {
            'name': name,
            'results': results_dict
        }
        self.cache['last_updated'][tournament_id] = datetime.now().timestamp()
        self._save_cache()
    
    def clear_cache(self):
        """Clear the entire cache."""
        if os.path.exists(self.cache_file):
            os.remove(self.cache_file)
        self.cache = self._load_cache()
