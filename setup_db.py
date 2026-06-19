import os
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# Load .env if python-dotenv is installed, or just read from environ
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "messege_api")
DB_PORT = os.getenv("DB_PORT", "5432")

def setup_database():
    print("Connecting to default 'postgres' database to check/create target database...")
    try:
        # Connect to default postgres database first to create target DB
        conn = psycopg2.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            port=DB_PORT,
            database="postgres"
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        # Check if database exists
        cursor.execute("SELECT 1 FROM pg_catalog.pg_database WHERE datname = %s", (DB_NAME,))
        exists = cursor.fetchone()
        
        if not exists:
            print(f"Database '{DB_NAME}' does not exist. Creating it...")
            cursor.execute(f'CREATE DATABASE "{DB_NAME}"')
            print(f"Database '{DB_NAME}' created successfully.")
        else:
            print(f"Database '{DB_NAME}' already exists.")
            
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Error checking/creating database: {e}")
        print("Continuing to schema initialization (assuming database exists or was created manually)...")

    # Connect to the target database and run schema.sql
    print(f"Connecting to '{DB_NAME}' to initialize schema and seed data...")
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            port=DB_PORT,
            database=DB_NAME
        )
        cursor = conn.cursor()
        
        # Read schema.sql
        schema_path = os.path.join(os.path.dirname(__file__), "schema.sql")
        if os.path.exists(schema_path):
            print(f"Reading schema from {schema_path}...")
            with open(schema_path, "r") as f:
                schema_sql = f.read()
            cursor.execute(schema_sql)
            conn.commit()
            print("Schema initialized successfully.")
        else:
            print("schema.sql not found in root directory!")
            
        # Seed users if not exists
        cursor.execute("SELECT COUNT(*) FROM users")
        user_count = cursor.fetchone()[0]
        if user_count == 0:
            print("Seeding users...")
            users = [
                ("Alice", "alice@example.com", "password123"),
                ("Bob", "bob@example.com", "password456"),
                ("Charlie", "charlie@example.com", "password789"),
            ]
            cursor.executemany(
                "INSERT INTO users (name, email, password) VALUES (%s, %s, %s)",
                users
            )
            conn.commit()
            print("Seeding users completed.")
        else:
            print("Users table already has data, skipping user seeding.")
            
        # Seed some messages
        cursor.execute("SELECT COUNT(*) FROM messages")
        msg_count = cursor.fetchone()[0]
        if msg_count == 0:
            print("Seeding messages...")
            # Retrieve generated IDs
            cursor.execute("SELECT id, email FROM users")
            user_ids = {email: uid for uid, email in cursor.fetchall()}
            
            alice_id = user_ids.get("alice@example.com")
            bob_id = user_ids.get("bob@example.com")
            
            if alice_id and bob_id:
                # Alice sends Bob a message
                cursor.execute(
                    "INSERT INTO messages (sender_id, receiver_id, subject, message) VALUES (%s, %s, %s, %s) RETURNING id",
                    (alice_id, bob_id, "Project Update", "Hi Bob, the PostgreSQL migration is complete!")
                )
                msg_id = cursor.fetchone()[0]
                
                # Bob replies to Alice
                cursor.execute(
                    "INSERT INTO message_replies (message_id, sender_id, receiver_id, message) VALUES (%s, %s, %s, %s)",
                    (msg_id, bob_id, alice_id, "Awesome work Alice, thank you!")
                )
                conn.commit()
                print("Seeding messages and replies completed.")
        else:
            print("Messages table already has data, skipping message seeding.")
            
        cursor.close()
        conn.close()
        print("Database setup and seeding completed successfully!")
    except Exception as e:
        print(f"Error setting up database tables/seeding: {e}")

if __name__ == "__main__":
    setup_database()
