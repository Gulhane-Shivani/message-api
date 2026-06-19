"""
Equivalent of hide_messages.php
POST /api/hide_messages -> mark a list of inbox message ids as deleted
(hidden) for a given user. Insert-only, matching the original (no
ON DUPLICATE KEY UPDATE), so repeated calls for the same message/user
pair will insert duplicate rows just like the PHP version did.
"""
from fastapi import APIRouter, Depends
from psycopg2.extensions import connection as PgConnection

from app.database import get_db
from app.models import HideMessagesRequest

router = APIRouter()

INSERT_SQL = """
INSERT INTO message_inbox_status (message_id, user_id, is_deleted)
VALUES (%s, %s, TRUE)
"""


@router.post("/hide_messages")
def hide_messages(payload: HideMessagesRequest, conn: PgConnection = Depends(get_db)):
    cursor = conn.cursor()
    for msg_id in payload.ids:
        cursor.execute(INSERT_SQL, (msg_id, payload.user_id))
    conn.commit()
    cursor.close()

    return {"status": "success"}

