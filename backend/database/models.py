from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, Enum, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

Base = declarative_base()

class RoleEnum(str, enum.Enum):
    super_admin = "super_admin"  # Platform owner. Not tied to any company.
    admin = "admin"               # Company-scoped admin: sees all of their company's data.
    manager = "manager"           # Company-scoped manager: sees only their department.


class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    users = relationship("User", back_populates="company")
    employees = relationship("Employee", back_populates="company")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(RoleEnum), default=RoleEnum.manager, nullable=False)
    department = Column(String, nullable=True)  # For managers — which dept they manage
    # NULL only for role=super_admin, who isn't scoped to any single company.
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True, index=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    company = relationship("Company", back_populates="users")
    predictions = relationship("Prediction", back_populates="user")


class Employee(Base):
    __tablename__ = "employees"
    __table_args__ = (
        # Employee IDs are only unique within a company, not globally —
        # two different companies can both have an "EMP00001".
        UniqueConstraint("company_id", "employee_id", name="uq_employee_company_employee_id"),
    )

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    employee_id = Column(String, index=True)
    age = Column(Integer)
    department = Column(String, index=True)
    job_role = Column(String)
    monthly_income = Column(Float)
    over_time = Column(String)
    job_satisfaction = Column(Integer)
    years_at_company = Column(Integer)
    years_since_last_promotion = Column(Integer)
    work_life_balance = Column(Integer)
    environment_satisfaction = Column(Integer)
    relationship_satisfaction = Column(Integer)
    performance_rating = Column(Integer)
    distance_from_home = Column(Integer)
    education = Column(Integer)
    num_companies_worked = Column(Integer)
    total_working_years = Column(Integer)
    training_times_last_year = Column(Integer)
    attrition = Column(String, default="No")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    company = relationship("Company", back_populates="employees")


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    risk_level = Column(String)
    probability = Column(Float)
    top_factors = Column(Text)  # JSON string
    recommended_actions = Column(Text)  # JSON string
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="predictions")


class ModelVersion(Base):
    __tablename__ = "model_versions"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    version = Column(String, nullable=False)
    accuracy = Column(Float)
    trained_by = Column(String)
    training_data_size = Column(Integer)
    is_active = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
