"""
Equivalent of send_message.php
POST /api/send_message -> insert one message row per receiver_id.
"""
from fastapi import APIRouter, Depends
from psycopg2.extensions import connection as PgConnection

from app.database import get_db
from app.models import SendMessageRequest

router = APIRouter()

INSERT_SQL = """
INSERT INTO messages (
    sender_id,
    receiver_id,
    subject,
    message
)
VALUES (%s, %s, %s, %s)
"""


@router.post("/send_message")
def send_message(payload: SendMessageRequest, conn: PgConnection = Depends(get_db)):
    if not payload.receiver_ids:
        return {"status": "error", "message": "Missing fields"}

    cursor = conn.cursor()
    for receiver_id in payload.receiver_ids:
        cursor.execute(
            INSERT_SQL,
            (payload.sender_id, receiver_id, payload.subject, payload.message),
        )
    conn.commit()
    cursor.close()

    return {"status": "success", "message": "Message sent successfully"}

