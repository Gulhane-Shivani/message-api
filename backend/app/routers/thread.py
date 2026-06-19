"""
Equivalent of get_thread.php
GET /api/thread?id=... -> a message plus its replies, ordered by created_at.
"""
from fastapi import APIRouter, Depends, Query
from psycopg2.extensions import connection as PgConnection
from psycopg2.extras import RealDictCursor

from app.database import get_db

router = APIRouter()

MESSAGE_SQL = """
SELECT m.id, m.sender_id, m.receiver_id, m.subject, m.message, m.created_at, u.name AS sender_name
FROM messages m
JOIN users u ON m.sender_id = u.id
WHERE m.id = %s
"""

REPLIES_SQL = """
SELECT r.id, r.message, r.created_at, u.name AS sender_name
FROM message_replies r
JOIN users u ON r.sender_id = u.id
WHERE r.message_id = %s
ORDER BY r.created_at ASC
"""


@router.get("/thread")
def get_thread(id: int = Query(...), conn: PgConnection = Depends(get_db)):
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    cursor.execute(MESSAGE_SQL, (id,))
    message = cursor.fetchone()

    cursor.execute(REPLIES_SQL, (id,))
    replies = cursor.fetchall()

    cursor.close()

    return {
        "message": dict(message) if message else None,
        "replies": [dict(row) for row in replies]
    }

