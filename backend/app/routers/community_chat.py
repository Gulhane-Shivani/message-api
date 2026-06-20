import os
import shutil
import uuid
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, UploadFile, File, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_, func

from app.database import get_db_session as get_db
from app.db_models import (
    User, Community, CommunityMember, CommunityPost, PostLike, PostComment,
    Conversation, ConversationMember, Message, MessageReaction, Notification
)
from app.auth_utils import get_current_user

router = APIRouter()

# --- WS CONNECTION MANAGER ---
class ConnectionManager:
    def __init__(self):
        # Maps user_id -> list of active websockets
        self.active_connections = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, user_id: int, websocket: WebSocket):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_personal_message(self, message: dict, user_id: int):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    pass

    async def broadcast_to_conversation(self, message: dict, member_ids: List[int]):
        for user_id in member_ids:
            await self.send_personal_message(message, user_id)

manager = ConnectionManager()

# --- WEBSOCKET ENDPOINT ---
@router.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int, db: Session = Depends(get_db)):
    await manager.connect(user_id, websocket)
    
    # Set user online status
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        user.online_status = True
        db.commit()
        # Broadcast status update
        await manager.broadcast_to_conversation(
            {"type": "online_status", "user_id": user_id, "status": True},
            [u.id for u in db.query(User).filter(User.id != user_id).all()]
        )
    
    try:
        while True:
            # We receive message payloads
            data = await websocket.receive_json()
            event_type = data.get("type")
            
            if event_type == "typing":
                conv_id = data.get("conversation_id")
                is_typing = data.get("is_typing", False)
                # Find members of the conversation to broadcast typing status
                members = db.query(ConversationMember.user_id).filter(
                    ConversationMember.conversation_id == conv_id
                ).all()
                member_ids = [m[0] for m in members if m[0] != user_id]
                await manager.broadcast_to_conversation({
                    "type": "typing",
                    "conversation_id": conv_id,
                    "user_id": user_id,
                    "is_typing": is_typing
                }, member_ids)

            elif event_type == "read_receipt":
                conv_id = data.get("conversation_id")
                message_id = data.get("message_id")
                
                # Mark message as read in DB
                msg = db.query(Message).filter(Message.id == message_id).first()
                if msg:
                    msg.is_read = True
                    db.commit()
                    
                    # Notify conversation members
                    members = db.query(ConversationMember.user_id).filter(
                        ConversationMember.conversation_id == conv_id
                    ).all()
                    member_ids = [m[0] for m in members if m[0] != user_id]
                    await manager.broadcast_to_conversation({
                        "type": "read_receipt",
                        "conversation_id": conv_id,
                        "message_id": message_id,
                        "user_id": user_id
                    }, member_ids)

    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)
        # Update user status
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user.online_status = False
            user.last_seen = datetime.datetime.utcnow()
            db.commit()
            # Broadcast status update
            await manager.broadcast_to_conversation(
                {"type": "online_status", "user_id": user_id, "status": False},
                [u.id for u in db.query(User).filter(User.id != user_id).all()]
            )

# --- USER PROFILE & USERS ---
@router.get("/users/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "avatar_url": current_user.avatar_url,
        "online_status": current_user.online_status
    }

