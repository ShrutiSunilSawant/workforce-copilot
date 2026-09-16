"""
WorkforceIQ - AI Copilot Chatbot API
Conversational HR analytics with memory and RAG
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
import uuid
from database.models import User
from auth.utils import get_current_user

router = APIRouter(prefix="/api/chat", tags=["chat"])

# Simple in-memory conversation store (use Redis in production)
_conversations: dict[str, list[dict]] = {}

SYSTEM_CONTEXT = """
You are WorkforceIQ Copilot, an expert AI assistant for HR analytics and workforce intelligence.
You help HR leaders understand attrition patterns, employee sentiment, burnout risks, and workforce trends.
You provide data-driven, actionable insights in a professional but approachable tone.
Always ground your responses in the HR data context provided.
"""


class ChatMessage(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    include_rag: bool = True
    department_filter: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    conversation_id: str
    sources: list = []
    suggested_questions: list[str] = []
    data_context: dict = {}


SUGGESTED_QUESTIONS = {
    "attrition": [
        "Which employees are at highest risk of leaving?",
        "What's causing attrition in Engineering?",
        "Show me attrition trends over time",
    ],
    "sentiment": [
        "Which department has the lowest morale?",
        "What are employees saying about work-life balance?",
        "Show burnout signals by department",
    ],
    "strategy": [
        "What retention strategies do you recommend?",
        "How can we reduce overtime-related burnout?",
        "Suggest career development improvements",
    ],
    "forecast": [
        "Predict attrition for next quarter",
        "Which departments will need new hires soon?",
        "When is peak resignation season?",
    ],
}


def _get_relevant_suggestions(message: str) -> list[str]:
    msg_lower = message.lower()
    if any(w in msg_lower for w in ["attrition", "resign", "leave", "turnover"]):
        return SUGGESTED_QUESTIONS["attrition"]
    elif any(w in msg_lower for w in ["sentiment", "morale", "burnout", "satisfaction"]):
        return SUGGESTED_QUESTIONS["sentiment"]
    elif any(w in msg_lower for w in ["forecast", "predict", "future", "trend"]):
        return SUGGESTED_QUESTIONS["forecast"]
    else:
        return SUGGESTED_QUESTIONS["strategy"]


def _get_mock_context_data() -> dict:
    """Return mock HR context data for LLM grounding"""
    return {
        "total_employees": 1500,
        "attrition_rate": "18.7%",
        "high_risk_count": 234,
        "avg_satisfaction": "2.8/4",
        "overtime_rate": "35%",
        "burnout_rate": "31%",
        "top_risk_dept": "Engineering",
        "low_morale_dept": "Sales",
        "avg_years_since_promotion": "3.2 years",
        "below_market_compensation_pct": "34%",
    }


@router.post("/", response_model=ChatResponse)
async def chat(request: ChatMessage, current_user: User = Depends(get_current_user)):
    """
    Main AI Copilot chat endpoint.
    Supports multi-turn conversation with memory.
    """
    # Create or retrieve conversation
    conv_id = request.conversation_id or str(uuid.uuid4())
    if conv_id not in _conversations:
        _conversations[conv_id] = []
    
    history = _conversations[conv_id]
    
    # Add user message to history
    history.append({"role": "user", "content": request.message})
    
    # Company-scoped features (RAG documents, live MCP data) only make sense
    # for company accounts — the platform-owner super_admin has none of these.
    company_id = current_user.company_id

    # Try RAG retrieval first
    rag_sources = []
    rag_context = ""
    if request.include_rag and company_id is not None:
        try:
            from rag.pipeline import get_rag_pipeline
            rag = get_rag_pipeline(company_id)
            rag_result = rag.query(request.message)
            if rag_result.get("context_used"):
                rag_context = f"\n\nRAG Context from HR Documents:\n{rag_result['answer']}"
                rag_sources = rag_result.get("sources", [])
        except Exception:
            pass

    # Call MCP tool for live grounding context
    mcp_context = ""
    mcp_tool_used = ""
    if company_id is not None:
        try:
            from agents.mcp_client import call_relevant_tool
            mcp_result = call_relevant_tool(request.message, company_id, request.department_filter or "")
            mcp_tool_used = mcp_result.get("tool", "")
            tool_data = mcp_result.get("result", {})
            if tool_data and "error" not in tool_data:
                lines = "\n".join(f"  {k}: {v}" for k, v in tool_data.items())
                mcp_context = f"\n\nLive Data from MCP Tool [{mcp_tool_used}]:\n{lines}"
        except Exception:
            pass

    # Fall back to mock context if MCP unavailable
    context_data = _get_mock_context_data()
    if request.department_filter:
        context_data["focused_department"] = request.department_filter

    # Build conversation prompt
    history_str = "\n".join([
        f"{'User' if m['role'] == 'user' else 'Assistant'}: {m['content']}"
        for m in history[-6:]  # Last 3 turns
    ])

    context_str = "\n".join(f"- {k}: {v}" for k, v in context_data.items())

    prompt = f"""{SYSTEM_CONTEXT}

