import sys, os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, SessionLocal
from sqlalchemy import text

# Add is_admin column if not exists
with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE"))
        conn.commit()
        print("Column 'is_admin' added to users table.")
    except Exception as e:
        print(f"Column may already exist (ok): {e}")

# Set alice as the sole admin, everyone else is student
db = SessionLocal()
try:
    db.execute(text("UPDATE users SET is_admin = TRUE WHERE email = 'alice@example.com'"))
    db.execute(text("UPDATE users SET is_admin = FALSE WHERE email != 'alice@example.com'"))
    db.commit()
    print("Done: alice@example.com is now admin. All other users are students.")
except Exception as e:
    print(f"Error updating roles: {e}")
    db.rollback()
finally:
    db.close()
