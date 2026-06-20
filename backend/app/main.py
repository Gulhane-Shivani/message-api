import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.routers import (
    auth,
    hide_messages,
    hide_sent,
    inbox,
    mark_read,
    register,
    send_message,
    send_reply,
    sent,
    thread,
    users,
    community_chat,
)

app = FastAPI(
    title="Messages & Community API",
    description="Extended API with Community Management, Feed, WS chats, Notifications, and Search.",
    version="2.0.0",
)

# CORS configuration
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "*")
allow_origins = ["*"] if allowed_origins_env.strip() == "*" else [
    origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Static directory to serve uploads (images/videos)
# Make sure "static" directory exists inside the backend root folder
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
static_dir = os.path.join(backend_dir, "static")
os.makedirs(static_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Mount new Community & Messaging Module Router
app.include_router(community_chat.router, prefix="/api", tags=["community_chat"])

# Mount old legacy routers (optional, modified to support SQLAlchemy if needed)
app.include_router(users.router,    prefix="/api", tags=["users"])
app.include_router(register.router, prefix="/api", tags=["auth"])
app.include_router(auth.router,     prefix="/api", tags=["auth"])
app.include_router(inbox.router,    prefix="/api", tags=["inbox"])
app.include_router(sent.router,     prefix="/api", tags=["sent"])
app.include_router(thread.router,   prefix="/api", tags=["thread"])
app.include_router(mark_read.router, prefix="/api", tags=["mark_read"])
app.include_router(send_message.router, prefix="/api", tags=["send"])
app.include_router(send_reply.router,   prefix="/api", tags=["send"])
app.include_router(hide_messages.router, prefix="/api", tags=["hide"])
app.include_router(hide_sent.router,     prefix="/api", tags=["hide"])

@app.get("/")
def root():
    return {"status": "ok", "service": "community-messaging-api"}
