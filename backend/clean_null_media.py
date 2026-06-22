"""
One-off migration to clean up any legacy media URLs stored as "null", "undefined", or empty string.
"""
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import engine
from sqlalchemy import text

def run_migration():
    print("Starting clean_null_media migration...")
    with engine.connect() as conn:
        # Update community_posts
        res1 = conn.execute(text(
            "UPDATE community_posts SET image_url = NULL WHERE image_url = 'null' OR image_url = 'undefined' OR image_url = '';"
        ))
        res2 = conn.execute(text(
            "UPDATE community_posts SET video_url = NULL WHERE video_url = 'null' OR video_url = 'undefined' OR video_url = '';"
        ))
        
        # Update messages
        res3 = conn.execute(text(
            "UPDATE messages SET file_url = NULL WHERE file_url = 'null' OR file_url = 'undefined' OR file_url = '';"
        ))
        
        conn.commit()
        print(f"Migration complete!")
        print(f"Updated community_posts image_url rows: {res1.rowcount}")
        print(f"Updated community_posts video_url rows: {res2.rowcount}")
        print(f"Updated messages file_url rows: {res3.rowcount}")

if __name__ == "__main__":
    run_migration()
