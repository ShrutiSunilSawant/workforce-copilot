"""
WorkforceIQ - Synthetic HR Dataset Generator
Generates realistic IBM-style HR data with extended features
"""

import pandas as pd
import numpy as np
import os
import json
from datetime import datetime, timedelta
import random

np.random.seed(42)
random.seed(42)

N_EMPLOYEES = 1500

DEPARTMENTS = ["Engineering", "Sales", "Marketing", "HR", "Finance", "Operations", "Product", "Customer Success"]
DEPT_WEIGHTS = [0.28, 0.18, 0.10, 0.06, 0.10, 0.12, 0.10, 0.06]

JOB_ROLES = {
    "Engineering": ["Software Engineer", "Senior Engineer", "Staff Engineer", "Engineering Manager", "DevOps Engineer", "Data Scientist"],
    "Sales": ["Sales Rep", "Senior Sales Rep", "Account Executive", "Sales Manager", "VP Sales"],
    "Marketing": ["Marketing Analyst", "Content Strategist", "Growth Manager", "Marketing Director"],
    "HR": ["HR Coordinator", "HR Business Partner", "Recruiter", "HR Director"],
    "Finance": ["Financial Analyst", "Senior Analyst", "Finance Manager", "CFO"],
    "Operations": ["Operations Analyst", "Operations Manager", "Supply Chain Analyst", "COO"],
    "Product": ["Product Manager", "Senior PM", "Principal PM", "VP Product"],
    "Customer Success": ["CSM", "Senior CSM", "CS Manager", "VP Customer Success"],
}

EDUCATION_FIELDS = ["Computer Science", "Business", "Engineering", "Marketing", "Finance", "Psychology", "Other"]

EMPLOYEE_FEEDBACK = {
    "positive": [
        "Great work environment and collaborative team.",
        "Management genuinely cares about employee growth.",
        "Excellent work-life balance and flexible policies.",
        "Learning opportunities are abundant here.",
        "Leadership is transparent and communicates well.",
        "I feel valued and recognized for my contributions.",
        "Strong company culture and amazing colleagues.",
    ],
    "neutral": [
        "The role has some good aspects and some challenges.",
        "Workload is manageable most of the time.",
        "Compensation is competitive but benefits could improve.",
        "Some processes are inefficient but improving.",
        "Management is okay, not exceptional.",
        "Work is interesting but growth paths are unclear.",
    ],
    "negative": [
        "Excessive overtime is burning me out completely.",
        "Management doesn't listen to employee concerns.",
        "No clear path for career advancement here.",
        "Compensation is below market rate for my skills.",
        "Work-life balance is terrible, always on-call.",
        "Too much politics, not enough focus on real work.",
        "Poor communication from leadership constantly.",
        "Feeling completely disengaged and undervalued.",
        "The workload is unsustainable and unrealistic.",
        "Considering leaving due to lack of recognition.",
    ]
}


