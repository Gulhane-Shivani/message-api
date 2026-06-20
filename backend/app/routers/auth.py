from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db_session
from app.db_models import User
from app.auth_utils import verify_password, create_access_token
from pydantic import BaseModel

router = APIRouter()

class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/login")
def login(payload: LoginRequest, db: Session = Depends(get_db_session)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password):
        return {"status": False, "message": "Invalid Login"}
    
    # Generate token
    token = create_access_token(data={"sub": user.email})
    
    # Update online status
    user.online_status = True
    db.commit()
    
    return {
        "status": True, 
        "token": token,
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "avatar_url": user.avatar_url,
            "online_status": user.online_status
        }
    }
