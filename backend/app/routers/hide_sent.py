"""
Equivalent of hide_sent.php
POST /api/hide_sent -> mark a list of sent message ids as deleted (hidden)
for a given user, using upsert semantics (ON DUPLICATE KEY UPDATE),
matching the original.
"""
from fastapi import APIRouter, Depends
from psycopg2.extensions import connection as PgConnection

from app.database import get_db
from app.models import HideSentRequest

router = APIRouter()

UPSERT_SQL = """
INSERT INTO message_inbox_status (message_id, user_id, type, is_deleted)
VALUES (%s, %s, 'sent', TRUE)
ON CONFLICT (message_id, user_id, type)
DO UPDATE SET is_deleted = TRUE
"""


@router.post("/hide_sent")
def hide_sent(payload: HideSentRequest, conn: PgConnection = Depends(get_db)):
    cursor = conn.cursor()
    for msg_id in payload.ids:
        cursor.execute(UPSERT_SQL, (msg_id, payload.user_id))
    conn.commit()
    cursor.close()

    return {"status": "success"}

