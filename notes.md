# Chess Grand Prix Tournament Tracker - Code Analysis

## Overview

The Chess Grand Prix Tournament Tracker is a web application designed to track Kenyan chess tournaments, player performances, and rankings. It uses a Flask backend with a Next.js frontend and SQLite for data storage. The application scrapes tournament data from chess-results.com and calculates performance metrics like Tournament Performance Rating (TPR).

## Architecture

### Backend (Python/Flask)
- **Flask API Server**: Provides endpoints for tournaments, rankings, and player data
- **Database Layer**: SQLite with a simple schema for tournaments, players, and results
- **Chess-Results.com Scraper**: Fetches tournament data from external source
- **TPR Calculation**: Logic for calculating player performance metrics

### Frontend (Next.js)
- **Modern React Components**: Uses a component-based architecture with shadcn/ui
- **API Service Layer**: Centralizes API calls to the backend
- **Responsive Design**: Adapts to different screen sizes
- **View Selectors**: Allows users to switch between different ranking views (Best 1, Best 2, Best 3, Best 4)

### Database (SQLite)
- Simple schema with three main tables:
  - `tournaments`: Stores tournament metadata
  - `players`: Stores player information
  - `results`: Links players to tournaments with performance data

## Features

1. **Tournament Tracking**
   - List of completed tournaments
   - Upcoming tournament schedule
   - Detailed tournament results with sorting and filtering

2. **Player Rankings**
   - Multiple ranking views (Best 1, Best 2, Best 3, Best 4 TPR averages)
   - Highlighting of top 9 players
   - Search functionality
   - Pagination for large result sets

3. **Player Profiles**
   - Individual player performance history
   - Tournament results for each player
   - Links to chess-results.com player cards

4. **Data Scraping**
   - Automated scraping from chess-results.com
   - Handling of various tournament formats
   - Detection of walkovers and special cases

5. **Performance Metrics**
   - Tournament Performance Rating (TPR) calculation
   - Averaging of best performances (Best 1/2/3/4)

## Strengths

1. **Clear Separation of Concerns**
   - Well-defined API boundaries between frontend and backend
   - Modular code structure with specific responsibilities

2. **Modern Tech Stack**
   - Next.js with React for a responsive frontend
   - Flask for a lightweight backend API
   - TypeScript for type safety in the frontend

3. **Efficient Data Caching**
   - Data is scraped once and stored in the database
   - Reduces load on chess-results.com and improves performance

4. **Flexible Ranking System**
   - Multiple views for different ranking criteria
   - Adapts to the tournament season progression

5. **Responsive UI**
   - Works well on mobile and desktop devices
   - Clean, intuitive interface

## Issues and Bugs

1. **Database Schema Limitations**
   - Composite player keys may lead to duplicate player entries
   - Missing indexes on frequently queried columns
   - Limited temporal data (no timestamps for when ratings were recorded)
   - Basic tournament metadata (missing location, dates, etc.)

2. **Error Handling**
   - Inconsistent error handling across the codebase
   - Some API endpoints don't return proper error responses
   - Frontend doesn't always gracefully handle backend errors

3. **Schema Evolution Challenges**
   - Code contains workarounds for missing columns (e.g., `start_rank`)
   - No proper migration system for schema changes

4. **Hardcoded Values**
   - Tournament IDs and names are hardcoded in multiple places
   - Round counts are sometimes hardcoded (e.g., Mavens Open = 8 rounds)
   - Locations and dates derived from tournament names

5. **Scraper Reliability**
   - Fragile parsing logic dependent on chess-results.com HTML structure
   - Limited error recovery for scraping failures
   - No retry mechanism for temporary failures

## Improvement Suggestions

### Database Improvements

1. **Schema Enhancement**
   - Add proper indexes for performance
   - Expand tournament metadata (location, dates, rounds)
   - Improve player identification with consistent keys
   - Add historical rating tracking

2. **Migration to Supabase/PostgreSQL**
   - Better scaling capabilities
   - Built-in real-time updates
   - More robust data types and constraints
   - Proper migration system

### Code Quality

1. **Standardized Error Handling**
   - Consistent error responses across all API endpoints
   - Better error logging and monitoring
   - Graceful degradation in the frontend

2. **Type Safety**
   - Use Pydantic for backend data validation
   - Complete TypeScript interfaces for all data structures

3. **Testing**
   - Add unit tests for critical components
   - Integration tests for API endpoints
   - Mock the chess-results.com scraper for reliable testing

### Feature Enhancements

1. **Tournament Management**
   - Admin interface for adding/editing tournaments
   - Manual data entry option when scraping fails
   - Tournament calendar with filtering

2. **Player Profiles**
   - Enhanced player statistics
   - Rating progression charts
   - Head-to-head records

3. **Ranking System**
   - More sophisticated ranking algorithms
   - Configurable weighting for different tournaments
   - Historical rankings view

4. **Data Visualization**
   - Performance charts and graphs
   - Tournament comparison tools
   - Rating distribution visualization

### Infrastructure

1. **Caching Layer**
   - Add Redis for API response caching
   - Reduce database load for common queries

2. **Background Processing**
   - Move scraping to background jobs
   - Implement a job queue for long-running tasks

