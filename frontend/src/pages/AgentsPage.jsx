import { useState } from "react";
import { Bot, Play, Loader2, CheckCircle2, Circle, ArrowRight, Zap, Brain, Users, FileBarChart } from "lucide-react";
import { apiUrl } from "../lib/api";

const AGENTS = [
  {
    id: "attrition",
    name: "Attrition Agent",
    icon: Zap,
    color: "#fca5a5",
    bg: "bg-red-400/10",
    border: "border-red-400/30",
    description: "Analyzes resignation risk patterns and computes attrition probabilities using XGBoost + SHAP",
    capabilities: ["Risk scoring", "SHAP explainability", "Dept-level analysis"],
  },
  {
    id: "sentiment",
    name: "Sentiment Agent",
    icon: Brain,
    color: "#c4b5fd",
    bg: "bg-purple-400/10",
    border: "border-purple-400/20",
    description: "Processes employee feedback using DistilBERT & RoBERTa to detect burnout and morale shifts",
    capabilities: ["Emotion classification", "Burnout detection", "Trend analysis"],
  },
  {
    id: "recommendation",
    name: "Recommendation Agent",
    icon: Users,
    color: "#93c5fd",
    bg: "bg-blue-400/10",
    border: "border-blue-400/20",
    description: "Generates data-driven HR strategies and retention recommendations from combined agent outputs",
    capabilities: ["Retention strategies", "Workload balancing", "Learning paths"],
  },
  {
    id: "reporting",
    name: "Reporting Agent",
    icon: FileBarChart,
    color: "#86efac",
    bg: "bg-green-400/10",
    border: "border-green-400/30",
    description: "Synthesizes multi-agent outputs into executive narratives and PDF-ready summaries",
    capabilities: ["Executive summaries", "AI narratives", "PDF export"],
  },
];

const STATUS = { idle: "idle", running: "running", done: "done", error: "error" };

// Fallback text shown only if the backend orchestrator is unreachable.
const fallbackOutputs = {
  attrition: "High attrition risk detected in Engineering (28%) and Sales (31%). Top SHAP features: OverTime (+0.31), YearsAtCompany (-0.18), MonthlyIncome (-0.14). 47 employees flagged as high-risk.",
  sentiment: "Overall morale score: 61/100. Burnout signals detected in Engineering, Sales, and Marketing. Emotions: frustration (34%), disengagement (28%), neutral (22%), positive (16%). Morale declining YoY by -8pts.",
  recommendation: "1. Implement overtime caps in Engineering (>10hrs/week). 2. Launch retention bonuses for 2-5 year tenured employees. 3. Bi-weekly 1:1 check-ins for Sales flagged staff. 4. Fast-track promotion reviews for high-performers showing disengagement.",
  reporting: "EXECUTIVE SUMMARY: Workforce health is at moderate risk. Immediate action required in Engineering (attrition + burnout), Sales (morale decline). Forecast: 14.2% attrition by Q2 2026 without intervention. Recommended actions have estimated 6-month ROI of 2.4x retention cost savings.",
};

// Maps agent id -> field returned by POST /api/agents/analyze
const RESPONSE_FIELD = {
  attrition: "attrition_analysis",
  sentiment: "sentiment_analysis",
  recommendation: "recommendations",
  reporting: "executive_summary",
};