@router.get("/users")
def list_users(search: Optional[str] = "", current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(User).filter(User.id != current_user.id)
    if search:
        query = query.filter(or_(User.name.ilike(f"%{search}%"), User.email.ilike(f"%{search}%")))
    users = query.all()
    return [{
        "id": u.id,
        "name": u.name,
        "email": u.email,
        "avatar_url": u.avatar_url,
        "online_status": u.online_status,
        "last_seen": u.last_seen
    } for u in users]

# --- FILE UPLOAD ---
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "static", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
def upload_file(file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{ext}"
    dest_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    url = f"http://127.0.0.1:8000/static/uploads/{unique_filename}"
    
    # Determine type
    file_type = "image"
    if ext.lower() in [".mp4", ".mov", ".avi", ".webm"]:
        file_type = "video"
        
    return {"url": url, "type": file_type, "filename": file.filename}

# --- COMMUNITY MANAGEMENT ---
@router.get("/communities")
def list_communities(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    communities = db.query(Community).all()
    result = []
    for c in communities:
        # Check membership
        member = db.query(CommunityMember).filter(
            CommunityMember.community_id == c.id,
            CommunityMember.user_id == current_user.id
        ).first()
        
        member_count = db.query(CommunityMember).filter(CommunityMember.community_id == c.id).count()
        
        result.append({
            "id": c.id,
            "name": c.name,
            "description": c.description,
            "image_url": c.image_url,
            "creator_id": c.creator_id,
            "member_count": member_count,
            "is_member": member is not None,
            "role": member.role if member else None,
            "created_at": c.created_at
        })
    return result

@router.post("/communities")
def create_community(name: str = Query(...), description: Optional[str] = Query(""), image_url: Optional[str] = Query(""), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Check if name unique
    existing = db.query(Community).filter(Community.name == name.strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Community name already taken.")
        
    c = Community(
        name=name.strip(),
        description=description,
        image_url=image_url or "https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=300",
        creator_id=current_user.id
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    
    # Add creator as admin
    cm = CommunityMember(community_id=c.id, user_id=current_user.id, role="admin")
    db.add(cm)
    
    # Also automatically create a Community Group Chat Conversation for this community!
    conv = Conversation(name=f"{c.name} Lounge", type="group", community_id=c.id)
    db.add(conv)
    db.commit()
    db.refresh(conv)
    
    # Add creator to this group conversation
    db.add(ConversationMember(conversation_id=conv.id, user_id=current_user.id))
    db.commit()
    
    return c

@router.put("/communities/{community_id}")
def edit_community(community_id: int, name: str = Query(...), description: Optional[str] = Query(""), image_url: Optional[str] = Query(""), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = db.query(Community).filter(Community.id == community_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Community not found.")
    
    # Check if admin
    cm = db.query(CommunityMember).filter(
        CommunityMember.community_id == community_id,
        CommunityMember.user_id == current_user.id
    ).first()
    
    if not cm or cm.role != "admin":
        raise HTTPException(status_code=403, detail="Only community admin can edit.")
        
    c.name = name.strip()
    c.description = description
    if image_url:
        c.image_url = image_url
    db.commit()
    return c

@router.delete("/communities/{community_id}")
def delete_community(community_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = db.query(Community).filter(Community.id == community_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Community not found.")
        
    if c.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only community creator can delete.")
        
    db.delete(c)
    db.commit()
    return {"status": True, "message": "Community deleted successfully"}

@router.post("/communities/{community_id}/join")
def join_community(community_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = db.query(Community).filter(Community.id == community_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Community not found.")
        
    # Check existing member
    cm = db.query(CommunityMember).filter(
        CommunityMember.community_id == community_id,
        CommunityMember.user_id == current_user.id
    ).first()
    if cm:
        return {"status": True, "message": "Already a member"}
        
    member = CommunityMember(community_id=community_id, user_id=current_user.id, role="member")
    db.add(member)
    
    # Automatically add to the community group conversation
    conv = db.query(Conversation).filter(
        Conversation.community_id == community_id,
        Conversation.type == "group"
    ).first()
    if conv:
        # Check if already conversation member
        cv_m = db.query(ConversationMember).filter(
            ConversationMember.conversation_id == conv.id,
            ConversationMember.user_id == current_user.id
        ).first()
        if not cv_m:
            db.add(ConversationMember(conversation_id=conv.id, user_id=current_user.id))
            
    db.commit()
    return {"status": True, "message": "Joined community"}

@router.post("/communities/{community_id}/leave")
def leave_community(community_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    cm = db.query(CommunityMember).filter(
        CommunityMember.community_id == community_id,
        CommunityMember.user_id == current_user.id
    ).first()
    if not cm:
        raise HTTPException(status_code=400, detail="You are not a member of this community.")
        
    db.delete(cm)
    
    # Remove from conversation
    conv = db.query(Conversation).filter(
        Conversation.community_id == community_id,
        Conversation.type == "group"
    ).first()
    if conv:
        cv_m = db.query(ConversationMember).filter(
            ConversationMember.conversation_id == conv.id,
            ConversationMember.user_id == current_user.id
        ).first()
        if cv_m:
            db.delete(cv_m)
            
    db.commit()
    return {"status": True, "message": "Left community"}

@router.get("/communities/{community_id}/members")
def list_community_members(community_id: int, db: Session = Depends(get_db)):
    members = db.query(CommunityMember).filter(CommunityMember.community_id == community_id).all()
    result = []
    for m in members:
        user = db.query(User).filter(User.id == m.user_id).first()
        if user:
            result.append({
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "avatar_url": user.avatar_url,
                "role": m.role,
                "joined_at": m.joined_at
            })
    return result

# --- COMMUNITY FEED (POSTS) ---
@router.get("/communities/{community_id}/posts")
def list_community_posts(community_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    posts = db.query(CommunityPost).filter(
        CommunityPost.community_id == community_id
    ).order_by(CommunityPost.created_at.desc()).all()
    
    result = []
    for p in posts:
        # Check like status
        like = db.query(PostLike).filter(
            PostLike.post_id == p.id,
            PostLike.user_id == current_user.id
        ).first()
        
        like_count = db.query(PostLike).filter(PostLike.post_id == p.id).count()
        comment_count = db.query(PostComment).filter(PostComment.post_id == p.id).count()
        
        author = db.query(User).filter(User.id == p.user_id).first()
        
        result.append({
            "id": p.id,
            "community_id": p.community_id,
            "content": p.content,
            "image_url": p.image_url,
            "video_url": p.video_url,
            "created_at": p.created_at,
            "like_count": like_count,
            "comment_count": comment_count,
            "is_liked": like is not None,
            "author": {
                "id": author.id,
                "name": author.name,
                "avatar_url": author.avatar_url
            } if author else None
        })
    return result

@router.post("/communities/{community_id}/posts")
def create_post(
    community_id: int,
    content: str = Query(...),
    image_url: Optional[str] = Query(None),
    video_url: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify membership
    cm = db.query(CommunityMember).filter(
        CommunityMember.community_id == community_id,
        CommunityMember.user_id == current_user.id
    ).first()
    if not cm:
        raise HTTPException(status_code=403, detail="You must be a member of the community to post.")
        
    post = CommunityPost(
        community_id=community_id,
        user_id=current_user.id,
        content=content,
        image_url=image_url,
        video_url=video_url
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    
    # Create notification for mentions (simplified parser)
    if "@" in content:
        words = content.split()
        for word in words:
            if word.startswith("@"):
                username = word[1:].strip(".,!?:")
                mentioned_user = db.query(User).filter(User.name.ilike(username)).first()
                if mentioned_user and mentioned_user.id != current_user.id:
                    # Notify
                    notif = Notification(
                        user_id=mentioned_user.id,
                        type="mention",
                        reference_id=post.id
                    )
                    db.add(notif)
                    db.commit()
                    
                    # Realtime notify via websocket if online
                    manager_payload = {
                        "type": "notification",
                        "notification": {
                            "type": "mention",
                            "message": f"{current_user.name} mentioned you in a post in {db.query(Community.name).filter(Community.id == community_id).scalar()}"
                        }
                    }
                    import asyncio
                    asyncio.run_coroutine_threadsafe(
                        manager.send_personal_message(manager_payload, mentioned_user.id),
                        asyncio.get_event_loop()
                    )
                    
    # Create Notification for all members about new post
    members = db.query(CommunityMember.user_id).filter(
        CommunityMember.community_id == community_id,
        CommunityMember.user_id != current_user.id
    ).all()
    comm_name = db.query(Community.name).filter(Community.id == community_id).scalar()
    
    for m in members:
        notif = Notification(user_id=m[0], type="new_post", reference_id=post.id)
        db.add(notif)
    db.commit()
    
    return post

@router.post("/posts/{post_id}/like")
def toggle_like_post(post_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    like = db.query(PostLike).filter(
        PostLike.post_id == post_id,
        PostLike.user_id == current_user.id
    ).first()
    
    if like:
        db.delete(like)
        liked = False
    else:
        like = PostLike(post_id=post_id, user_id=current_user.id)
        db.add(like)
        liked = True
        
        # Notify post creator
        post = db.query(CommunityPost).filter(CommunityPost.id == post_id).first()
        if post and post.user_id != current_user.id:
            notif = Notification(user_id=post.user_id, type="new_post", reference_id=post.id)
            db.add(notif)
            
    db.commit()
    
    # Get total count
    count = db.query(PostLike).filter(PostLike.post_id == post_id).count()
    return {"is_liked": liked, "like_count": count}

# --- COMMENTS ---
@router.get("/posts/{post_id}/comments")
def list_post_comments(post_id: int, db: Session = Depends(get_db)):
    comments = db.query(PostComment).filter(
        PostComment.post_id == post_id,
        PostComment.parent_id == None
    ).order_by(PostComment.created_at.asc()).all()
    
    result = []
    for c in comments:
        author = db.query(User).filter(User.id == c.user_id).first()
        
        # Get replies
        replies = db.query(PostComment).filter(
            PostComment.parent_id == c.id
        ).order_by(PostComment.created_at.asc()).all()
        
        replies_result = []
        for r in replies:
            r_author = db.query(User).filter(User.id == r.user_id).first()
            replies_result.append({
                "id": r.id,
                "content": r.content,
                "created_at": r.created_at,
                "author": {
                    "id": r_author.id,
                    "name": r_author.name,
                    "avatar_url": r_author.avatar_url
                } if r_author else None
            })
            
        result.append({
            "id": c.id,
            "content": c.content,
            "created_at": c.created_at,
            "author": {
                "id": author.id,
                "name": author.name,
                "avatar_url": author.avatar_url
            } if author else None,
            "replies": replies_result
        })
    return result

@router.post("/posts/{post_id}/comments")
def create_comment(
    post_id: int,
    content: str = Query(...),
    parent_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    comment = PostComment(
        post_id=post_id,
        user_id=current_user.id,
        content=content,
        parent_id=parent_id
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    
    # Notify post creator
    post = db.query(CommunityPost).filter(CommunityPost.id == post_id).first()
    if post and post.user_id != current_user.id:
        notif = Notification(user_id=post.user_id, type="new_comment", reference_id=post_id)
        db.add(notif)
        
    db.commit()
    return comment

# --- CHAT & CONVERSATIONS ---
@router.get("/conversations")
def list_conversations(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Find all conversations current user is part of
    conv_memberships = db.query(ConversationMember).filter(
        ConversationMember.user_id == current_user.id
    ).all()
    
    conv_ids = [m.conversation_id for m in conv_memberships]
    
    conversations = db.query(Conversation).filter(
        Conversation.id.in_(conv_ids)
    ).all()
    
    result = []
    for c in conversations:
        # Get last message
        last_msg = db.query(Message).filter(
            Message.conversation_id == c.id
        ).order_by(Message.created_at.desc()).first()
        
        # Get members
        m_ids = db.query(ConversationMember.user_id).filter(
            ConversationMember.conversation_id == c.id
        ).all()
        m_ids = [m[0] for m in m_ids]
        
        # Determine name & avatar for 1-to-1
        conv_name = c.name
        conv_avatar = None
        unread_count = db.query(Message).filter(
            Message.conversation_id == c.id,
            Message.sender_id != current_user.id,
            Message.is_read == False
        ).count()
        
        if c.type == "one_to_one":
            other_user_id = next((uid for uid in m_ids if uid != current_user.id), None)
            if other_user_id:
                other_user = db.query(User).filter(User.id == other_user_id).first()
                if other_user:
                    conv_name = other_user.name
                    conv_avatar = other_user.avatar_url
            else:
                conv_name = "Self Note"
        elif c.type == "group" and c.community_id:
            # Community group chat
            comm = db.query(Community).filter(Community.id == c.community_id).first()
            if comm:
                conv_name = f"{comm.name} Feed Chat"
                conv_avatar = comm.image_url
        
        result.append({
            "id": c.id,
            "name": conv_name or "Group Chat",
            "avatar_url": conv_avatar or "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150",
            "type": c.type,
            "community_id": c.community_id,
            "created_at": c.created_at,
            "unread_count": unread_count,
            "last_message": {
                "content": last_msg.content,
                "sender_id": last_msg.sender_id,
                "created_at": last_msg.created_at,
                "message_type": last_msg.message_type
            } if last_msg else None
        })
        
    return sorted(result, key=lambda x: (x["last_message"]["created_at"] if x["last_message"] else x["created_at"]), reverse=True)

@router.post("/conversations")
def get_or_create_conversation(
    type: str = Query(...), # 'one_to_one', 'group', 'batch', 'project'
    other_user_id: Optional[int] = Query(None), # For one-to-one
    name: Optional[str] = Query(None), # For groups
    community_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if type == "one_to_one":
        if not other_user_id:
            raise HTTPException(status_code=400, detail="other_user_id required for 1-to-1 conversation.")
            
        # Check if conversation already exists between these two
        # Find conversations current_user belongs to
        c1 = db.query(ConversationMember.conversation_id).filter(ConversationMember.user_id == current_user.id).all()
        c1_ids = [c[0] for c in c1]
        
        # Find which of those other_user also belongs to (and is type one_to_one)
        existing = db.query(Conversation).join(ConversationMember).filter(
            Conversation.id.in_(c1_ids),
            Conversation.type == "one_to_one",
            ConversationMember.user_id == other_user_id
        ).first()
        
        if existing:
            return existing
            
        # Create new one_to_one
        conv = Conversation(type="one_to_one")
        db.add(conv)
        db.commit()
        db.refresh(conv)
        
        db.add(ConversationMember(conversation_id=conv.id, user_id=current_user.id))
        db.add(ConversationMember(conversation_id=conv.id, user_id=other_user_id))
        db.commit()
        return conv
    else:
        # Group, batch, project chat creation
        conv = Conversation(type=type, name=name, community_id=community_id)
        db.add(conv)
        db.commit()
        db.refresh(conv)
        
        # Add creator
        db.add(ConversationMember(conversation_id=conv.id, user_id=current_user.id))
        
        # If community group chat, add all existing community members
        if community_id:
            members = db.query(CommunityMember.user_id).filter(CommunityMember.community_id == community_id).all()
            for m in members:
                if m[0] != current_user.id:
                    db.add(ConversationMember(conversation_id=conv.id, user_id=m[0]))
        db.commit()
        return conv

@router.get("/conversations/{conversation_id}/messages")
def get_messages(conversation_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Verify access
    member = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == conversation_id,
        ConversationMember.user_id == current_user.id
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="Access denied to conversation.")
        
    messages = db.query(Message).filter(
        Message.conversation_id == conversation_id
    ).order_by(Message.created_at.asc()).all()
    
    result = []
    for m in messages:
        sender = db.query(User).filter(User.id == m.sender_id).first()
        reactions = db.query(MessageReaction).filter(MessageReaction.message_id == m.id).all()
        
        result.append({
            "id": m.id,
            "sender_id": m.sender_id,
            "sender_name": sender.name if sender else "Unknown",
            "sender_avatar": sender.avatar_url if sender else None,
            "content": m.content,
            "message_type": m.message_type,
            "file_url": m.file_url,
            "is_read": m.is_read,
            "is_pinned": m.is_pinned,
            "created_at": m.created_at,
            "reactions": [{
                "id": r.id,
                "user_id": r.user_id,
                "reaction_type": r.reaction_type
            } for r in reactions]
        })
    return result

@router.post("/conversations/{conversation_id}/messages")
def send_message(
    conversation_id: int,
    content: str = Query(...),
    message_type: str = Query("text"), # text, image, video
    file_url: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify access
    member = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == conversation_id,
        ConversationMember.user_id == current_user.id
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="Access denied.")
        
    msg = Message(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        content=content,
        message_type=message_type,
        file_url=file_url
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    
    # Find all members to broadcast / notify
    members = db.query(ConversationMember.user_id).filter(
        ConversationMember.conversation_id == conversation_id
    ).all()
    member_ids = [m[0] for m in members]
    
    # Broadcast message through Websockets
    import asyncio
    ws_payload = {
        "type": "new_message",
        "conversation_id": conversation_id,
        "message": {
            "id": msg.id,
            "sender_id": msg.sender_id,
            "sender_name": current_user.name,
            "sender_avatar": current_user.avatar_url,
            "content": msg.content,
            "message_type": msg.message_type,
            "file_url": msg.file_url,
            "is_read": msg.is_read,
            "is_pinned": msg.is_pinned,
            "created_at": msg.created_at.isoformat()
        }
    }
    
    # Schedule WS broadcast on running event loop
    loop = asyncio.get_event_loop()
    asyncio.run_coroutine_threadsafe(
        manager.broadcast_to_conversation(ws_payload, member_ids),
        loop
    )
    
    # Create notification for others
    for m_id in member_ids:
        if m_id != current_user.id:
            db.add(Notification(user_id=m_id, type="new_message", reference_id=msg.id))
    db.commit()
    
    return msg

@router.put("/messages/{message_id}/pin")
def toggle_pin_message(message_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found.")
        
    # Toggle pin
    msg.is_pinned = not msg.is_pinned
    db.commit()
    
    return {"id": message_id, "is_pinned": msg.is_pinned}

@router.post("/messages/{message_id}/react")
def react_to_message(message_id: int, reaction_type: str = Query(...), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Check if already reacted with same type
    existing = db.query(MessageReaction).filter(
        MessageReaction.message_id == message_id,
        MessageReaction.user_id == current_user.id
    ).first()
    
    if existing:
        if existing.reaction_type == reaction_type:
            # Remove reaction if same clicked
            db.delete(existing)
            db.commit()
            return {"status": "removed"}
        else:
            # Change reaction type
            existing.reaction_type = reaction_type
            db.commit()
            return {"status": "changed", "reaction_type": reaction_type}
            
    # Add new reaction
    reaction = MessageReaction(
        message_id=message_id,
        user_id=current_user.id,
        reaction_type=reaction_type
    )
    db.add(reaction)
    db.commit()
    return {"status": "added", "reaction_type": reaction_type}

# --- NOTIFICATIONS ---
@router.get("/notifications")
def list_notifications(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    notifications = db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(Notification.created_at.desc()).all()
    
    result = []
    for n in notifications:
        msg = ""
        if n.type == "new_message":
            msg = "You have a new message"
        elif n.type == "new_post":
            msg = "A new post was created in a community you are in"
        elif n.type == "new_comment":
            msg = "Someone commented on your post"
        elif n.type == "mention":
            msg = "Someone mentioned you in a post"
            
        result.append({
            "id": n.id,
            "type": n.type,
            "reference_id": n.reference_id,
            "is_read": n.is_read,
            "message": msg,
            "created_at": n.created_at
        })
    return result

@router.put("/notifications/{notification_id}/read")
def mark_notification_read(notification_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    if notif:
        notif.is_read = True
        db.commit()
    return {"status": True}

# --- SEARCH ENDPOINT ---
@router.get("/search")
def search_all(q: str = Query(...), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # 1. Search Users
    users = db.query(User).filter(
        and_(User.id != current_user.id, or_(User.name.ilike(f"%{q}%"), User.email.ilike(f"%{q}%")))
    ).all()
    
    # 2. Search Communities
    communities = db.query(Community).filter(
        or_(Community.name.ilike(f"%{q}%"), Community.description.ilike(f"%{q}%"))
    ).all()
    
    # 3. Search Messages inside conversations current user is member of
    conv_ids = db.query(ConversationMember.conversation_id).filter(ConversationMember.user_id == current_user.id).all()
    conv_ids = [c[0] for c in conv_ids]
    
    messages = db.query(Message).filter(
        and_(Message.conversation_id.in_(conv_ids), Message.content.ilike(f"%{q}%"))
    ).all()
    
    return {
        "users": [{
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "avatar_url": u.avatar_url,
            "online_status": u.online_status
        } for u in users],
        "communities": [{
            "id": c.id,
            "name": c.name,
            "description": c.description,
            "image_url": c.image_url
        } for c in communities],
        "messages": [{
            "id": m.id,
            "conversation_id": m.conversation_id,
            "content": m.content,
            "created_at": m.created_at,
            "sender_id": m.sender_id
        } for m in messages]
    }
