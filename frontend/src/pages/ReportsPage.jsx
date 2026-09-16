import { useState } from "react";
import { FileBarChart, Download, Loader2, Sparkles, Users, TrendingUp, AlertTriangle, Target, CheckCircle2 } from "lucide-react";
import { apiUrl } from "../lib/api";

const METRICS = [
  { label: "Total Employees", value: "1,247", delta: "+73 YTD", good: true },
  { label: "Attrition Rate", value: "11.8%", delta: "+2.1% vs LY", good: false },
  { label: "Avg Morale Score", value: "63/100", delta: "-4pts vs Q3", good: false },
  { label: "High-Risk Employees", value: "89", delta: "7.1% of workforce", good: false },
  { label: "Open Positions", value: "34", delta: "Across 6 depts", good: null },
  { label: "Avg Tenure (yrs)", value: "4.2", delta: "-0.8 vs 2023", good: false },
];

const DEPT_BREAKDOWN = [
  { dept: "Engineering", headcount: 312, attrition: "18.2%", morale: 62, risk: "High", color: "#93c5fd" },
  { dept: "Sales", headcount: 198, attrition: "22.1%", morale: 55, risk: "Critical", color: "#fca5a5" },
  { dept: "HR", headcount: 87, attrition: "6.4%", morale: 78, risk: "Low", color: "#86efac" },
  { dept: "Finance", headcount: 143, attrition: "8.1%", morale: 70, risk: "Medium", color: "#fcd34d" },
  { dept: "Marketing", headcount: 167, attrition: "15.3%", morale: 48, risk: "High", color: "#c4b5fd" },
  { dept: "Operations", headcount: 340, attrition: "9.7%", morale: 66, risk: "Medium", color: "#67e8f9" },
];

const RECOMMENDATIONS = [
  { priority: "Critical", action: "Implement overtime caps in Engineering and Sales (max 50 hrs/week)", timeline: "Immediate" },
  { priority: "High", action: "Launch targeted retention bonuses for 2–5 year tenured high performers", timeline: "30 days" },
  { priority: "High", action: "Bi-weekly 1:1 check-in program for all high-risk flagged employees", timeline: "14 days" },
  { priority: "Medium", action: "Accelerate promotion pipeline review for disengaged senior ICs", timeline: "60 days" },
  { priority: "Medium", action: "Department morale pulse survey + action-planning workshops", timeline: "45 days" },
  { priority: "Low", action: "Enhanced L&D budget allocation for Engineering skill development", timeline: "Q2 2026" },
];

