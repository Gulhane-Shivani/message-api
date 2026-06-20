import os
import sys
from sqlalchemy import create_engine

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import Base, engine, SessionLocal
from app.db_models import User, Community, CommunityMember, CommunityPost, PostLike, PostComment, Conversation, ConversationMember, Message, MessageReaction, Notification

def init_db():
    print("Recreating database tables...")
    
    # Drop all old tables with CASCADE to clean the database
    from sqlalchemy import text
    with engine.connect() as conn:
        for table in ["message_inbox_status", "message_replies", "post_likes", "post_comments", "community_posts", "community_members", "communities", "messages", "conversation_members", "conversations", "notifications", "users"]:
            try:
                conn.execute(text(f"DROP TABLE IF EXISTS {table} CASCADE"))
            except Exception as e:
                print(f"Error dropping table {table}: {e}")
        conn.commit()
    print("Dropped old tables with CASCADE.")
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    print("Created new tables successfully.")

    # Seeding database
    db = SessionLocal()
    try:
        # Check if users already exist
        if db.query(User).count() == 0:
            print("Seeding default users...")
            alice = User(
                name="Alice", 
                email="alice@example.com", 
                password="password123", # Plaintext since current login does plaintext, but we will support JWT and hashing
                avatar_url="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
                online_status=True
            )
            bob = User(
                name="Bob", 
                email="bob@example.com", 
                password="password456", 
                avatar_url="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
                online_status=True
            )
            charlie = User(
                name="Charlie", 
                email="charlie@example.com", 
                password="password789", 
                avatar_url="https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150",
                online_status=False
            )
            db.add_all([alice, bob, charlie])
            db.commit()
            print("Users seeded.")

            # Seed default communities
            print("Seeding default communities...")
            tech_community = Community(
                name="Tech Innovators",
                description="A community for technology enthusiasts, software developers, and startup founders to discuss ideas and trends.",
                image_url="https://images.unsplash.com/photo-1518770660439-4636190af475?w=300",
                creator_id=alice.id
            )
            design_community = Community(
                name="Design & Creative",
                description="Discuss UI/UX, graphic design, branding, and everything related to product design.",
                image_url="https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=300",
                creator_id=bob.id
            )
            db.add_all([tech_community, design_community])
            db.commit()
            print("Communities seeded.")

            # Seed community members
            db.add_all([
                CommunityMember(community_id=tech_community.id, user_id=alice.id, role="admin"),
                CommunityMember(community_id=tech_community.id, user_id=bob.id, role="member"),
                CommunityMember(community_id=tech_community.id, user_id=charlie.id, role="member"),
                CommunityMember(community_id=design_community.id, user_id=bob.id, role="admin"),
                CommunityMember(community_id=design_community.id, user_id=alice.id, role="member")
            ])
            db.commit()

            # Seed some posts
            print("Seeding default posts...")
            post1 = CommunityPost(
                community_id=tech_community.id,
                user_id=alice.id,
                content="Welcome to the Tech Innovators community! What projects are you working on this weekend? 🚀",
                image_url="https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=600"
            )
            post2 = CommunityPost(
                community_id=tech_community.id,
                user_id=bob.id,
                content="Just started learning FastAPI and React for web development. The speed and developer experience is amazing!"
            )
            db.add_all([post1, post2])
            db.commit()

            # Seed comments
            comment1 = PostComment(
                post_id=post1.id,
                user_id=bob.id,
                content="I am building a chat module using WebSockets! Excited to share it soon."
            )
            db.add_all([comment1])
            db.commit()

            # Seed comment reply
            comment_reply = PostComment(
                post_id=post1.id,
                user_id=alice.id,
                content="Sounds awesome, Bob! Can't wait to see the demo.",
                parent_id=comment1.id
            )
            db.add_all([comment_reply])
            db.commit()

            # Seed message conversations
            print("Seeding default conversations...")
            conv1 = Conversation(type="one_to_one")
            db.add(conv1)
            db.commit()

            # Add members to conversation
            db.add_all([
                ConversationMember(conversation_id=conv1.id, user_id=alice.id),
                ConversationMember(conversation_id=conv1.id, user_id=bob.id)
            ])
            db.commit()

            # Seed messages
            msg1 = Message(
                conversation_id=conv1.id,
                sender_id=alice.id,
                content="Hey Bob! Welcome to the messaging module."
            )
            msg2 = Message(
                conversation_id=conv1.id,
                sender_id=bob.id,
                content="Thanks Alice! WebSockets make this so fast."
            )
            db.add_all([msg1, msg2])
            db.commit()

            print("Database seeding completed.")
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
