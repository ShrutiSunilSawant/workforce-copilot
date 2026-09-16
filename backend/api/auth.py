import os
from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional
from database.connection import get_db
from database.models import User, RoleEnum
from auth.utils import verify_password, hash_password, create_access_token, get_current_user, ACCESS_TOKEN_EXPIRE_MINUTES

router = APIRouter(prefix="/api/auth", tags=["auth"])

class RegisterRequest(BaseModel):
    email: str
    full_name: str
    password: str
    role: str = "manager"
    department: Optional[str] = None

class TokenResponse(BaseModel):
    user: dict

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    department: Optional[str]
    is_active: bool

@router.post("/login", response_model=TokenResponse)
def login(response: Response, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is deactivated")

    token = create_access_token(data={"sub": user.email, "role": user.role, "dept": user.department})
    is_prod = os.environ.get("ENV", "development") == "production"
    response.set_cookie(
        key="wiq_token",
        value=token,
        httponly=True,
        secure=is_prod,
        # Frontend and backend live on different domains in production (Vercel + Render),
        # so the cookie must be SameSite=None to be sent on those cross-site requests.
        # SameSite=None requires Secure, which is only set once we're actually on HTTPS.
        samesite="none" if is_prod else "lax",
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )
    return {
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "department": user.department,
        }
    }

@router.post("/logout")
def logout(response: Response):
    is_prod = os.environ.get("ENV", "development") == "production"
    response.delete_cookie(
        key="wiq_token",
        path="/",
        secure=is_prod,
        samesite="none" if is_prod else "lax",
    )
    return {"message": "Logged out"}

@router.post("/register")
def register(req: RegisterRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Only admins can register new users
    if current_user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Only admins can create new users")

    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    role = RoleEnum.admin if req.role == "admin" else RoleEnum.manager
    user = User(
        email=req.email,
        full_name=req.full_name,
        hashed_password=hash_password(req.password),
        role=role,
        department=req.department,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"message": "User created successfully", "user_id": user.id}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        department=current_user.department,
        is_active=current_user.is_active,
    )

@router.get("/users")
def list_users(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Admin only")
    users = db.query(User).all()
    return [{"id": u.id, "email": u.email, "full_name": u.full_name, "role": u.role, "department": u.department, "is_active": u.is_active} for u in users]

@router.delete("/users/{user_id}")
def deactivate_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Admin only")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = False
    db.commit()
    return {"message": "User deactivated"}