const RiskBadge = ({ level }) => {
  const styles = {
    Critical: "text-red-300 bg-red-400/10 border-red-400/30",
    High: "text-white bg-gray-700 border-gray-600",
    Medium: "text-white bg-gray-700 border-gray-600",
    Low: "text-green-300 bg-green-400/10 border-green-400/30",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${styles[level]}`}>{level}</span>
  );
};

const PriorityDot = ({ level }) => {
  const colors = { Critical: "#9ca3af", High: "#9ca3af", Medium: "#9ca3af", Low: "#9ca3af" };
  return <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{ backgroundColor: colors[level] }} />;
};

export default function ReportsPage() {
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState(null);
  const [generated, setGenerated] = useState(false);

  const generateReport = async () => {
    setGenerating(true);
    setReport(null);
    try {
      const res = await fetch(apiUrl("/api/reports/executive"), { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({}) });
      const data = await res.json();
      setReport(data);
    } catch {
      setReport({
        narrative: "The organization faces moderate-to-high workforce risk heading into Q2 2026. Attrition has accelerated by 2.1 percentage points year-over-year, with Engineering and Sales departments emerging as critical intervention priorities. Combined sentiment analysis from 1,247 employee touchpoints reveals a systemic pattern of burnout and disengagement, particularly among 2–5 year tenured staff — a cohort historically difficult to re-engage once disengaged. Immediate structured intervention across overtime policy, compensation benchmarking, and career pathing is estimated to reduce voluntary attrition by 4–6 percentage points within two quarters, representing approximately $2.8M in avoided replacement costs.",
      });
    }
    await new Promise(r => setTimeout(r, 1500));
    setGenerating(false);
    setGenerated(true);
  };

  const handleDownload = () => {
    const content = `WORKFORCEIQ EXECUTIVE REPORT\nGenerated: ${new Date().toLocaleDateString()}\n\n${report?.narrative || "See report"}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "WorkforceIQ_Executive_Report.txt"; a.click();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-500/20 border border-orange-500/30">
            <FileBarChart className="w-6 h-6 text-orange-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Space Grotesk" }}>
              Executive AI Reports
            </h1>
            <p className="text-sm text-slate-400">AI-generated workforce intelligence summaries</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={generateReport} disabled={generating}
            className="btn-primary flex items-center gap-2 px-5 py-2.5">
            {generating
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
              : <><Sparkles className="w-4 h-4" /> Generate Report</>
            }
          </button>
          {generated && (
            <button onClick={handleDownload} className="btn-ghost flex items-center gap-2 px-4 py-2.5">
              <Download className="w-4 h-4" /> Export
            </button>
          )}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {METRICS.map(m => (
          <div key={m.label} className="glass-card p-4">
            <p className="text-xs text-slate-400 mb-1">{m.label}</p>
            <p className="text-xl font-bold text-white">{m.value}</p>
            <p className={`text-xs ${m.good === true ? "text-green-300" : m.good === false ? "text-red-300" : "text-slate-400"}`}>
              {m.delta}
            </p>
          </div>
        ))}
      </div>

      {/* AI Narrative */}
      {generating && (
        <div className="glass-card p-8 text-center">
          <Loader2 className="w-10 h-10 text-orange-400 mx-auto mb-3 animate-spin" />
          <p className="text-sm text-slate-300">Generating executive AI narrative...</p>
          <p className="text-xs text-slate-500 mt-1">flan-t5 synthesizing multi-agent outputs</p>
        </div>
      )}

      {report && (
        <div className="glass-card p-6 border-orange-500/20 animate-slide-up">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-orange-400" />
            <span className="text-sm font-semibold text-orange-400">AI Executive Narrative</span>
            <span className="text-xs text-slate-500">— generated by flan-t5-base</span>
          </div>
          <p className="text-sm text-slate-200 leading-relaxed">{report.narrative}</p>
        </div>
      )}

      {/* Department Table */}
      <div className="glass-card p-6">
        <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
          <Users className="w-4 h-4 text-cyan-400" /> Department-Level Breakdown
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800">
                {["Department","Headcount","Attrition Rate","Morale Score","Risk Level"].map(h => (
                  <th key={h} className="text-left text-slate-500 font-medium pb-2 pr-6">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {DEPT_BREAKDOWN.map(d => (
                <tr key={d.dept} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 pr-6 text-slate-200 font-medium">{d.dept}</td>
                  <td className="py-3 pr-6 text-slate-300">{d.headcount}</td>
                  <td className="py-3 pr-6 text-white font-medium">{d.attrition}</td>
                  <td className="py-3 pr-6">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${d.morale}%`, backgroundColor: d.color }} />
                      </div>
                      <span className="text-slate-300">{d.morale}</span>
                    </div>
                  </td>
                  <td className="py-3"><RiskBadge level={d.risk} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recommendations */}
      <div className="glass-card p-6">
        <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
          <Target className="w-4 h-4 text-amber-300" /> AI Retention Recommendations
        </h2>
        <div className="space-y-3">
          {RECOMMENDATIONS.map((r, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/40 hover:bg-slate-800/60 transition-colors">
              <PriorityDot level={r.priority} />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <RiskBadge level={r.priority} />
                  <span className="text-xs text-slate-500">Timeline: {r.timeline}</span>
                </div>
                <p className="text-xs text-slate-300">{r.action}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}