from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import OperationalError
from database.models import Base, User, RoleEnum
from passlib.context import CryptContext
import os
from loguru import logger

DATABASE_URL = os.environ["DATABASE_URL"]

try:
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    logger.info("✅ PostgreSQL connected successfully")
except Exception as e:
    logger.warning(f"⚠️ PostgreSQL connection failed: {e}. Using SQLite fallback.")
    DATABASE_URL = "sqlite:///./workforceiq.db"
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # One-time bootstrap: create the platform owner's super_admin account,
        # but ONLY if the users table is completely empty. This is what lets
        # you log in for the first time (to then provision real companies via
        # POST /api/auth/companies) without shipping any seeded demo accounts.
        # Once any user exists, this never runs again — even if the env vars
        # are still set — so it can't be used to inject a second super_admin.
        if db.query(User).count() == 0:
            bootstrap_email = os.environ.get("BOOTSTRAP_SUPERADMIN_EMAIL")
            bootstrap_password = os.environ.get("BOOTSTRAP_SUPERADMIN_PASSWORD")
            if bootstrap_email and bootstrap_password:
                superadmin = User(
                    email=bootstrap_email,
                    full_name="Platform Owner",
                    hashed_password=pwd_context.hash(bootstrap_password),
                    role=RoleEnum.super_admin,
                    department=None,
                    company_id=None,
                    is_active=True,
                )
                db.add(superadmin)
                db.commit()
                logger.info(f"✅ Bootstrap super_admin created: {bootstrap_email}")
            else:
                logger.warning(
                    "⚠️ No users exist yet and BOOTSTRAP_SUPERADMIN_EMAIL/PASSWORD "
                    "are not set — nobody will be able to log in until you set them."
                )

        logger.info("✅ Database initialized successfully")
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Database init error: {e}")
    finally:
        db.close()
