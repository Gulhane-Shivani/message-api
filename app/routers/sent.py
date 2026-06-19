"""
Equivalent of get_sent.php
GET /api/sent?user_id=... -> sent messages for a user, excluding ones the
user has hidden from their "sent" view.

NOTE: The original PHP built this query with raw string interpolation
($user_id directly inside the SQL string), which was a SQL injection
risk (even though user_id was cast with intval() first, the pattern is
unsafe in general). It's been parameterized here.
"""
from fastapi import APIRouter, Depends, Query
from psycopg2.extensions import connection as PgConnection
from psycopg2.extras import RealDictCursor

from app.database import get_db

router = APIRouter()

SENT_SQL = """
SELECT
    m.id,
    m.sender_id,
    m.receiver_id,
    m.subject,
    m.message,
    m.created_at,
    u.name AS receiver_name,
    u.email AS receiver_email
FROM messages m
LEFT JOIN users u ON u.id = m.receiver_id
LEFT JOIN message_inbox_status s
    ON s.message_id = m.id
    AND s.user_id = %s
    AND s.type = 'sent'
WHERE m.sender_id = %s
AND (s.is_deleted IS NULL OR s.is_deleted = FALSE)
ORDER BY m.created_at DESC
"""


@router.get("/sent")
def get_sent(user_id: int = Query(...), conn: PgConnection = Depends(get_db)):
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    cursor.execute(SENT_SQL, (user_id, user_id))
    data = cursor.fetchall()
    cursor.close()
    return [dict(row) for row in data]

