import { useState, useEffect } from "react";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Brain, MessageSquare, AlertTriangle, Heart, Send, Loader2 } from "lucide-react";
import { apiUrl } from "../lib/api";

const DEPT_COLORS = ["#93c5fd", "#fca5a5", "#86efac", "#fcd34d", "#c4b5fd", "#67e8f9", "#f0abfc", "#fdba74"];

// Fallback data, used only if the backend is unreachable.
const mockDeptMorale = [
  { department: "Engineering", morale_score: 62, burnout_signal: true, color: "#93c5fd" },
  { department: "Sales", morale_score: 55, burnout_signal: true, color: "#fca5a5" },
  { department: "HR", morale_score: 78, burnout_signal: false, color: "#86efac" },
  { department: "Finance", morale_score: 70, burnout_signal: false, color: "#fcd34d" },
  { department: "Marketing", morale_score: 48, burnout_signal: true, color: "#c4b5fd" },
  { department: "Operations", morale_score: 66, burnout_signal: false, color: "#67e8f9" },
];

const mockTrends = Array.from({ length: 12 }, (_, i) => ({
  month: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][i],
  morale: 60 + Math.sin(i * 0.6) * 15 + Math.random() * 5,
  burnout: 35 + Math.cos(i * 0.5) * 10 + Math.random() * 5,
}));

// The backend returns morale_score on a 0-1 scale; older fallback paths use 0-100.
function moraleScoreOn100(result) {
  if (typeof result.morale_score === "number") {
    return Math.round(result.morale_score <= 1 ? result.morale_score * 100 : result.morale_score);
  }
  return Math.round((result.sentiment_score || 0) * 100);
}

const SentimentGauge = ({ score }) => {
  const angle = (score / 100) * 180 - 90;
  return (
    <div className="flex items-center justify-center">
      <svg viewBox="0 0 200 110" className="w-40">
        <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="#2d3748" strokeWidth="14" strokeLinecap="round" />
        <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="#6b7280" strokeWidth="14"
          strokeLinecap="round" strokeDasharray="251"
          strokeDashoffset={251 - (score / 100) * 251} style={{ transition: "stroke-dashoffset 1s ease" }} />
        <g transform={`rotate(${angle}, 100, 100)`}>
          <line x1="100" y1="100" x2="100" y2="30" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="100" cy="100" r="5" fill="white" />
        </g>
        <text x="100" y="108" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold">{score}</text>
      </svg>
    </div>
  );
};

