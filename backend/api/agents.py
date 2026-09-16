"""WorkforceIQ - Multi-Agent AI System API

Exposes the real LangGraph (with sequential fallback) multi-agent
orchestrator defined in agents/orchestrator.py. Runs entirely on
free, local Hugging Face models — no paid APIs.
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from database.models import User
from auth.utils import get_current_user

router = APIRouter(prefix="/api/agents", tags=["agents"])


class AgentAnalysisRequest(BaseModel):
    question: str = "Provide a full workforce intelligence analysis."
    department: str = "all"


@router.post("/analyze")
async def run_multi_agent_analysis(request: AgentAnalysisRequest, current_user: User = Depends(get_current_user)):
    """Run the 4-agent workforce intelligence pipeline (Attrition -> Sentiment -> Recommendation -> Reporting)."""
    from agents.orchestrator import get_orchestrator

    context_data = {
        "department": request.department,
        "total_employees": 1500,
        "attrition_rate": "18.7%",
        "high_risk_count": 234,
        "avg_satisfaction": "2.8/4",
        "overtime_rate": "35%",
        "burnout_rate": "31%",
    }

    orchestrator = get_orchestrator()
    result = orchestrator.analyze(
        question=request.question,
        context_data=context_data,
        department=request.department,
    )
    return result
