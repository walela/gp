from scraper.chess_results import ChessResultsScraper

def main():
    # Initialize scraper
    scraper = ChessResultsScraper()
    
    # Eldoret Open 2024
    tournament_id = "1095243"
    
    # Get tournament data
    tournament_name, results = scraper.get_tournament_data(tournament_id)
    
    # Sort by TPR (highest first)
    results.sort(key=lambda x: x.tpr if x.tpr else 0, reverse=True)
    
    print(f"\nTournament: {tournament_name}")
    print("-" * 50)
    print(f"Total Kenyan players: {len(results)}")
    print(f"Players with walkovers/missing rounds: {len([r for r in results if r.has_walkover])}")
    print("\nTop 10 Players by TPR:")
    print("-" * 50)
    
    for i, result in enumerate(results[:10], 1):
        print(f"{i}. {result.player.name}")
        print(f"   FIDE ID: {result.player.fide_id or 'None'}")
        print(f"   Rating: {result.player.rating}")
        print(f"   Points: {result.points}")
        print(f"   TPR: {result.tpr}")
        print()

if __name__ == "__main__":
    main()
