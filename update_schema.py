"""Utility to ensure the SQLite schema is migrated before scraping."""

from db import Database

def update_schema() -> None:
    """Instantiate Database to run the auto-migrations in db._init_db."""
    Database()

if __name__ == "__main__":
    update_schema()
