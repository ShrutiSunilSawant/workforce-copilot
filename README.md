# 🧠 WorkforceIQ — AI-Powered HR Intelligence Copilot

> **An enterprise-grade GenAI platform for HR analytics, attrition prediction, employee sentiment analysis, and conversational workforce intelligence.**

[![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-green.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg)](https://reactjs.org)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Free Stack](https://img.shields.io/badge/Stack-100%25%20Free%20%26%20Open%20Source-brightgreen.svg)]()

---

## 🎯 What is WorkforceIQ?

WorkforceIQ is a **"ChatGPT for HR Analytics"** — a full-stack AI platform that helps HR leaders make data-driven decisions using:

- 🤖 **Conversational AI Copilot** — ask natural language questions about your workforce
- 🔮 **Attrition Prediction** — ML models with SHAP explainability
- 💬 **Sentiment Analysis** — DistilBERT/RoBERTa-powered employee feedback analysis
- 📚 **RAG Document Assistant** — upload HR policies, get instant answers
- 🤝 **Multi-Agent AI System** — specialized CrewAI agents for different HR domains
- 📈 **Workforce Forecasting** — Prophet/ARIMA time series predictions
- 📊 **AI-Generated Insights** — LLM-powered executive summaries

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        WORKFORCEIQ                               │
│                                                                  │
│  ┌──────────┐    ┌──────────────────────────────────────────┐   │
│  │  React   │◄──►│              FastAPI Backend              │   │
│  │ Frontend │    │                                           │   │
│  │          │    │  ┌──────────┐  ┌──────────┐  ┌───────┐  │   │
│  │ Tailwind │    │  │  ML API  │  │  NLP API │  │RAG API│  │   │
│  │ Recharts │    │  │ XGBoost  │  │DistilBERT│  │ChromaDB│ │   │
│  └──────────┘    │  │LightGBM  │  │ RoBERTa  │  │ FAISS │  │   │
│                  │  └──────────┘  └──────────┘  └───────┘  │   │
│                  │                                           │   │
│                  │  ┌──────────────────────────────────┐    │   │
│                  │  │      Multi-Agent AI System        │    │   │
│                  │  │  ┌──────────┐  ┌──────────────┐  │    │   │
│                  │  │  │Attrition │  │  Sentiment   │  │    │   │
│                  │  │  │  Agent   │  │    Agent     │  │    │   │
│                  │  │  ├──────────┤  ├──────────────┤  │    │   │
│                  │  │  │Recommend │  │  Reporting   │  │    │   │
│                  │  │  │  Agent   │  │    Agent     │  │    │   │
│                  │  │  └──────────┘  └──────────────┘  │    │   │
│                  │  └──────────────────────────────────┘    │   │
│                  │                                           │   │
│                  │  ┌──────────────────────────────────┐    │   │
│                  │  │         Free LLMs (HuggingFace)  │    │   │
│                  │  │  flan-t5-base | phi-2 | TinyLlama │    │   │
│                  │  └──────────────────────────────────┘    │   │
│                  └──────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐                  │
│  │PostgreSQL│    │ ChromaDB │    │   FAISS  │                   │
│  │  SQLite  │    │ VectorDB │    │  Index   │                   │
│  └──────────┘    └──────────┘    └──────────┘                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack (100% Free & Open Source)

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Tailwind CSS, Recharts |
| **Backend** | FastAPI, Python 3.10+ |
| **Database** | SQLite (dev) / PostgreSQL (prod) |
| **ML Models** | XGBoost, LightGBM, Scikit-learn, SHAP |
| **NLP/Transformers** | DistilBERT, RoBERTa, Sentence-Transformers |
| **LLMs** | google/flan-t5-base, TinyLlama, microsoft/phi-2 |
| **RAG** | LangChain, ChromaDB, FAISS |
| **Agents** | LangGraph (CrewAI-compatible) |
| **Forecasting** | Prophet, ARIMA (statsmodels) |
| **Embeddings** | sentence-transformers/all-MiniLM-L6-v2 |
| **Deployment** | Vercel (frontend), Render (backend), HF Spaces |

---

## 📁 Project Structure

```
workforce-copilot/
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Route-level pages
│   │   ├── hooks/          # Custom React hooks
│   │   └── utils/          # API clients & helpers
│   ├── package.json
│   └── tailwind.config.js
│
├── backend/                # FastAPI application
│   ├── main.py             # App entrypoint
│   ├── api/                # Route handlers
│   │   ├── chatbot.py      # AI Copilot endpoints
│   │   ├── attrition.py    # ML prediction endpoints
│   │   ├── sentiment.py    # NLP analysis endpoints
│   │   ├── rag.py          # Document Q&A endpoints
│   │   ├── forecast.py     # Time series endpoints
│   │   └── reports.py      # Executive report endpoints
│   ├── models/             # ML model training & inference
│   │   ├── attrition_model.py
│   │   ├── sentiment_model.py
│   │   └── forecast_model.py
│   ├── agents/             # Multi-agent AI system
│   │   ├── attrition_agent.py
│   │   ├── sentiment_agent.py
│   │   ├── recommendation_agent.py
│   │   └── reporting_agent.py
│   ├── rag/                # RAG pipeline
│   │   ├── embeddings.py
│   │   ├── vector_store.py
│   │   ├── retriever.py
│   │   └── pipeline.py
│   └── utils/
│       ├── llm.py          # Free LLM wrappers
│       ├── data_loader.py
│       └── prompts.py
│
├── datasets/               # HR datasets
│   ├── ibm_hr_attrition.csv
│   └── synthetic_hr_data.py
│
├── vector_db/              # ChromaDB persistent storage
├── reports/                # Generated PDF reports
├── docs/                   # API documentation
│   └── api_reference.md
├── requirements.txt
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- 8GB RAM (for local LLMs)

### 1. Clone & Setup Backend

```bash
git clone https://github.com/yourusername/workforce-copilot
cd workforce-copilot

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Generate synthetic dataset
python datasets/synthetic_hr_data.py

# Train ML models
python backend/models/attrition_model.py

# Start backend
cd backend
uvicorn main:app --reload --port 8000
```

### 2. Setup Frontend

```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:5173
```

### 3. Access the Platform

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |

---

## 🧠 Core AI Features

### 1. AI HR Copilot
Ask natural language questions:
- *"Which departments have the highest attrition risk?"*
- *"What's causing burnout in Engineering?"*
- *"Suggest retention strategies for Sales team"*

### 2. Attrition Prediction
- XGBoost + LightGBM ensemble
- SHAP feature importance
- Probability scores + confidence intervals
- AI-generated explanations

### 3. Sentiment Analysis
- DistilBERT fine-tuned on employee feedback
- Department-level morale trends
- Burnout signal detection

### 4. RAG Document Assistant
- Upload HR policies, handbooks, PDFs
- Semantic search with ChromaDB
- LLM-powered answers with citations

### 5. Multi-Agent System
Four specialized AI agents that collaborate:
- **Attrition Agent** → resignation risk analysis
- **Sentiment Agent** → morale & burnout detection
- **Recommendation Agent** → retention strategies
- **Reporting Agent** → executive summaries

### 6. Workforce Forecasting
- Prophet for attrition trends
- ARIMA for headcount forecasting
- Burnout spike prediction

---

## 📡 API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat` | POST | AI Copilot conversation |
| `/api/predict/attrition` | POST | Employee attrition risk |
| `/api/predict/bulk` | POST | Bulk employee scoring |
| `/api/sentiment/analyze` | POST | Text sentiment analysis |
| `/api/sentiment/department` | GET | Department morale scores |
| `/api/rag/upload` | POST | Upload HR document |
| `/api/rag/query` | POST | Ask document questions |
| `/api/forecast/attrition` | GET | Attrition forecasting |
| `/api/forecast/headcount` | GET | Headcount prediction |
| `/api/insights/generate` | POST | AI workforce insights |
| `/api/reports/executive` | POST | Generate PDF report |
| `/api/agents/analyze` | POST | Multi-agent analysis |

Full API docs at: `http://localhost:8000/docs`

---

## 🌐 Deployment

### Render (Backend)
```bash
# render.yaml is included in repo
# Connect GitHub repo to Render
# Set environment variables in Render dashboard
```

### Vercel (Frontend)
```bash
cd frontend
vercel deploy
```

### Hugging Face Spaces
The entire app can be deployed as a Gradio demo on HF Spaces (free tier).

---

## 📊 Dataset

Using the **IBM HR Analytics Employee Attrition Dataset** (open-source, Kaggle):
- 1,470 employee records
- 35 features (demographics, job info, satisfaction scores)
- Synthetic extensions for richer scenarios

---

## 🤝 Portfolio Highlights

This project demonstrates:
- ✅ **LLM Engineering** — prompt engineering, flan-t5, phi-2 integration
- ✅ **RAG Pipelines** — ChromaDB + sentence-transformers + LangChain
- ✅ **NLP/Transformers** — DistilBERT, RoBERTa sentiment analysis
- ✅ **Predictive AI** — XGBoost, LightGBM, SHAP explainability
- ✅ **Agentic AI** — LangGraph multi-agent orchestration
- ✅ **Semantic Search** — vector embeddings, similarity retrieval
- ✅ **Time Series** — Prophet, ARIMA forecasting
- ✅ **Full-Stack AI** — React + FastAPI + ML + LLMs
- ✅ **Production Quality** — modular, documented, deployable

---

## 📄 License

MIT License — free to use for portfolio, learning, and commercial projects.

---

*Built with ❤️ using 100% free and open-source AI tools*
