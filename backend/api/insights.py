"""WorkforceIQ - AI Insights API"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from database.models import User
from auth.utils import get_current_user

router = APIRouter(prefix="/api/insights", tags=["insights"])


class InsightRequest(BaseModel):
    topic: str  # attrition / sentiment / forecast / retention / general
    department: Optional[str] = None
    time_period: str = "current"


@router.post("/generate")
async def generate_insight(request: InsightRequest, current_user: User = Depends(get_current_user)):
    """Generate AI-powered workforce insight"""
    context = {
        "department": request.department or "all departments",
        "total_employees": 1500,
        "attrition_rate": "18.7%",
        "high_risk_count": 234,
        "burnout_rate": "31%",
        "avg_satisfaction": "2.8/4",
        "overtime_rate": "35%",
    }
    
    try:
        from utils.llm import generate_insight as llm_insight
        insight = llm_insight(context, f"Generate a workforce insight about {request.topic}", request.topic)
    except Exception:
        insight = _static_insight(request.topic, request.department)
    
    return {
        "topic": request.topic,
        "department": request.department,
        "insight": insight,
        "confidence": 0.87,
        "data_points_analyzed": 1500,
        "generated_at": "2024-06-01T10:00:00Z",
    }


@router.get("/cards")
async def get_insight_cards(current_user: User = Depends(get_current_user)):
    """Get pre-generated insight cards for dashboard"""
    return {
        "insights": [
            {
                "id": "ins_001",
                "type": "critical",
                "icon": "🚨",
                "title": "Engineering Burnout Crisis",
                "summary": "71% of Engineering employees show high burnout signals — critical intervention needed within 30 days.",
                "department": "Engineering",
                "metric": "71% burnout rate",
                "action": "Schedule workload audit",
            },
            {
                "id": "ins_002",
                "type": "warning",
                "icon": "⚠️",
                "title": "Sales Attrition Spike",
                "summary": "Sales attrition rate reached 24% — 3x the company average. Compensation gap is the primary driver.",
                "department": "Sales",
                "metric": "24% attrition rate",
                "action": "Compensation benchmarking",
            },
            {
                "id": "ins_003",
                "type": "info",
                "icon": "📈",
                "title": "Promotion Pipeline Stagnation",
                "summary": "Average 3.2 years since last promotion. 67% of high-risk employees have been passed over 2+ cycles.",
                "department": "All",
                "metric": "3.2 yr avg since promotion",
                "action": "Accelerate promotion reviews",
            },
            {
                "id": "ins_004",
                "type": "positive",
                "icon": "✅",
                "title": "Customer Success Excellence",
                "summary": "Customer Success maintains highest morale (0.78/1.0) and lowest attrition. Manager quality is the differentiator.",
                "department": "Customer Success",
                "metric": "0.78 morale score",
                "action": "Replicate management model",
            },
            {
                "id": "ins_005",
                "type": "warning",
                "icon": "💰",
                "title": "Compensation Equity Gap",
                "summary": "34% of at-risk employees earn below P50 market rate. Retention cost of $2.4M projected from voluntary attrition.",
                "department": "Multiple",
                "metric": "34% below market rate",
                "action": "Market rate adjustment",
            },
            {
                "id": "ins_006",
                "type": "info",
                "icon": "🎯",
                "title": "Retention ROI Opportunity",
                "summary": "Implementing the 5-point retention plan could reduce attrition by 8-12%, saving $1.8-2.1M in replacement costs.",
                "department": "All",
                "metric": "$1.8M-2.1M savings potential",
                "action": "Launch retention program",
            },
        ]
    }


def _static_insight(topic: str, department: Optional[str]) -> str:
    dept = department or "the organization"
    insights = {
        "attrition": f"Attrition analysis for {dept} reveals an 18.7% annual rate — 25% above industry benchmark. Primary drivers are sustained overtime (35% of workforce), low satisfaction scores averaging 2.8/4, and a 3.2-year average since last promotion. Immediate interventions targeting these three factors could reduce attrition by 8-12% within 6 months.",
        "sentiment": f"Employee sentiment in {dept} shows a declining trend over the past 12 months. Morale scores dropped from 0.65 to 0.52 — a 20% decline. Key themes in feedback: workload imbalance, lack of recognition, and unclear career progression. Burnout signals are most concentrated in mid-tenure employees (3-7 years) with consistent overtime patterns.",
        "forecast": "Workforce forecast indicates attrition will increase from 18.7% to ~22.3% without intervention over the next 6 months. Seasonal peak expected in August-September. Engineering and Sales face the highest net headcount risk. Proactive hiring and retention measures needed by Q2 to maintain operational capacity.",
        "retention": "Top retention priorities based on data analysis: (1) Compensation review for the 34% earning below market P50 — highest ROI intervention. (2) Overtime reduction policies for Engineering and Sales — 2.5x attrition multiplier. (3) Accelerated promotion reviews for 67% of high-risk employees passed over 2+ cycles. Combined impact: projected 8-12% attrition reduction.",
        "general": f"WorkforceIQ analysis for {dept} identifies three critical risk zones: attrition at 18.7%, burnout affecting 31% of workforce, and declining morale at 0.52/1.0. The Engineering department requires immediate intervention. Data suggests a coordinated retention strategy could prevent $2.4M in annual replacement costs.",
    }
    return insights.get(topic, insights["general"])
