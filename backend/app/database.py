import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import psycopg2

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "root")
DB_NAME = os.getenv("DB_NAME", "messege_api")
DB_PORT = os.getenv("DB_PORT", "5432")

DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db_session():
    """FastAPI dependency that yields a SQLAlchemy session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_db():
    """FastAPI dependency that yields a legacy psycopg2 connection."""
    conn = psycopg2.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        port=DB_PORT
    )
    try:
        yield conn
    finally:
        conn.close()
