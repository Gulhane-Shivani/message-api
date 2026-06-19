"""
Equivalent of login.php
POST /api/login -> authenticate by email + password

NOTE: The original PHP compared plaintext passwords directly in SQL
(string-interpolated, which was also vulnerable to SQL injection).
Here the query is parameterized to remove the injection risk, but the
plaintext comparison itself is preserved so behavior matches the
existing `users` table (which presumably stores plaintext passwords).
If you control the schema, switch to hashed passwords
(e.g. passlib/bcrypt) and update this comparison accordingly.
"""
from fastapi import APIRouter, Depends
from psycopg2.extensions import connection as PgConnection
from psycopg2.extras import RealDictCursor

from app.database import get_db
from app.models import LoginRequest

router = APIRouter()


@router.post("/login")
def login(payload: LoginRequest, conn: PgConnection = Depends(get_db)):
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    cursor.execute(
        "SELECT * FROM users WHERE email = %s AND password = %s",
        (payload.email, payload.password),
    )
    user = cursor.fetchone()
    cursor.close()

    if user:
        return {"status": True, "user": dict(user)}

    return {"status": False, "message": "Invalid Login"}

