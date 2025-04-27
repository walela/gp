#!/usr/bin/env python3
"""
Script to update the database schema with new indexes and ensure data integrity.
This should be run after updating the codebase with the performance optimizations.
"""
import sqlite3
import logging
import os
from db import Database

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def main():
    """Main function to update the database."""
    logger.info("Starting database update...")
    
    # Check if database file exists
    db_file = 'gp_tracker.db'
    if not os.path.exists(db_file):
        logger.warning(f"Database file {db_file} not found. Creating a new one.")
    
    # Initialize database with new schema (including indexes)
    db = Database(db_file)
    logger.info("Database schema updated with new indexes.")
    
    # Verify indexes were created
    with sqlite3.connect(db_file) as conn:
        c = conn.cursor()
        c.execute("SELECT name FROM sqlite_master WHERE type='index'")
        indexes = [row[0] for row in c.fetchall()]
        
        logger.info(f"Found {len(indexes)} indexes in the database:")
        for idx in indexes:
            logger.info(f"  - {idx}")
        
        # Check for any data integrity issues
        logger.info("Checking data integrity...")
        c.execute("PRAGMA integrity_check")
        integrity_result = c.fetchone()[0]
        if integrity_result == 'ok':
            logger.info("Database integrity check passed.")
        else:
            logger.error(f"Database integrity check failed: {integrity_result}")
    
    logger.info("Database update completed successfully.")

if __name__ == "__main__":
    main()
