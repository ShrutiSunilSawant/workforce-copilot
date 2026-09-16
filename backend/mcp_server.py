"""
WorkforceIQ MCP Server
Exposes HR intelligence tools via the Model Context Protocol.
Runs on port 8001 alongside the main FastAPI app.
"""

import os
import sys
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from fastmcp import FastMCP

mcp = FastMCP(
    name="WorkforceIQ",
    instructions=(
        "You are connected to WorkforceIQ, an HR intelligence platform. "
        "Use these tools to answer questions about employee attrition risk, "
        "sentiment, HR policy, workforce statistics, and department breakdowns. "
        "Always call a relevant tool before answering data questions."
    ),
)


@mcp.tool()
def predict_attrition(
    department: str,
    age: int,
    monthly_income: int,
    years_at_company: int,
    job_satisfaction: int,
    work_life_balance: int,
    over_time: str,
    years_since_last_promotion: int,
    environment_satisfaction: int,
) -> dict:
    """
    Predict attrition risk for an employee based on their HR profile.
    Returns risk level (High/Medium/Low), probability, top risk factors, and SHAP-based explanation.

    Args:
        department: Employee's department (e.g. Engineering, Sales, HR)
        age: Employee age in years
        monthly_income: Monthly salary in USD
        years_at_company: Number of years at the company
        job_satisfaction: Job satisfaction score 1-4 (1=low, 4=high)
        work_life_balance: Work-life balance score 1-4 (1=low, 4=high)
        over_time: Whether employee works overtime - "Yes" or "No"
        years_since_last_promotion: Years elapsed since last promotion
        environment_satisfaction: Environment satisfaction score 1-4
    """
    try:
        from models.attrition_model import predict_attrition as _predict
        employee_data = {
            "Department": department,
            "Age": age,
            "MonthlyIncome": monthly_income,
            "YearsAtCompany": years_at_company,
            "JobSatisfaction": job_satisfaction,
            "WorkLifeBalance": work_life_balance,
            "OverTime": over_time,
            "YearsSinceLastPromotion": years_since_last_promotion,
            "EnvironmentSatisfaction": environment_satisfaction,
        }
        return _predict(employee_data)
    except FileNotFoundError:
        return {
            "error": "Model not trained yet. Please run model training first via the Retraining page.",
            "attrition_risk": "Unknown",
        }
    except Exception as e:
        return {"error": str(e)}


@mcp.tool()
def analyze_sentiment(text: str, department: str = "") -> dict:
    """
    Analyze sentiment and emotional signals in employee feedback text.
    Returns sentiment score, morale score, burnout signal, disengagement signal, and flags.

    Args:
        text: Employee feedback or survey response text to analyze
        department: Optional department name for context
    """
    try:
        from models.sentiment_model import get_sentiment_analyzer
        analyzer = get_sentiment_analyzer()
        result = analyzer.analyze(text)
        if department:
            result["department"] = department
        return result
    except Exception as e:
        return {"error": str(e)}


@mcp.tool()
def query_hr_policy(question: str) -> dict:
    """
    Query the HR policy knowledge base using RAG (Retrieval-Augmented Generation).
    Returns an answer grounded in uploaded HR policy documents.

    Args:
        question: A natural language question about HR policies, leave, benefits, etc.
    """
    try:
        from rag.pipeline import get_rag_pipeline
        pipeline = get_rag_pipeline()
        result = pipeline.query(question)
        return {
            "answer": result.get("answer", "No relevant policy found."),
            "sources": result.get("sources", []),
            "context_used": result.get("context_used", False),
        }
    except Exception as e:
        return {"error": str(e), "answer": "Policy query unavailable."}


@mcp.tool()
def get_workforce_stats() -> dict:
    """
    Get current workforce-level statistics including attrition rate,
    headcount, satisfaction scores, burnout rate, and risk counts.
    Returns aggregated metrics across all departments.
    """
    try:
        from database.connection import SessionLocal
        from database.models import Employee
        db = SessionLocal()

        total = db.query(Employee).count()
        attrition_count = db.query(Employee).filter(Employee.attrition == "Yes").count()
        overtime_count = db.query(Employee).filter(Employee.over_time == "Yes").count()

        employees = db.query(Employee).all()
        if employees:
            avg_satisfaction = sum(e.job_satisfaction for e in employees) / len(employees)
            avg_wlb = sum(e.work_life_balance for e in employees) / len(employees)
            low_satisfaction = sum(1 for e in employees if e.job_satisfaction <= 2)
            high_risk = sum(1 for e in employees if e.job_satisfaction <= 2 and e.over_time == "Yes")
        else:
            avg_satisfaction = avg_wlb = low_satisfaction = high_risk = 0

        db.close()

        return {
            "total_employees": total,
            "attrition_count": attrition_count,
            "attrition_rate": f"{(attrition_count / total * 100):.1f}%" if total else "N/A",
            "overtime_workers": overtime_count,
            "overtime_rate": f"{(overtime_count / total * 100):.1f}%" if total else "N/A",
            "avg_job_satisfaction": round(avg_satisfaction, 2),
            "avg_work_life_balance": round(avg_wlb, 2),
            "low_satisfaction_count": low_satisfaction,
            "high_risk_estimate": high_risk,
            "industry_benchmark_attrition": "15.0%",
        }
    except Exception as e:
        return {"error": str(e)}


@mcp.tool()
def get_department_breakdown(department: str = "") -> dict:
    """
    Get attrition and satisfaction statistics broken down by department.
    Pass a specific department name to filter, or leave empty for all departments.

    Args:
        department: Department name to filter (e.g. Engineering, Sales, HR). Empty = all.
    """
    try:
        from database.connection import SessionLocal
        from database.models import Employee
        from sqlalchemy import func
        db = SessionLocal()

        query = db.query(Employee)
        if department:
            query = query.filter(Employee.department == department)

        employees = query.all()
        db.close()

        if not employees:
            return {"error": f"No employees found for department: {department or 'all'}"}

        dept_map: dict = {}
        for e in employees:
            d = e.department
            if d not in dept_map:
                dept_map[d] = {"total": 0, "attrition": 0, "overtime": 0, "satisfaction_sum": 0}
            dept_map[d]["total"] += 1
            if e.attrition == "Yes":
                dept_map[d]["attrition"] += 1
            if e.over_time == "Yes":
                dept_map[d]["overtime"] += 1
            dept_map[d]["satisfaction_sum"] += e.job_satisfaction

        breakdown = {}
        for dept, stats in dept_map.items():
            t = stats["total"]
            breakdown[dept] = {
                "headcount": t,
                "attrition_count": stats["attrition"],
                "attrition_rate": f"{stats['attrition'] / t * 100:.1f}%",
                "overtime_rate": f"{stats['overtime'] / t * 100:.1f}%",
                "avg_job_satisfaction": round(stats["satisfaction_sum"] / t, 2),
            }

        return {"departments": breakdown, "filter": department or "all"}
    except Exception as e:
        return {"error": str(e)}


if __name__ == "__main__":
    port = int(os.environ.get("MCP_SERVER_PORT", "8001"))
    mcp.run(transport="streamable-http", host="127.0.0.1", port=port, path="/mcp")