def generate_dataset():
    departments = np.random.choice(DEPARTMENTS, size=N_EMPLOYEES, p=DEPT_WEIGHTS)
    
    data = {
        "EmployeeID": [f"EMP{str(i).zfill(5)}" for i in range(1, N_EMPLOYEES + 1)],
        "Age": np.random.randint(22, 62, N_EMPLOYEES),
        "Department": departments,
        "JobRole": [random.choice(JOB_ROLES[dept]) for dept in departments],
        "EducationField": np.random.choice(EDUCATION_FIELDS, N_EMPLOYEES),
        "Education": np.random.randint(1, 6, N_EMPLOYEES),  # 1=Below College, 5=Doctor
        "Gender": np.random.choice(["Male", "Female", "Non-binary"], N_EMPLOYEES, p=[0.48, 0.46, 0.06]),
        "MaritalStatus": np.random.choice(["Single", "Married", "Divorced"], N_EMPLOYEES, p=[0.35, 0.50, 0.15]),
        "MonthlyIncome": np.random.randint(3000, 25000, N_EMPLOYEES),
        "HourlyRate": np.random.randint(30, 100, N_EMPLOYEES),
        "DailyRate": np.random.randint(200, 1500, N_EMPLOYEES),
        "MonthlyRate": np.random.randint(2000, 27000, N_EMPLOYEES),
        "PercentSalaryHike": np.random.randint(11, 25, N_EMPLOYEES),
        "StockOptionLevel": np.random.randint(0, 4, N_EMPLOYEES),
        "NumCompaniesWorked": np.random.randint(0, 10, N_EMPLOYEES),
        "TotalWorkingYears": np.random.randint(0, 35, N_EMPLOYEES),
        "YearsAtCompany": np.random.randint(0, 25, N_EMPLOYEES),
        "YearsInCurrentRole": np.random.randint(0, 15, N_EMPLOYEES),
        "YearsSinceLastPromotion": np.random.randint(0, 12, N_EMPLOYEES),
        "YearsWithCurrManager": np.random.randint(0, 15, N_EMPLOYEES),
        "TrainingTimesLastYear": np.random.randint(0, 6, N_EMPLOYEES),
        "EnvironmentSatisfaction": np.random.randint(1, 5, N_EMPLOYEES),
        "JobSatisfaction": np.random.randint(1, 5, N_EMPLOYEES),
        "RelationshipSatisfaction": np.random.randint(1, 5, N_EMPLOYEES),
        "WorkLifeBalance": np.random.randint(1, 5, N_EMPLOYEES),
        "JobInvolvement": np.random.randint(1, 5, N_EMPLOYEES),
        "PerformanceRating": np.random.choice([3, 4], N_EMPLOYEES, p=[0.85, 0.15]),
        "BusinessTravel": np.random.choice(["Non-Travel", "Travel_Rarely", "Travel_Frequently"], N_EMPLOYEES, p=[0.25, 0.55, 0.20]),
        "DistanceFromHome": np.random.randint(1, 30, N_EMPLOYEES),
        "OverTime": np.random.choice(["Yes", "No"], N_EMPLOYEES, p=[0.35, 0.65]),
        "Over18": ["Y"] * N_EMPLOYEES,
        "StandardHours": [80] * N_EMPLOYEES,
        "EmployeeCount": [1] * N_EMPLOYEES,
    }
    
    df = pd.DataFrame(data)
    
    # Ensure logical consistency
    df["YearsAtCompany"] = df.apply(lambda r: min(r["YearsAtCompany"], r["TotalWorkingYears"]), axis=1)
    df["YearsInCurrentRole"] = df.apply(lambda r: min(r["YearsInCurrentRole"], r["YearsAtCompany"]), axis=1)
    df["YearsSinceLastPromotion"] = df.apply(lambda r: min(r["YearsSinceLastPromotion"], r["YearsInCurrentRole"]), axis=1)
    df["YearsWithCurrManager"] = df.apply(lambda r: min(r["YearsWithCurrManager"], r["YearsAtCompany"]), axis=1)
    
    # Compute attrition risk score (used to derive label)
    risk_score = (
        (df["OverTime"] == "Yes").astype(float) * 0.25 +
        (df["JobSatisfaction"] <= 2).astype(float) * 0.20 +
        (df["WorkLifeBalance"] <= 2).astype(float) * 0.15 +
        (df["YearsSinceLastPromotion"] >= 5).astype(float) * 0.10 +
        (df["EnvironmentSatisfaction"] <= 2).astype(float) * 0.10 +
        (df["MonthlyIncome"] < 5000).astype(float) * 0.08 +
        (df["BusinessTravel"] == "Travel_Frequently").astype(float) * 0.07 +
        (df["DistanceFromHome"] >= 20).astype(float) * 0.05 +
        np.random.uniform(0, 0.15, N_EMPLOYEES)  # noise
    )
    
    df["AttritionRisk"] = (risk_score > 0.45).astype(int)
    df["Attrition"] = df["AttritionRisk"].map({1: "Yes", 0: "No"})
    df["AttritionProbability"] = np.clip(risk_score, 0.01, 0.99).round(3)
    
    # BurnoutRisk
    burnout_score = (
        (df["OverTime"] == "Yes").astype(float) * 0.30 +
        (df["WorkLifeBalance"] <= 2).astype(float) * 0.25 +
        (df["JobInvolvement"] <= 2).astype(float) * 0.20 +
        (df["JobSatisfaction"] <= 2).astype(float) * 0.15 +
        np.random.uniform(0, 0.10, N_EMPLOYEES)
    )
    df["BurnoutRisk"] = burnout_score.round(3)
    df["BurnoutLabel"] = (burnout_score > 0.5).map({True: "High", False: "Low"})
    
    # Tenure Band
    df["TenureBand"] = pd.cut(df["YearsAtCompany"],
                               bins=[-1, 1, 3, 7, 15, 100],
                               labels=["<1yr", "1-3yr", "3-7yr", "7-15yr", "15+yr"])
    
    # Hire Date (synthetic)
    base_date = datetime(2024, 1, 1)
    df["HireDate"] = [
        (base_date - timedelta(days=int(y * 365 + np.random.randint(0, 365)))).strftime("%Y-%m-%d")
        for y in df["YearsAtCompany"]
    ]
    
    # Employee feedback text
    def get_feedback(row):
        if row["AttritionRisk"] == 1 or row["JobSatisfaction"] <= 2:
            pool = EMPLOYEE_FEEDBACK["negative"]
        elif row["JobSatisfaction"] >= 4 and row["WorkLifeBalance"] >= 3:
            pool = EMPLOYEE_FEEDBACK["positive"]
        else:
            pool = EMPLOYEE_FEEDBACK["neutral"]
        return random.choice(pool)
    
    df["FeedbackText"] = df.apply(get_feedback, axis=1)
    
    return df


