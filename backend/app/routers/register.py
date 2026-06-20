from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db_session
from app.db_models import User
from app.auth_utils import hash_password, create_access_token
from pydantic import BaseModel

router = APIRouter()

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str

@router.post("/register")
def register(payload: RegisterRequest, db: Session = Depends(get_db_session)):
    if not payload.name.strip() or not payload.email.strip() or not payload.password.strip():
        return {"status": False, "message": "All fields are required."}
    
    # Check if email exists
    existing = db.query(User).filter(User.email == payload.email.strip()).first()
    if existing:
        return {"status": False, "message": "Email is already registered."}
    
    # Create new user
    hashed = hash_password(payload.password)
    # Default avatar placeholder using initials or a nice design
    initials = "".join([part[0] for part in payload.name.split() if part])[:2].upper()
    avatar_url = f"https://ui-avatars.com/api/?name={payload.name.replace(' ', '+')}&background=6366f1&color=fff"
    
    new_user = User(
        name=payload.name.strip(),
        email=payload.email.strip(),
        password=hashed,
        avatar_url=avatar_url,
        online_status=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Generate token
    token = create_access_token(data={"sub": new_user.email})
    
    return {
        "status": True, 
        "token": token,
        "user": {
            "id": new_user.id,
            "name": new_user.name,
            "email": new_user.email,
            "avatar_url": new_user.avatar_url,
            "online_status": new_user.online_status
        }
    }
