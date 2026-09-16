import os
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status, Request
from sqlalchemy.orm import Session, Query
from database.connection import get_db
from database.models import User, RoleEnum

SECRET_KEY = os.environ["SECRET_KEY"]
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8 hours

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_token_from_cookie(request: Request) -> str:
    token = request.cookies.get("wiq_token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    return token

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(get_token_from_cookie), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # Re-fetch from DB rather than trusting the token's claims beyond the
    # email — so a role/department/company change takes effect immediately
    # instead of waiting for the token to expire.
    user = db.query(User).filter(User.email == email).first()
    if user is None or not user.is_active:
        raise credentials_exception
    return user

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != RoleEnum.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

def require_admin_or_manager(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in [RoleEnum.admin, RoleEnum.manager]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    return current_user

def require_super_admin(current_user: User = Depends(get_current_user)) -> User:
    """Platform-owner-only routes (e.g. provisioning new companies)."""
    if current_user.role != RoleEnum.super_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Platform owner access required"
        )
    return current_user

def require_company_user(current_user: User = Depends(get_current_user)) -> User:
    """Any authenticated user who belongs to a company (admin or manager,
    not the super_admin). Use this on every route that reads or writes
    company-scoped data (employees, documents, model versions, ...)."""
    if current_user.role == RoleEnum.super_admin or current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This action requires a company account, not the platform-owner account"
        )
    return current_user

def scoped_query(db: Session, model, current_user: User) -> Query:
    """Single, auditable choke point for tenant isolation: every query
    against a company-owned table (Employee, ModelVersion, ...) should be
    built through this helper rather than `db.query(Model)` directly, so
    a missing filter is a `grep`-able exception rather than a silent leak.
    Requires a company-scoped user (see require_company_user)."""
    if current_user.company_id is None:
        raise HTTPException(status_code=403, detail="No company associated with this account")
    return db.query(model).filter(model.company_id == current_user.company_id)

def filter_by_department(current_user: User, department: Optional[str] = None) -> Optional[str]:
    """Returns department filter based on role.
    Admin sees all (returns None = no filter).
    Manager sees only their department."""
    if current_user.role == RoleEnum.admin:
        return department  # Admin can optionally filter or see all
    return current_user.department  # Manager always filtered to their dept
