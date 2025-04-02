# GP Tracker

A system to track and manage chess Grand Prix tournaments, calculate player standings, and determine qualifiers for the national team selection.

## Setup

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

## Project Structure

- `scraper/`: Chess-results.com scraping functionality
- `api/`: FastAPI backend (coming soon)
- `frontend/`: Web interface (coming soon)
- `tests/`: Test cases

## Features

- Scrapes tournament data from chess-results.com
- Filters for Kenyan players only
- Validates tournament completion and walkover rules
- Calculates standings based on best 4 TPRs
- Determines top 9 qualifiers for final knockout
