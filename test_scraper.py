from scraper.chess_results import ChessResultsScraper

def main():
    scraper = ChessResultsScraper()
    tournament_id = "1130967"  # Kisumu Open Chess Tournament
    
    try:
        tournament_name, results = scraper.get_tournament_data(tournament_id)
        print(f"\nTournament: {tournament_name}")
        print(f"Found {len(results)} Kenyan players\n")
        
        for result in results:
            print(f"Player: {result.player.name}")
            print(f"Federation: {result.player.federation}")
            print(f"FIDE ID: {result.player.fide_id}")
            print(f"Rating: {result.player.rating}")
            print(f"Points: {result.points}")
            print(f"TPR: {result.tpr}")
            print(f"Games Played: {result.games_played}/{result.total_rounds}")
            print(f"Has Walkover: {result.has_walkover}")
            print("-" * 50)
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
