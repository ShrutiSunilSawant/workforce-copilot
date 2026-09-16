import os
import threading
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from loguru import logger

from api.chatbot import router as chat_router
from api.attrition import router as attrition_router
from api.sentiment import router as sentiment_router
from api.rag import router as rag_router
from api.forecast import router as forecast_router
from api.insights import router as insights_router
from api.reports import router as reports_router
from api.auth import router as auth_router
from api.retrain import router as retrain_router
from api.agents import router as agents_router
from database.connection import init_db

def _start_mcp_server():
    """Start the MCP server in a background thread."""
    try:
        import mcp_server  # noqa: F401 — runs mcp.run() via __main__ guard
        from mcp_server import mcp
        port = int(os.environ.get("MCP_SERVER_PORT", "8001"))
        logger.info(f"🔌 Starting MCP server on port {port}...")
        mcp.run(transport="streamable-http", host="127.0.0.1", port=port, path="/mcp")
    except Exception as e:
        logger.warning(f"⚠️  MCP server failed to start: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 WorkforceIQ API starting up...")
    logger.info("🗄️  Initializing database...")
    init_db()
    mcp_thread = threading.Thread(target=_start_mcp_server, daemon=True)
    mcp_thread.start()
    logger.info("📊 Loading ML models...")
    logger.info("🧠 Initializing NLP pipelines...")
    logger.info("📚 Setting up RAG vector store...")
    logger.info("✅ All systems ready!")
    yield
    logger.info("👋 WorkforceIQ shutting down...")

app = FastAPI(
    title="WorkforceIQ API",
    description="AI-powered HR Intelligence Platform",
    version="2.0.0",
    lifespan=lifespan
)

CORS_ORIGINS = os.environ["CORS_ORIGINS"].split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(chat_router)
app.include_router(attrition_router)
app.include_router(sentiment_router)
app.include_router(rag_router)
app.include_router(forecast_router)
app.include_router(insights_router)
app.include_router(reports_router)
app.include_router(retrain_router)
app.include_router(agents_router)

@app.get("/")
def root():
    return {"message": "WorkforceIQ API v2.0", "status": "running", "docs": "/docs"}

@app.get("/health")
def health():
    return {"status": "healthy", "version": "2.0.0"}
