"""
Database connection for Turso.

Usage:
    from db.connection import get_connection
    conn = get_connection()
    conn.execute("SELECT * FROM players")

Run directly to create tables:
    python db/connection.py
"""

import os
import libsql_experimental as libsql
from pathlib import Path

def get_connection():
    """Get a connection to the Turso database."""
    url = os.environ.get("TURSO_URL")
    token = os.environ.get("TURSO_AUTH_TOKEN")

    if not url or not token:
        raise ValueError("TURSO_URL and TURSO_AUTH_TOKEN must be set")

    return libsql.connect(url, auth_token=token)


def run_schema():
    """Run schema.sql to create tables."""
    conn = get_connection()

    schema_path = Path(__file__).parent / "schema.sql"
    with open(schema_path) as f:
        schema = f.read()

    conn.executescript(schema)
    conn.commit()
    print("Schema created successfully")


if __name__ == "__main__":
    # Load .env file when running directly
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent.parent / ".env")

    run_schema()