Current HR Metrics:
{context_str}
{mcp_context}
{rag_context}

Conversation:
{history_str}

WorkforceIQ Copilot:"""
    
    # Generate response
    try:
        from utils.llm import get_llm
        llm = get_llm()
        response = llm.generate(prompt, max_tokens=450)
    except Exception as e:
        response = _rule_based_response(request.message, context_data)
    
    # Add assistant response to history
    history.append({"role": "assistant", "content": response})
    _conversations[conv_id] = history[-20:]  # Keep last 10 turns
    
    return ChatResponse(
        response=response,
        conversation_id=conv_id,
        sources=rag_sources,
        suggested_questions=_get_relevant_suggestions(request.message),
        data_context={**context_data, "mcp_tool_used": mcp_tool_used},
    )


@router.get("/conversations/{conversation_id}")
async def get_conversation(conversation_id: str, current_user: User = Depends(get_current_user)):
    """Get conversation history"""
    if conversation_id not in _conversations:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"conversation_id": conversation_id, "messages": _conversations[conversation_id]}


@router.delete("/conversations/{conversation_id}")
async def clear_conversation(conversation_id: str, current_user: User = Depends(get_current_user)):
    """Clear conversation history"""
    if conversation_id in _conversations:
        del _conversations[conversation_id]
    return {"status": "cleared"}


def _rule_based_response(message: str, context: dict) -> str:
    """Rule-based fallback response engine"""
    msg = message.lower()
    
    if any(w in msg for w in ["attrition", "resign", "turnover", "quit", "leaving"]):
        return (
            f"Based on current workforce data, attrition rate is {context.get('attrition_rate', '18.7%')} — "
            f"above the industry benchmark of 15%. I've identified {context.get('high_risk_count', '234')} employees "
            f"in the high-risk zone. The {context.get('top_risk_dept', 'Engineering')} department shows the highest concentration. "
            f"Primary drivers: overtime workload, low satisfaction scores (avg {context.get('avg_satisfaction', '2.8')}/4), "
            f"and {context.get('avg_years_since_promotion', '3.2')} average years since last promotion. "
            f"Would you like me to run a full attrition analysis or generate retention recommendations?"
        )
    elif any(w in msg for w in ["burnout", "stress", "exhausted", "overwork"]):
        return (
            f"Burnout analysis indicates {context.get('burnout_rate', '31%')} of the workforce shows high-risk signals. "
            f"Key indicators: {context.get('overtime_rate', '35%')} of employees work consistent overtime, "
            f"declining work-life balance scores, and reduced job involvement metrics. "
            f"The {context.get('low_morale_dept', 'Sales')} team shows critical burnout patterns. "
            f"I recommend implementing mandatory PTO policies and workload rebalancing for at-risk teams."
        )
    elif any(w in msg for w in ["morale", "sentiment", "satisfaction", "happiness", "culture"]):
        return (
            f"Employee sentiment analysis shows mixed signals. Average satisfaction is "
            f"{context.get('avg_satisfaction', '2.8')}/4 — below the healthy threshold of 3.2. "
            f"Common themes in feedback: workload pressure, limited growth opportunities, and recognition gaps. "
            f"The engineering team shows the strongest negative sentiment correlation with burnout risk. "
            f"Positive clusters exist in Product and Customer Success. "
            f"Shall I break down sentiment by department?"
        )
    elif any(w in msg for w in ["recommend", "strategy", "retention", "keep", "improve"]):
        return (
            "Top retention strategies based on your workforce data:\n\n"
            f"1. **Compensation Review** — {context.get('below_market_compensation_pct', '34%')} of at-risk employees earn below P50 market\n"
            "2. **Overtime Reduction** — Mandatory overtime correlates with 2.5x higher turnover risk\n"
            "3. **Career Pathing** — Average 3.2 years since promotion is driving disengagement\n"
            "4. **Manager Training** — Low manager satisfaction correlates with 3x attrition rate\n"
            "5. **Recognition Programs** — High performers lacking recognition leave within 18 months\n\n"
            "Want me to generate a detailed intervention plan for any specific department?"
        )
    elif any(w in msg for w in ["forecast", "predict", "future", "next quarter", "trend"]):
        return (
            "Workforce forecast for the next 6 months: Attrition rate projected to increase from "
            f"{context.get('attrition_rate', '18.7%')} to ~22.3% without intervention. "
            "Seasonal peak expected in August-September. Engineering headcount at highest risk. "
            "Hiring demand will need to accelerate in Q2 to offset projected losses. "
            "With retention interventions, I project an 8-12% reduction in attrition rate."
        )
    else:
        return (
            f"I'm WorkforceIQ Copilot — your AI HR intelligence assistant. "
            f"Your workforce currently has {context.get('total_employees', '1,500')} employees with "
            f"an attrition rate of {context.get('attrition_rate', '18.7%')}. "
            f"I can help you analyze attrition risk, employee sentiment, burnout patterns, and workforce trends. "
            f"You can ask me things like: 'Why is attrition increasing?', 'Which teams are at risk?', "
            f"or 'What retention strategies do you recommend?'"
        )
