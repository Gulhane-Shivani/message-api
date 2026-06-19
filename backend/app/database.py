"""
Database connection handling for PostgreSQL.

Using psycopg2 connection pool, yielding connections to the FastAPI
dependency.
"""
import os
from contextlib import contextmanager
from typing import Optional

import psycopg2
from psycopg2 import pool
from fastapi import HTTPException

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "messege_api")
DB_PORT = int(os.getenv("DB_PORT", "5432"))


_pool: Optional[pool.ThreadedConnectionPool] = None


def init_pool() -> None:
    """Initialize the connection pool. Called once on app startup."""
    global _pool
    try:
        _pool = pool.ThreadedConnectionPool(
            minconn=1,
            maxconn=15,
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME,
            port=DB_PORT,
        )
    except psycopg2.Error as err:
        raise RuntimeError(f"DB Connection Failed: {err}") from err


@contextmanager
def get_connection():
    """
    Context manager that yields a connection from the pool and always
    returns it afterwards.
    """
    if _pool is None:
        raise HTTPException(status_code=500, detail="DB Connection Failed")
    conn = None
    try:
        conn = _pool.getconn()
        yield conn
    except psycopg2.Error as err:
        raise HTTPException(status_code=500, detail=f"Database error: {err}")
    finally:
        if conn is not None:
            _pool.putconn(conn)


def get_db():
    """FastAPI dependency that yields a live connection for a single request."""
    with get_connection() as conn:
        yield conn
