"""
POST /api/register -> create a new user account (name, email, password)
"""
from fastapi import APIRouter, Depends, HTTPException
from psycopg2.extensions import connection as PgConnection
from psycopg2.extras import RealDictCursor
from pydantic import BaseModel

from app.database import get_db

router = APIRouter()


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str


@router.post("/register")
def register(payload: RegisterRequest, conn: PgConnection = Depends(get_db)):
    if not payload.name.strip() or not payload.email.strip() or not payload.password.strip():
        return {"status": False, "message": "All fields are required."}

    cursor = conn.cursor(cursor_factory=RealDictCursor)

    # Check if email already exists
    cursor.execute("SELECT id FROM users WHERE email = %s", (payload.email.strip(),))
    existing = cursor.fetchone()
    if existing:
        cursor.close()
        return {"status": False, "message": "Email is already registered."}

    # Insert new user
    cursor.execute(
        "INSERT INTO users (name, email, password) VALUES (%s, %s, %s) RETURNING id, name, email",
        (payload.name.strip(), payload.email.strip(), payload.password),
    )
    new_user = cursor.fetchone()
    conn.commit()
    cursor.close()

    return {"status": True, "user": dict(new_user)}
