"""
Migration script to ensure all existing communities have an "Announcements" channel
and all members of those communities are subscribed to it.
"""
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.db_models import Community, CommunityMember, Conversation, ConversationMember

def run_migration():
    db = SessionLocal()
    try:
        communities = db.query(Community).all()
        print(f"Found {len(communities)} communities. Verifying Announcements channel...")
        
        for c in communities:
            # Check if this community already has an Announcements channel
            ann_conv = db.query(Conversation).filter(
                Conversation.community_id == c.id,
                Conversation.type == "group",
                Conversation.name.ilike("%announcement%")
            ).first()
            
            if not ann_conv:
                print(f"Creating Announcements channel for community: {c.name}")
                ann_conv = Conversation(name="Announcements", type="group", community_id=c.id)
                db.add(ann_conv)
                db.commit()
                db.refresh(ann_conv)
            
            # Ensure all community members are in this Announcements conversation
            members = db.query(CommunityMember).filter(CommunityMember.community_id == c.id).all()
            for m in members:
                exists = db.query(ConversationMember).filter(
                    ConversationMember.conversation_id == ann_conv.id,
                    ConversationMember.user_id == m.user_id
                ).first()
                if not exists:
                    print(f"Adding user {m.user_id} to Announcements channel in community {c.name}")
                    db.add(ConversationMember(conversation_id=ann_conv.id, user_id=m.user_id))
            
            db.commit()
            
        print("Migration complete!")
    except Exception as e:
        print(f"Migration failed: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
