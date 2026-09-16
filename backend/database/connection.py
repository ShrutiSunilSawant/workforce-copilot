from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import OperationalError
from database.models import Base, User, Employee, RoleEnum
from passlib.context import CryptContext
import os
import json
import pandas as pd
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
        # Seed default admin user
        admin_email = os.environ["SEED_ADMIN_EMAIL"]
        admin_password = os.environ["SEED_ADMIN_PASSWORD"]
        existing_admin = db.query(User).filter(User.email == admin_email).first()
        if not existing_admin:
            admin = User(
                email=admin_email,
                full_name="HR Admin",
                hashed_password=pwd_context.hash(admin_password),
                role=RoleEnum.admin,
                department=None,
                is_active=True
            )
            db.add(admin)
            logger.info(f"✅ Default admin created: {admin_email}")

        # Seed default manager users
        manager_password = os.environ["SEED_MANAGER_PASSWORD"]
        managers = [
            {"email": "eng.manager@workforceiq.com", "name": "Engineering Manager", "dept": "Engineering"},
            {"email": "sales.manager@workforceiq.com", "name": "Sales Manager", "dept": "Sales"},
            {"email": "hr.manager@workforceiq.com", "name": "HR Manager", "dept": "HR"},
            {"email": "finance.manager@workforceiq.com", "name": "Finance Manager", "dept": "Finance"},
        ]
        for m in managers:
            existing = db.query(User).filter(User.email == m["email"]).first()
            if not existing:
                manager = User(
                    email=m["email"],
                    full_name=m["name"],
                    hashed_password=pwd_context.hash(manager_password),
                    role=RoleEnum.manager,
                    department=m["dept"],
                    is_active=True
                )
                db.add(manager)

        # Seed employees from CSV if table is empty
        emp_count = db.query(Employee).count()
        if emp_count == 0:
            csv_path = os.environ["HR_DATA_CSV_PATH"]
            if os.path.exists(csv_path):
                df = pd.read_csv(csv_path)
                for _, row in df.iterrows():
                    emp = Employee(
                        employee_id=str(row.get("EmployeeNumber", f"EMP{_:05d}")),
                        age=int(row.get("Age", 30)),
                        department=str(row.get("Department", "Engineering")),
                        job_role=str(row.get("JobRole", "Engineer")),
                        monthly_income=float(row.get("MonthlyIncome", 5000)),
                        over_time=str(row.get("OverTime", "No")),
                        job_satisfaction=int(row.get("JobSatisfaction", 3)),
                        years_at_company=int(row.get("YearsAtCompany", 3)),
                        years_since_last_promotion=int(row.get("YearsSinceLastPromotion", 1)),
                        work_life_balance=int(row.get("WorkLifeBalance", 3)),
                        environment_satisfaction=int(row.get("EnvironmentSatisfaction", 3)),
                        relationship_satisfaction=int(row.get("RelationshipSatisfaction", 3)),
                        performance_rating=int(row.get("PerformanceRating", 3)),
                        distance_from_home=int(row.get("DistanceFromHome", 10)),
                        education=int(row.get("Education", 3)),
                        num_companies_worked=int(row.get("NumCompaniesWorked", 2)),
                        total_working_years=int(row.get("TotalWorkingYears", 8)),
                        training_times_last_year=int(row.get("TrainingTimesLastYear", 2)),
                        attrition=str(row.get("Attrition", "No")),
                    )
                    db.add(emp)
                logger.info(f"✅ Seeded {len(df)} employees from CSV")

        db.commit()
        logger.info("✅ Database initialized successfully")
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Database init error: {e}")
    finally:
        db.close()