def generate_monthly_attrition_trend(df):
    """Generate monthly attrition timeseries for forecasting"""
    months = pd.date_range(start="2022-01-01", end="2024-12-01", freq="MS")
    base_rate = 0.12  # 12% annual = 1% monthly
    
    trend_data = []
    for i, month in enumerate(months):
        seasonal = 0.02 * np.sin(2 * np.pi * i / 12)  # seasonal variation
        noise = np.random.normal(0, 0.005)
        trend = 0.0005 * i  # slight upward trend
        rate = base_rate / 12 + seasonal + noise + trend
        n_attrition = max(0, int(N_EMPLOYEES * rate))
        trend_data.append({
            "month": month.strftime("%Y-%m"),
            "attrition_count": n_attrition,
            "attrition_rate": round(rate, 4),
            "headcount": N_EMPLOYEES - sum(d["attrition_count"] for d in trend_data)
        })
    
    return pd.DataFrame(trend_data)


def generate_department_stats(df):
    """Aggregate department-level statistics"""
    dept_stats = df.groupby("Department").agg(
        headcount=("EmployeeID", "count"),
        attrition_rate=("AttritionRisk", "mean"),
        avg_satisfaction=("JobSatisfaction", "mean"),
        avg_worklife=("WorkLifeBalance", "mean"),
        avg_burnout=("BurnoutRisk", "mean"),
        avg_income=("MonthlyIncome", "mean"),
        overtime_pct=("OverTime", lambda x: (x == "Yes").mean()),
    ).reset_index().round(3)
    return dept_stats


if __name__ == "__main__":
    print("🔄 Generating synthetic HR dataset...")
    
    df = generate_dataset()
    df.to_csv("datasets/hr_employee_data.csv", index=False)
    print(f"✅ Generated {len(df)} employee records → datasets/hr_employee_data.csv")
    
    trend_df = generate_monthly_attrition_trend(df)
    trend_df.to_csv("datasets/monthly_attrition_trend.csv", index=False)
    print(f"✅ Generated {len(trend_df)} monthly records → datasets/monthly_attrition_trend.csv")
    
    dept_df = generate_department_stats(df)
    dept_df.to_csv("datasets/department_stats.csv", index=False)
    print(f"✅ Generated department stats → datasets/department_stats.csv")
    
    # Sample employees for demo
    sample = df[["EmployeeID", "Department", "JobRole", "Age", "MonthlyIncome",
                  "YearsAtCompany", "AttritionProbability", "BurnoutRisk",
                  "JobSatisfaction", "OverTime", "Attrition"]].head(20)
    print("\n📋 Sample Records:")
    print(sample.to_string(index=False))
    
    print("\n📊 Dataset Summary:")
    print(f"  Total Employees: {len(df)}")
    print(f"  Attrition Rate: {df['AttritionRisk'].mean():.1%}")
    print(f"  High Burnout: {(df['BurnoutLabel'] == 'High').mean():.1%}")
    print(f"  Overtime Workers: {(df['OverTime'] == 'Yes').mean():.1%}")
    print(f"  Departments: {df['Department'].nunique()}")