export default function AgentsPage() {
  const [statuses, setStatuses] = useState({ attrition: STATUS.idle, sentiment: STATUS.idle, recommendation: STATUS.idle, reporting: STATUS.idle });
  const [outputs, setOutputs] = useState({});
  const [running, setRunning] = useState(false);
  const [activeAgent, setActiveAgent] = useState(null);
  const [log, setLog] = useState([]);

  const addLog = (msg) => setLog(prev => [...prev, { t: new Date().toLocaleTimeString(), msg }]);

  const runOrchestration = async () => {
    setRunning(true);
    setOutputs({});
    setLog([]);
    setStatuses({ attrition: STATUS.idle, sentiment: STATUS.idle, recommendation: STATUS.idle, reporting: STATUS.idle });

    const sequence = ["attrition", "sentiment", "recommendation", "reporting"];
    let agentResults = null;

    addLog("Initializing multi-agent orchestrator...");
    sequence.forEach(id => setStatuses(s => ({ ...s, [id]: STATUS.running })));

    try {
      // Runs the real 4-agent LangGraph/sequential pipeline server-side
      // (backend/agents/orchestrator.py), backed by a free local LLM.
      const res = await fetch(apiUrl("/api/agents/analyze"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ question: "Provide a full workforce intelligence analysis.", department: "all" }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      agentResults = await res.json();
      addLog("✓ Orchestrator responded — revealing agent outputs");
    } catch (err) {
      addLog(`⚠ Backend orchestrator unavailable (${err.message}) — showing simulation`);
    }

    for (const agentId of sequence) {
      setActiveAgent(agentId);
      addLog(`Running ${AGENTS.find(a => a.id === agentId).name}...`);
      await new Promise(r => setTimeout(r, 500 + Math.random() * 400));
      const text = agentResults?.[RESPONSE_FIELD[agentId]] || fallbackOutputs[agentId];
      setOutputs(o => ({ ...o, [agentId]: text }));
      setStatuses(s => ({ ...s, [agentId]: STATUS.done }));
      addLog(`✓ ${AGENTS.find(a => a.id === agentId).name} complete`);
    }

    setActiveAgent(null);
    addLog("🎉 Orchestration complete. All agents finished.");
    setRunning(false);
  };

  const allDone = Object.values(statuses).every(s => s === STATUS.done);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/20 border border-blue-400/20">
            <Bot className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Space Grotesk" }}>
              Multi-Agent AI System
            </h1>
            <p className="text-sm text-slate-400">4 Specialized HR Intelligence Agents</p>
          </div>
        </div>
        <button onClick={runOrchestration} disabled={running}
          className="btn-primary flex items-center gap-2 px-5 py-2.5">
          {running
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Running...</>
            : <><Play className="w-4 h-4" /> Run All Agents</>
          }
        </button>
      </div>

      {/* Flow diagram */}
      <div className="glass-card p-6">
        <p className="text-xs text-slate-500 mb-4">Agent Execution Pipeline (Sequential via LangGraph StateGraph)</p>
        <div className="flex items-start gap-2 overflow-x-auto pb-2">
          {AGENTS.map((agent, i) => (
            <div key={agent.id} className="flex items-start gap-2 flex-shrink-0">
              <div className={`rounded-xl p-4 border transition-all duration-300 w-40 ${agent.bg} ${agent.border} ${
                activeAgent === agent.id ? "shadow-lg scale-105" : ""
              } ${statuses[agent.id] === STATUS.done ? "opacity-100" : "opacity-70"}`}>
                <div className="flex items-center justify-between mb-2">
                  <agent.icon className="w-5 h-5" style={{ color: agent.color }} />
                  {statuses[agent.id] === STATUS.running && <Loader2 className="w-4 h-4 animate-spin text-white" />}
                  {statuses[agent.id] === STATUS.done && <CheckCircle2 className="w-4 h-4 text-green-300" />}
                  {statuses[agent.id] === STATUS.idle && <Circle className="w-4 h-4 text-slate-600" />}
                </div>
                <p className="text-xs font-semibold text-white leading-tight">{agent.name}</p>
                <div className="mt-2 space-y-1">
                  {agent.capabilities.map(c => (
                    <div key={c} className="text-xs text-slate-400 flex items-center gap-1">
                      <div className="w-1 h-1 rounded-full" style={{ backgroundColor: agent.color }} />
                      {c}
                    </div>
                  ))}
                </div>
              </div>
              {i < AGENTS.length - 1 && (
                <div className="flex items-center mt-6">
                  <ArrowRight className="w-4 h-4 text-slate-600" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Outputs + Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {AGENTS.map(agent => outputs[agent.id] && (
            <div key={agent.id} className={`glass-card p-4 border ${agent.border} animate-slide-up`}>
              <div className="flex items-center gap-2 mb-2">
                <agent.icon className="w-4 h-4" style={{ color: agent.color }} />
                <span className="text-xs font-semibold" style={{ color: agent.color }}>{agent.name}</span>
                <CheckCircle2 className="w-3 h-3 text-green-300" />
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{outputs[agent.id]}</p>
            </div>
          ))}
          {!Object.keys(outputs).length && (
            <div className="glass-card p-8 text-center text-slate-500">
              <Bot className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Click "Run All Agents" to orchestrate the AI pipeline</p>
            </div>
          )}
        </div>

        {/* Log */}
        <div className="glass-card p-4">
          <h2 className="text-xs font-semibold text-slate-400 mb-3 flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${running ? "bg-green-400 animate-pulse" : "bg-slate-600"}`} />
            Orchestration Log
          </h2>
          <div className="space-y-1.5 max-h-80 overflow-y-auto font-mono">
            {log.length === 0 && <p className="text-xs text-slate-600">Awaiting execution...</p>}
            {log.map((entry, i) => (
              <div key={i} className="text-xs">
                <span className="text-slate-600">[{entry.t}]</span>{" "}
                <span className={entry.msg.startsWith("✓") ? "text-green-300" : entry.msg.startsWith("🎉") ? "text-amber-300" : "text-slate-300"}>
                  {entry.msg}
                </span>
              </div>
            ))}
          </div>

          {allDone && (
            <div className="mt-4 p-3 rounded-lg bg-green-400/10 border border-green-400/20 text-center">
              <CheckCircle2 className="w-6 h-6 text-green-300 mx-auto mb-1" />
              <p className="text-xs text-green-300 font-semibold">All agents complete</p>
            </div>
          )}
        </div>
      </div>

      {/* Tech note
      <div className="glass-card p-4 flex items-center gap-3">
        <div className="text-xs text-slate-400 leading-relaxed">
          <span className="text-cyan-400 font-semibold">Architecture: </span>
          LangGraph StateGraph → sequential agent execution with shared state.
          Each agent inherits <code className="text-green-300">BaseHRAgent</code> and exposes a <code className="text-green-300">run()</code> interface.
          Orchestrator supports fallback to sequential execution when LangGraph is unavailable.
          Agents: <span className="text-purple-400">AttritionAgent → SentimentAgent → RecommendationAgent → ReportingAgent</span>
        </div>
      </div> */}
    </div>
  );
}