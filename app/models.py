"""
Pydantic models for request bodies and responses.
"""
from typing import List, Optional
from pydantic import BaseModel


# ---------- login.php ----------
class LoginRequest(BaseModel):
    email: str = ""
    password: str = ""


# ---------- send_message.php ----------
class SendMessageRequest(BaseModel):
    sender_id: int
    receiver_ids: List[int]
    subject: str
    message: str


# ---------- send_reply.php ----------
class SendReplyRequest(BaseModel):
    message_id: int
    sender_id: int
    receiver_id: int
    message: str


# ---------- mark_read.php ----------
class MarkReadRequest(BaseModel):
    message_id: int


# ---------- hide_messages.php / hide_sent.php ----------
class HideMessagesRequest(BaseModel):
    ids: List[int] = []
    user_id: int


class HideSentRequest(BaseModel):
    ids: List[int] = []
    user_id: int
