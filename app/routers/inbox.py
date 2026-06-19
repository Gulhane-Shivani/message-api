"""
Equivalent of get_inbox.php
GET /api/inbox?user_id=... -> inbox messages for a user, with reply counts,
excluding messages the user has hidden.
"""
from fastapi import APIRouter, Depends, Query
from psycopg2.extensions import connection as PgConnection
from psycopg2.extras import RealDictCursor

from app.database import get_db

router = APIRouter()

INBOX_SQL = """
SELECT
    m.id,
    m.sender_id,
    m.receiver_id,
    m.subject,
    m.message,
    m.created_at,
    m.is_read,
    u.name AS sender_name,
    u.email AS sender_email,
    COUNT(r.id) AS reply_count
FROM messages m
JOIN users u
    ON m.sender_id = u.id
LEFT JOIN message_replies r
    ON r.message_id = m.id
LEFT JOIN message_inbox_status s
    ON s.message_id = m.id
    AND s.user_id = %s
WHERE m.receiver_id = %s
AND (s.is_deleted IS NULL OR s.is_deleted = FALSE)
GROUP BY
    m.id,
    m.sender_id,
    m.receiver_id,
    m.subject,
    m.message,
    m.created_at,
    m.is_read,
    u.name,
    u.email
ORDER BY m.created_at DESC
"""


@router.get("/inbox")
def get_inbox(user_id: int = Query(...), conn: PgConnection = Depends(get_db)):
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    cursor.execute(INBOX_SQL, (user_id, user_id))
    data = cursor.fetchall()
    cursor.close()
    return [dict(row) for row in data]

