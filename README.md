# Messages API (FastAPI)

Python/FastAPI conversion of the original PHP messaging endpoints.

## Setup

```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# edit .env with your real DB credentials
```

Load environment variables before running (or use a tool like
`python-dotenv` / `direnv` / your process manager). Quick manual way:

```bash
export $(grep -v '^#' .env | xargs)   # macOS/Linux
```

## Run

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Interactive API docs: http://localhost:8000/docs

## Database

`schema.sql` contains a reference schema inferred from the original
PHP queries (`users`, `messages`, `message_replies`,
`message_inbox_status`). If you already have the real `messages_db`
database, you can ignore this and just point `.env` at it.

## Endpoint mapping (old PHP -> new FastAPI)

| Original file        | Method | New route          |
|-----------------------|--------|---------------------|
| get_users.php         | GET    | /api/users          |
| login.php             | POST   | /api/login           |
| get_inbox.php         | GET    | /api/inbox?user_id=  |
| get_sent.php          | GET    | /api/sent?user_id=   |
| get_thread.php        | GET    | /api/thread?id=      |
| mark_read.php         | POST   | /api/mark_read       |
| send_message.php      | POST   | /api/send_message    |
| send_reply.php        | POST   | /api/send_reply      |
| hide_messages.php     | POST   | /api/hide_messages   |
| hide_sent.php         | POST   | /api/hide_sent       |

All POST endpoints now expect a JSON body (`Content-Type: application/json`)
with the same field names as the original PHP `$data` arrays
(`sender_id`, `receiver_ids`, `subject`, `message`, etc.) — except
`mark_read`, which originally read `message_id` from `$_POST` form data
and now also expects JSON: `{"message_id": 123}`.

## Notes on behavior preserved / changed from the PHP version

- **CORS**: `Access-Control-Allow-Origin: *` is replicated via
  `CORSMiddleware`, configurable through `ALLOWED_ORIGINS` in `.env`.
- **SQL injection fixes**: `login.php` and `get_sent.php` built SQL
  with raw string interpolation. Both are now parameterized
  (no behavior change, just safer).
- **Plaintext password comparison** in `/api/login` is preserved as-is
  to match the existing `users` table. Swap in real password hashing
  (e.g. `passlib`) if you control the schema and can migrate it.
- **hide_messages**: insert-only, same as the original (no
  `ON DUPLICATE KEY UPDATE`), so repeated hides for the same message
  create duplicate rows, matching prior behavior.
- **hide_sent**: upsert (`ON DUPLICATE KEY UPDATE`), same as original.
- Connection handling: the PHP `db.php` opened one connection per
  request; here a connection pool (`mysql-connector-python`) is used
  and a connection is checked out/returned per request via FastAPI's
  dependency injection (`Depends(get_db)`).
