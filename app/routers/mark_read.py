"""
Equivalent of mark_read.php
POST /api/mark_read -> mark a message as read.

The original PHP read message_id from $_POST (form-encoded). This
version accepts JSON for consistency with the rest of the API.
"""
from fastapi import APIRouter, Depends
from psycopg2.extensions import connection as PgConnection

from app.database import get_db
from app.models import MarkReadRequest

router = APIRouter()


@router.post("/mark_read")
def mark_read(payload: MarkReadRequest, conn: PgConnection = Depends(get_db)):
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE messages SET is_read = TRUE WHERE id = %s",
        (payload.message_id,),
    )
    conn.commit()
    cursor.close()
    return {"success": True}

