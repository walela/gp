# GP Tracker

A web application to track chess Grand Prix tournaments in Kenya, view player performances, and monitor tournament progress.

## Features

- View upcoming and completed tournaments
- Track player performance metrics (TPR, points)
- Filter and display Kenyan players
- Mobile-responsive design
- Real-time tournament data from chess-results.com

## Tech Stack

### Backend
- Python 3.9+
- Flask web framework
- BeautifulSoup4 for data scraping
- SQLite database

### Frontend
- Next.js 13 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui components

## Setup

### Backend

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

3. Start the Flask server:
```bash
python app.py
```

The server will start on http://localhost:5000

### Frontend

1. Navigate to the client directory:
```bash
cd client
```

2. Install Node.js dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The app will be available at http://localhost:3000

## Project Structure

```
.
├── app.py              # Flask application entry point
├── db.py              # Database models and utilities
├── requirements.txt    # Python dependencies
├── scraper/           # Chess-results.com scraping functionality
│   ├── __init__.py
│   └── chess_results.py
└── client/            # Next.js frontend
    ├── app/          # App Router pages and layouts
    ├── components/   # Reusable UI components
    └── services/     # API client and utilities
```

## Development

1. The backend provides a REST API for:
   - Tournament data
   - Player statistics
   - Real-time updates from chess-results.com

2. The frontend features:
   - Responsive layout for mobile and desktop
   - Real-time tournament updates
   - Player performance tracking
   - Tournament history and standings

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request