3. **Monitoring and Logging**
   - Add structured logging
   - Performance monitoring
   - Error tracking and alerting

## Technical Documentation

### API Endpoints

| Endpoint | Method | Description | Query Parameters | Response |
|----------|--------|-------------|-----------------|----------|
| `/api/tournaments` | GET | List all tournaments | None | Array of tournament objects with id, name, results count, and status |
| `/api/tournament/<id>` | GET | Get tournament details | `sort`: Field to sort by<br>`dir`: Sort direction (asc/desc)<br>`page`: Page number<br>`all_results`: Boolean to return all results | Tournament details with results array |
| `/api/rankings` | GET | Get player rankings | `sort`: Ranking criteria (best_1, best_2, best_3, best_4)<br>`dir`: Sort direction<br>`page`: Page number<br>`q`: Search query<br>`top_only`: Boolean to return only top players | Rankings object with player array and pagination info |
| `/api/player/<fide_id>` | GET | Get player details and history | None | Player object with tournament results |
| `/api/refresh/<id>` | GET | Refresh tournament data from chess-results.com | None | Status object |

### Database Schema

#### `tournaments` Table
```sql
CREATE TABLE tournaments (
    id TEXT PRIMARY KEY,         -- Tournament ID from chess-results.com
    name TEXT NOT NULL,          -- Tournament name
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

#### `players` Table
```sql
CREATE TABLE players (
    id INTEGER PRIMARY KEY,      -- Internal player ID
    fide_id TEXT,                -- FIDE ID (can be NULL for unrated players)
    name TEXT NOT NULL,          -- Player name
    federation TEXT              -- Federation code (e.g., "KEN")
)
```

#### `results` Table
```sql
CREATE TABLE results (
    tournament_id TEXT,          -- References tournaments.id
    player_id INTEGER,           -- References players.id
    rating INTEGER,              -- Player rating at tournament time
    points REAL,                 -- Points scored in tournament
    tpr INTEGER,                 -- Tournament Performance Rating
    has_walkover BOOLEAN,        -- Whether player had a walkover
    start_rank INTEGER,          -- Starting rank in tournament
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
    FOREIGN KEY (player_id) REFERENCES players(id),
    PRIMARY KEY (tournament_id, player_id)
)
```

### Key Data Structures

#### Tournament Object
```typescript
interface Tournament {
  id: string                      // Tournament ID from chess-results.com
  name: string                    // Tournament name
  results: number                 // Number of results/players
  status: 'Completed' | 'Upcoming' // Tournament status
}
```

#### Player Ranking Object
```typescript
interface PlayerRanking {
  name: string                    // Player name
  fide_id: string | null          // FIDE ID (null for unrated players)
  rating: number | null           // Current rating
  tournaments_played: number      // Number of tournaments played
  best_1: number                  // Best single TPR
  tournament_1: string | null     // Tournament name for best TPR
  best_2: number                  // Average of 2 best TPRs
  best_3: number                  // Average of 3 best TPRs
  best_4: number                  // Average of 4 best TPRs
}
```

### Data Flow

1. **Tournament Data Acquisition**:
   - Data is scraped from chess-results.com using the `ChessResultsScraper` class
   - Tournament details and results are parsed from HTML
   - Data is stored in the SQLite database

2. **Ranking Calculation**:
   - Player results are retrieved from the database
   - TPRs are calculated for each tournament performance
   - Best performances are identified and averaged
   - Players are ranked based on the selected criteria (best_1/2/3/4)

3. **Data Presentation**:
   - Frontend fetches data from the API endpoints
   - Data is rendered using React components
   - User interactions (sorting, filtering, pagination) trigger new API requests

### Environment Configuration

- **Backend**:
  - `PORT`: Port for the Flask server (default: 5003)
  - Database file: `gp_tracker.db` in the project root

- **Frontend**:
  - `NEXT_PUBLIC_API_URL`: Backend API URL (default: https://gp-backend-viuj.onrender.com/api)

### Deployment

The application is deployed using Render:
- Backend: Flask API on Render web service
- Frontend: Next.js static site on Render static site

### Known Limitations

1. **Player Identification**:
   - Players are identified by FIDE ID when available
   - Players without FIDE ID are identified by name, which can lead to duplicates
   - No handling for name variations or spelling differences

2. **Tournament Data**:
   - Limited to data available on chess-results.com
   - No validation of data accuracy
   - Dependent on consistent HTML structure of chess-results.com

3. **Performance**:
   - No caching layer for API responses
   - Full database queries for each request
   - No background processing for scraping tasks

## Current Status

As of May 2025, the system is tracking 5 completed tournaments in the 2025 Grand Prix series:
1. Eldoret Open
2. Mavens Open
3. Waridi Chess Festival
4. Kisumu Open
5. Nakuru Open (East Africa Chess Championship)

The default ranking view has been updated from best_2 to best_3 TPR average after the completion of the Nakuru Open (5th tournament). This change reflects the progression of the season, now requiring players to show consistency across more tournaments (3/5) for optimal ranking.

## Next Steps

1. Implement the most critical database schema improvements
2. Enhance error handling in the scraper
3. Add more comprehensive tournament metadata
4. Develop better visualization tools for player performance
5. Consider migration path to a more robust database solution
