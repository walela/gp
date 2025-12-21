"""
FastAPI application setup.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes import tournaments, rankings, players, admin

app = FastAPI(
    title="GP Tracker API",
    description="Kenya Chess Grand Prix Tournament Tracker",
    version="2.0.0",
)

# CORS - allow frontend to call API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Local dev
        "https://kenyachess.com",  # Production (update as needed)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(tournaments.router, prefix="/api", tags=["tournaments"])
app.include_router(rankings.router, prefix="/api", tags=["rankings"])
app.include_router(players.router, prefix="/api", tags=["players"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])


@app.get("/")
def root():
    """Health check endpoint."""
    return {"status": "ok", "service": "gp-tracker"}


@app.get("/api/health")
def health():
    """API health check."""
    return {"status": "ok"}
