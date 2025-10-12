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

## Local Setup

### Prerequisites

- [uv](https://github.com/astral-sh/uv) (Python package/dependency manager)
- Node.js 18+ and npm

### Quick start (recommended)

1. Make the helper script executable (first time only):
   ```bash
   chmod +x dev.sh
   ```
2. Run the combined dev environment:
   ```bash
   ./dev.sh
   ```
   This will:
   - create/refresh a `.venv` using `uv`
   - install Python requirements
   - install frontend dependencies (`client/node_modules`)
   - start the Flask API on http://127.0.0.1:5004 (logs in `.logs/backend.log`)
   - start the Next.js dev server on http://localhost:3000

### Manual setup (optional)

If you prefer managing processes yourself, you can still do it manually:

#### Backend

```bash
uv venv
uv pip install -r requirements.txt
uv run python app.py  # serves on http://127.0.0.1:5004 by default
```

#### Frontend

```bash
cd client
npm install
npm run dev  # serves on http://localhost:3000
```

### Frontend environment configuration

Create `client/.env.local` so the Next.js app talks to your local Flask instance:

```
NEXT_PUBLIC_API_URL=http://127.0.0.1:5004/api
```

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
