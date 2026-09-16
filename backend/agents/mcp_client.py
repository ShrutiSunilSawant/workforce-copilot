"""
WorkforceIQ MCP Client
Calls tools exposed by the MCP server using the FastMCP client,
which handles session initialization and the streamable-http protocol.
"""

import os
from loguru import logger

MCP_SERVER_URL = os.environ.get("MCP_SERVER_URL", "http://127.0.0.1:8001/mcp")


def _call_tool(tool_name: str, arguments: dict) -> dict:
    """Call a tool on the MCP server using the FastMCP client."""
    try:
        from fastmcp import Client
        import asyncio

        async def _run():
            async with Client(MCP_SERVER_URL) as client:
                result = await client.call_tool(tool_name, arguments)
                if result.is_error:
                    return {"error": str(result.content)}
                if result.data is not None:
                    return result.data
                if result.content:
                    import json
                    try:
                        return json.loads(result.content[0].text)
                    except Exception:
                        return {"text": result.content[0].text}
                return {}

        return asyncio.run(_run())
    except Exception as e:
        logger.warning(f"MCP tool [{tool_name}] failed: {e}")
        return {"error": str(e)}


# ── Public helpers ──────────────────────────────────────────────────────────

def mcp_predict_attrition(department: str, age: int, monthly_income: int,
                           years_at_company: int, job_satisfaction: int,
                           work_life_balance: int, over_time: str,
                           years_since_last_promotion: int,
                           environment_satisfaction: int) -> dict:
    return _call_tool("predict_attrition", {
        "department": department,
        "age": age,
        "monthly_income": monthly_income,
        "years_at_company": years_at_company,
        "job_satisfaction": job_satisfaction,
        "work_life_balance": work_life_balance,
        "over_time": over_time,
        "years_since_last_promotion": years_since_last_promotion,
        "environment_satisfaction": environment_satisfaction,
    })


def mcp_analyze_sentiment(text: str, department: str = "") -> dict:
    return _call_tool("analyze_sentiment", {"text": text, "department": department})


def mcp_query_hr_policy(question: str) -> dict:
    return _call_tool("query_hr_policy", {"question": question})


def mcp_get_workforce_stats() -> dict:
    return _call_tool("get_workforce_stats", {})


def mcp_get_department_breakdown(department: str = "") -> dict:
    return _call_tool("get_department_breakdown", {"department": department})


def detect_intent(message: str) -> str:
    """Map a user message to the most relevant MCP tool."""
    msg = message.lower()
    if any(w in msg for w in ["policy", "leave", "benefit", "remote", "insurance", "entitle", "eligib"]):
        return "query_hr_policy"
    if any(w in msg for w in ["sentiment", "morale", "feedback", "burnout", "stress", "feel", "emotion"]):
        return "analyze_sentiment"
    if any(w in msg for w in ["department", "engineering", "sales", "finance", "breakdown", "by dept"]):
        return "get_department_breakdown"
    if any(w in msg for w in ["attrition", "resign", "turnover", "risk", "leaving", "quit", "flight"]):
        return "get_workforce_stats"
    return "get_workforce_stats"


def call_relevant_tool(message: str, department_filter: str = "") -> dict:
    """
    Detect intent from a chat message and call the most relevant MCP tool.
    Returns structured tool result for injection into the LLM prompt.
    """
    intent = detect_intent(message)
    logger.info(f"MCP intent: {intent}")

    if intent == "query_hr_policy":
        return {"tool": intent, "result": mcp_query_hr_policy(message)}
    elif intent == "analyze_sentiment":
        return {"tool": intent, "result": mcp_analyze_sentiment(message, department_filter)}
    elif intent == "get_department_breakdown":
        return {"tool": intent, "result": mcp_get_department_breakdown(department_filter)}
    else:
        return {"tool": intent, "result": mcp_get_workforce_stats()}
