"""
Equivalent of send_reply.php
POST /api/send_reply -> insert a reply to a message thread.
"""
from fastapi import APIRouter, Depends
from psycopg2.extensions import connection as PgConnection

from app.database import get_db
from app.models import SendReplyRequest

router = APIRouter()

INSERT_SQL = """
INSERT INTO message_replies
(
    message_id,
    sender_id,
    receiver_id,
    message
)
VALUES (%s, %s, %s, %s)
"""


@router.post("/send_reply")
def send_reply(payload: SendReplyRequest, conn: PgConnection = Depends(get_db)):
    if not (payload.message_id and payload.sender_id and payload.receiver_id and payload.message):
        return {"success": False, "message": "Missing required fields"}

    cursor = conn.cursor()
    cursor.execute(
        INSERT_SQL,
        (payload.message_id, payload.sender_id, payload.receiver_id, payload.message),
    )
    conn.commit()
    cursor.close()

    return {"success": True, "message": "Reply sent"}

