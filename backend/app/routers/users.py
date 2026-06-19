"""
Equivalent of get_users.php
GET /api/users -> list all users (id, name, email)
"""
from fastapi import APIRouter, Depends
from psycopg2.extensions import connection as PgConnection
from psycopg2.extras import RealDictCursor

from app.database import get_db

router = APIRouter()


@router.get("/users")
def get_users(conn: PgConnection = Depends(get_db)):
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    cursor.execute("SELECT id, name, email FROM users ORDER BY name ASC")
    users = cursor.fetchall()
    cursor.close()
    return [dict(u) for u in users]