export default function SentimentPage() {
  const [inputText, setInputText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [deptMorale, setDeptMorale] = useState(mockDeptMorale);
  const [trends, setTrends] = useState(mockTrends);

  useEffect(() => {
    fetch(apiUrl("/api/sentiment/department"), { credentials: "include" })
      .then(res => res.ok ? res.json() : Promise.reject(res.status))
      .then(data => {
        const mapped = (data.departments || []).map((d, i) => ({
          department: d.name,
          morale_score: Math.round(d.morale_score * 100),
          burnout_signal: d.burnout_signal > 0.5,
          color: DEPT_COLORS[i % DEPT_COLORS.length],
        }));
        if (mapped.length) setDeptMorale(mapped);
      })
      .catch(() => {});

    fetch(apiUrl("/api/sentiment/trends"), { credentials: "include" })
      .then(res => res.ok ? res.json() : Promise.reject(res.status))
      .then(data => {
        const mapped = (data.monthly_morale || []).map(m => ({
          month: m.month,
          morale: Math.round(m.morale * 100),
          burnout: Math.round((1 - m.morale) * 100),
        }));
        if (mapped.length) setTrends(mapped);
      })
      .catch(() => {});
  }, []);

  const analyzeText = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/sentiment/analyze"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text: inputText }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      const score = inputText.toLowerCase().includes("overwhelm") || inputText.toLowerCase().includes("stress") ? 28
        : inputText.toLowerCase().includes("love") || inputText.toLowerCase().includes("great") ? 82 : 55;
      setResult({
        sentiment: score >= 60 ? "positive" : score >= 40 ? "neutral" : "negative",
        sentiment_score: score / 100,
        emotions: { joy: score > 60 ? 0.6 : 0.1, sadness: score < 40 ? 0.5 : 0.1, neutral: 0.3 },
        burnout_signal: score < 40,
        disengagement_signal: score < 35,
        morale_score: score,
        flags: score < 40 ? ["Low morale detected", "Possible burnout risk"] : [],
      });
    }
    setLoading(false);
  };

  const radarData = deptMorale.map(d => ({ dept: d.department.substring(0, 4), score: d.morale_score }));

  return (
    <div className="p-6 space-y-5">
      <div className="page-header">
        <h1 className="page-title">Employee Sentiment</h1>
        <p className="text-sm text-white">DistilBERT and RoBERTa powered emotion analysis</p>
      </div>

      {/* Analyzer */}
      <div className="card p-5">
        <p className="text-sm font-medium text-white mb-3 flex items-center gap-2">
          <MessageSquare className="w-4 h-4" /> Analyze Employee Feedback
        </p>
        <textarea
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder="Paste employee feedback, survey response, or any text to analyze..."
          className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-sm text-white
                     placeholder-gray-500 resize-none focus:outline-none focus:border-gray-400 h-24"
        />
        <div className="flex justify-between items-center mt-3">
          <div className="flex gap-2 flex-wrap">
            {["I feel overwhelmed with the workload", "Love the team culture here!", "Not sure about my future here"].map(s => (
              <button key={s} onClick={() => setInputText(s)}
                className="text-xs px-2 py-1 rounded border border-gray-600 text-white hover:border-gray-400 transition-colors">
                {s.substring(0, 28)}…
              </button>
            ))}
          </div>
          <button onClick={analyzeText} disabled={loading || !inputText.trim()} className="btn-primary">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Analyze
          </button>
        </div>

        {result && (
          <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card p-4 text-center" style={{ background: "#131720" }}>
              <p className="text-xs text-white mb-2">Morale Score</p>
              <SentimentGauge score={moraleScoreOn100(result)} />
              <span className="text-sm font-medium text-white capitalize">{result.sentiment}</span>
            </div>
            <div className="card p-4" style={{ background: "#131720" }}>
              <p className="text-xs text-white mb-3">Detected Emotions</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(result.emotions || {}).map(([e, s]) => (
                  <span key={e} className="text-xs px-2 py-1 rounded border border-gray-600 text-white">
                    {e}: {(s * 100).toFixed(0)}%
                  </span>
                ))}
              </div>
              <div className="mt-3 space-y-1">
                {result.burnout_signal && (
                  <div className="flex items-center gap-2 text-xs text-white">
                    <AlertTriangle className="w-3 h-3" /> Burnout signal detected
                  </div>
                )}
                {result.disengagement_signal && (
                  <div className="flex items-center gap-2 text-xs text-white">
                    <AlertTriangle className="w-3 h-3" /> Disengagement risk
                  </div>
                )}
              </div>
            </div>
            <div className="card p-4" style={{ background: "#131720" }}>
              <p className="text-xs text-white mb-3">HR Flags</p>
              {(result.flags || []).length > 0 ? result.flags.map(f => (
                <div key={f} className="flex items-center gap-2 text-xs text-white mb-2">
                  <AlertTriangle className="w-3 h-3" /> {f}
                </div>
              )) : (
                <div className="flex items-center gap-2 text-xs text-white">
                  <Heart className="w-3 h-3" /> No critical flags
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Department Morale */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-5">
          <p className="text-sm font-medium text-white mb-4">Department Morale Scores</p>
          <div className="space-y-3">
            {deptMorale.map(d => (
              <div key={d.department}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white flex items-center gap-2">
                    {d.burnout_signal && <AlertTriangle className="w-3 h-3 text-white" />}
                    {d.department}
                  </span>
                  <span className="text-white">{d.morale_score}/100</span>
                </div>
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${d.morale_score}%`, backgroundColor: d.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <p className="text-sm font-medium text-white mb-4">Department Radar</p>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#2d3748" />
              <PolarAngleAxis dataKey="dept" tick={{ fill: "#ffffff", fontSize: 11 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} />
              <Radar dataKey="score" stroke="#93c5fd" fill="#93c5fd" fillOpacity={0.1} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Trends */}
      <div className="card p-5">
        <p className="text-sm font-medium text-white mb-4">12-Month Morale and Burnout Trends</p>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={trends}>
            <defs>
              <linearGradient id="moraleGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#93c5fd" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#93c5fd" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="burnoutGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#fca5a5" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#fca5a5" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="month" tick={{ fill: "#ffffff", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#ffffff", fontSize: 11 }} axisLine={false} tickLine={false} domain={[20, 90]} />
            <Tooltip contentStyle={{ background: "#1a1f2e", border: "1px solid #2d3748", borderRadius: 8, fontSize: 12, color: "#fff" }} />
            <Area type="monotone" dataKey="morale" stroke="#93c5fd" fill="url(#moraleGrad)" strokeWidth={2} name="Morale" />
            <Area type="monotone" dataKey="burnout" stroke="#fca5a5" fill="url(#burnoutGrad)" strokeWidth={2} name="Burnout Risk" strokeDasharray="4 4" />
          </AreaChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-2 justify-center text-xs text-white">
          <div className="flex items-center gap-1"><div className="w-3 h-0.5" style={{ background: "#93c5fd" }} /> Morale Score</div>
          <div className="flex items-center gap-1"><div className="w-3 h-0.5" style={{ borderTop: "2px dashed #fca5a5" }} /> Burnout Risk</div>
        </div>
      </div>
    </div>
  );
}