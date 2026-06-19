"""
FastAPI application entrypoint.

This replaces the standalone PHP scripts (get_inbox.php, get_sent.php,
get_thread.php, get_users.php, hide_messages.php, hide_sent.php,
login.php, mark_read.php, send_message.php, send_reply.php) with a
single FastAPI app exposing equivalent routes under /api.

Run with:
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
"""
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_pool
from app.routers import (
    auth,
    hide_messages,
    hide_sent,
    inbox,
    mark_read,
    send_message,
    send_reply,
    sent,
    thread,
    users,
)

app = FastAPI(
    title="Messages API",
    description="Python/FastAPI conversion of the original PHP messaging endpoints.",
    version="1.0.0",
)

# Equivalent of `header("Access-Control-Allow-Origin: *");` in every PHP file.
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "*")
allow_origins = ["*"] if allowed_origins_env.strip() == "*" else [
    origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_pool()


# Route mounting. Each router corresponds 1:1 to an original PHP file.
app.include_router(users.router, prefix="/api", tags=["users"])          # get_users.php
app.include_router(auth.router, prefix="/api", tags=["auth"])            # login.php
app.include_router(inbox.router, prefix="/api", tags=["inbox"])          # get_inbox.php
app.include_router(sent.router, prefix="/api", tags=["sent"])            # get_sent.php
app.include_router(thread.router, prefix="/api", tags=["thread"])        # get_thread.php
app.include_router(mark_read.router, prefix="/api", tags=["mark_read"])  # mark_read.php
app.include_router(send_message.router, prefix="/api", tags=["send"])   # send_message.php
app.include_router(send_reply.router, prefix="/api", tags=["send"])      # send_reply.php
app.include_router(hide_messages.router, prefix="/api", tags=["hide"])   # hide_messages.php
app.include_router(hide_sent.router, prefix="/api", tags=["hide"])       # hide_sent.php


@app.get("/")
def root():
    return {"status": "ok", "service": "messages-api"}
