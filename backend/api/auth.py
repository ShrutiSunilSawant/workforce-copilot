import os
from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional
from database.connection import get_db
from database.models import User, Company, RoleEnum
from auth.utils import (
    verify_password, hash_password, create_access_token, get_current_user,
    require_admin, require_super_admin, ACCESS_TOKEN_EXPIRE_MINUTES,
)

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
    company_id: Optional[int]
    company_name: Optional[str]
    is_active: bool

class CreateCompanyRequest(BaseModel):
    company_name: str
    admin_email: str
    admin_full_name: str
    admin_password: str


def _company_name(db: Session, company_id: Optional[int]) -> Optional[str]:
    if company_id is None:
        return None
    company = db.query(Company).filter(Company.id == company_id).first()
    return company.name if company else None


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

    token = create_access_token(data={
        "sub": user.email,
        "role": user.role,
        "dept": user.department,
        "company_id": user.company_id,
    })
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
            "company_id": user.company_id,
            "company_name": _company_name(db, user.company_id),
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
def register(req: RegisterRequest, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    """Invite a teammate into YOUR OWN company. Company-admin only —
    always scopes the new account to the admin's own company_id, and can
    only create admin/manager roles (never super_admin)."""
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
        company_id=current_user.company_id,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"message": "User created successfully", "user_id": user.id}

@router.get("/me", response_model=UserResponse)
def get_me(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        department=current_user.department,
        company_id=current_user.company_id,
        company_name=_company_name(db, current_user.company_id),
        is_active=current_user.is_active,
    )

@router.get("/users")
def list_users(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    """Lists only the users in the admin's own company."""
    users = db.query(User).filter(User.company_id == current_user.company_id).all()
    return [{"id": u.id, "email": u.email, "full_name": u.full_name, "role": u.role, "department": u.department, "is_active": u.is_active} for u in users]

@router.delete("/users/{user_id}")
def deactivate_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id, User.company_id == current_user.company_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = False
    db.commit()
    return {"message": "User deactivated"}


# ── Platform-owner (super_admin) company provisioning ──

@router.post("/companies")
def create_company(req: CreateCompanyRequest, db: Session = Depends(get_db), current_user: User = Depends(require_super_admin)):
    """Provision a new tenant company + its first admin account.
    Platform-owner only — there is no public signup."""
    existing = db.query(User).filter(User.email == req.admin_email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    company = Company(name=req.company_name)
    db.add(company)
    db.flush()  # assign company.id without committing yet

    admin = User(
        email=req.admin_email,
        full_name=req.admin_full_name,
        hashed_password=hash_password(req.admin_password),
        role=RoleEnum.admin,
        department=None,
        company_id=company.id,
        is_active=True,
    )
    db.add(admin)
    db.commit()
    db.refresh(company)
    return {"message": "Company created", "company_id": company.id, "admin_user_id": admin.id}

@router.get("/companies")
def list_companies(db: Session = Depends(get_db), current_user: User = Depends(require_super_admin)):
    from database.models import Employee
    companies = db.query(Company).order_by(Company.created_at.desc()).all()
    result = []
    for c in companies:
        result.append({
            "id": c.id,
            "name": c.name,
            "is_active": c.is_active,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "user_count": db.query(User).filter(User.company_id == c.id).count(),
            "employee_count": db.query(Employee).filter(Employee.company_id == c.id).count(),
        })
    return {"companies": result}

@router.delete("/companies/{company_id}")
def deactivate_company(company_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_super_admin)):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    company.is_active = False
    db.query(User).filter(User.company_id == company_id).update({"is_active": False})
    db.commit()
    return {"message": "Company deactivated"}
