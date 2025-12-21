"""
Entry point for the GP Tracker API.

Run with:
    uvicorn main:app --reload

Or:
    python main.py
"""

import os
from pathlib import Path

# Load environment variables
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

# Import the FastAPI app
from api.app import app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 8000)),
        reload=True,
    )
