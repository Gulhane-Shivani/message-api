"""
One-off migration: adds community_type column to the communities table.
Safe to run multiple times (uses IF NOT EXISTS).
"""
import sys, os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    conn.execute(text(
        "ALTER TABLE communities ADD COLUMN IF NOT EXISTS community_type VARCHAR(50) NOT NULL DEFAULT 'public'"
    ))
    conn.commit()
    print("Migration complete: community_type column added (or already existed).")
