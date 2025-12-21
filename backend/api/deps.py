"""
FastAPI dependencies.

Provides database connection and other shared resources.
"""

from typing import Generator
from db.connection import get_connection


def get_db() -> Generator:
    """
    Dependency that provides a database connection.

    Usage:
        @app.get("/example")
        def example(db = Depends(get_db)):
            db.execute("SELECT 1")
    """
    conn = get_connection()
    try:
        yield conn
    finally:
        conn.close()
