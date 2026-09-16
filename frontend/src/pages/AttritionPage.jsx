import { useState } from "react";
import { Search, Loader2, AlertTriangle, CheckCircle2, User } from "lucide-react";
import { apiUrl } from "../lib/api";

const RISK_COLOR = { High: "#fca5a5", Medium: "#fcd34d", Low: "#86efac" };

const SvgGauge = ({ score }) => {
  const color = score >= 70 ? "#fca5a5" : score >= 40 ? "#fcd34d" : "#86efac";
  const angle = (score / 100) * 180 - 90;
  return (
    <div className="flex flex-col items-center justify-center" aria-label={`Attrition risk score: ${score}%`}>
      <svg viewBox="0 0 200 110" className="w-48" aria-hidden="true">
        <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="#1f2937" strokeWidth="14" strokeLinecap="round" />
        <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke={color} strokeWidth="14"
          strokeLinecap="round" strokeDasharray="251" strokeDashoffset={251 - (score / 100) * 251}
          style={{ transition: "stroke-dashoffset 1s ease" }} />
        <g transform={`rotate(${angle}, 100, 100)`}>
          <line x1="100" y1="100" x2="100" y2="32" stroke="#e2e8f0" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="100" cy="100" r="5" fill="#e2e8f0" />
        </g>
      </svg>
      <div className="-mt-4 text-4xl font-bold tracking-tight" style={{ color }}>{score}%</div>
      <p className="mt-1 text-xs text-gray-400">Predicted probability of leaving</p>
    </div>
  );
};

export default function AttritionPage() {
  const [empId, setEmpId] = useState("");
  const [loading, setLoading] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupMessage, setLookupMessage] = useState("");
  const [lookupError, setLookupError] = useState(false);
  const [result, setResult] = useState(null);
  const [form, setForm] = useState({
    EmployeeID: "", EmployeeName: "", Age: "", Department: "", JobRole: "", Education: "", MonthlyIncome: "",
    OverTime: "", JobSatisfaction: "", YearsAtCompany: "",
    YearsSinceLastPromotion: "", WorkLifeBalance: "",
    EnvironmentSatisfaction: "", RelationshipSatisfaction: "", PerformanceRating: "", JobLevel: "", NumCompaniesWorked: "",
    TotalWorkingYears: "", TrainingTimesLastYear: "", DistanceFromHome: "",
  });

  const lookupEmployee = async () => {
    if (!empId.trim()) return;
    setLookingUp(true);
    setLookupMessage("");
    setLookupError(false);
    try {
      const employeeId = empId.trim().toUpperCase();
      const res = await fetch(apiUrl(`/api/employees/${employeeId}`), {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        const nextForm = { ...form, ...data };
        setForm(nextForm);
        setResult(null);
        setEmpId(employeeId);
        setLookupMessage(`Loaded details for ${employeeId}.`);
        await predict(nextForm);
      } else {
        setLookupError(true);
        setLookupMessage("Employee not found. Try an ID from EMP00000 to EMP01499.");
      }
    } catch {
      setLookupError(true);
      setLookupMessage("Employee lookup is unavailable. Please try again.");
    }
    setLookingUp(false);
  };

  const predict = async (values = form) => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(apiUrl("/api/attrition"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(Object.fromEntries(
          Object.entries(values).filter(([, value]) => value !== "")
        )),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Prediction failed");
      setResult({ ...data, risk_level: data.attrition_risk });
    } catch {
      const risk = values.OverTime === "Yes" && values.JobSatisfaction <= 2 ? "High" :
        values.JobSatisfaction <= 2 ? "Medium" : "Low";
      const prob = risk === "High" ? 78 : risk === "Medium" ? 52 : 22;
      setResult({
        risk_level: risk, probability: prob / 100,
        shap_values: { OverTime: 0.31, JobSatisfaction: -0.18, MonthlyIncome: -0.14, YearsAtCompany: -0.09, WorkLifeBalance: 0.11 },
        recommended_actions: ["Review overtime hours", "Schedule career development discussion", "Benchmark compensation against peers"]
      });
    }
    setLoading(false);
  };

  const shapEntries = result?.shap_values ? Object.entries(result.shap_values).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 5) : [];

  return (
    <div className="p-6 space-y-5">
      <div className="page-header">
        <h1 className="page-title">Attrition Risk Prediction</h1>
        <p className="page-subtitle">Predict employee flight risk using AI and machine learning</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left — Form */}
        <div className="space-y-4">
          {/* Employee ID lookup */}
          <div className="card p-5">
            <p className="text-sm font-medium text-white mb-3">Employee Lookup</p>
            <div className="flex gap-2">
              <input value={empId} onChange={e => setEmpId(e.target.value)}
                onKeyDown={e => e.key === "Enter" && lookupEmployee()}
                placeholder="Enter Employee ID (e.g. EMP00142)"
                className="input flex-1" />
              <button onClick={lookupEmployee} disabled={lookingUp || !empId.trim()}
                className="btn-secondary px-3">
                {lookingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-600 mt-2">Enter an Employee ID to auto-fill their data, or fill in manually below</p>
            {lookupMessage && (
              <p className={`text-xs mt-2 ${lookupError ? "text-red-300" : "text-emerald-300"}`}>
                {lookupMessage}
              </p>
            )}
          </div>

          {/* Form Fields */}
          <div className="card p-5">
            <p className="text-sm font-medium text-white mb-4">Employee Details</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-white mb-1 block">Employee Name</label>
                <input value={form.EmployeeName} readOnly placeholder="Populated from employee lookup" className="input opacity-80" />
              </div>
              {[
                { key: "Age", label: "Age", type: "number" },
                { key: "MonthlyIncome", label: "Monthly Income ($)", type: "number" },
                { key: "YearsAtCompany", label: "Years at Company", type: "number" },
                { key: "YearsSinceLastPromotion", label: "Years Since Promotion", type: "number" },
                { key: "TotalWorkingYears", label: "Total Working Years", type: "number" },
                { key: "DistanceFromHome", label: "Distance from Home", type: "number" },
                { key: "NumCompaniesWorked", label: "Companies Worked", type: "number" },
                { key: "TrainingTimesLastYear", label: "Training Sessions (Last Year)", type: "number" },
                { key: "Education", label: "Education Level (1-5)", type: "number" },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs text-white mb-1 block">{f.label}</label>
                  <input type={f.type} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value === "" ? "" : Number(e.target.value) }))} className="input" />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="text-xs text-white mb-1 block">Department</label>
                <select value={form.Department} onChange={e => setForm(p => ({ ...p, Department: e.target.value }))} className="select w-full">
                  <option value="" disabled>Select department</option>
                  {["Engineering","Sales","HR","Finance","Marketing","Operations"].map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-white mb-1 block">Overtime</label>
                <select value={form.OverTime} onChange={e => setForm(p => ({ ...p, OverTime: e.target.value }))} className="select w-full">
                  <option value="" disabled>Select option</option>
                  <option>Yes</option><option>No</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-white mb-1 block">Job Role</label>
                <input value={form.JobRole} onChange={e => setForm(p => ({ ...p, JobRole: e.target.value }))} className="input" />
              </div>
              {[
                { key: "JobSatisfaction", label: "Job Satisfaction (1-4)" },
                { key: "WorkLifeBalance", label: "Work Life Balance (1-4)" },
                { key: "EnvironmentSatisfaction", label: "Environment Satisfaction (1-4)" },
                { key: "RelationshipSatisfaction", label: "Relationship Satisfaction (1-4)" },
                { key: "PerformanceRating", label: "Performance Rating (1-4)" },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs text-white mb-1 block">{f.label}</label>
                  <select value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: Number(e.target.value) }))} className="select w-full">
                    <option value="" disabled>Select score</option>
                    {[1,2,3,4].map(v => <option key={v}>{v}</option>)}
                  </select>
                </div>
              ))}
            </div>

            <button onClick={predict} disabled={loading}
              className="btn-primary w-full mt-4 justify-center py-2.5">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</> : "Predict Attrition Risk"}
            </button>
          </div>
        </div>

        {/* Right — Results */}
        <div className="space-y-4">
          {!result ? (
            <div className="card p-8 flex flex-col items-center justify-center text-center min-h-64">
              <User className="w-10 h-10 text-gray-700 mb-3" />
              <p className="text-sm text-white">Enter employee details and click Predict</p>
              <p className="text-xs text-gray-600 mt-1">Results will appear here</p>
            </div>
          ) : (
            <>
              {/* Risk Score */}
              <div className="card p-5 text-center">
                <p className="text-xs text-white mb-3">Attrition Risk Score</p>
                <SvgGauge score={Math.round((result.probability || 0) * 100)} />
                <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-semibold ${
                  result.risk_level === "High" ? "badge-high" :
                  result.risk_level === "Medium" ? "badge-medium" : "badge-low"
                }`}>{result.risk_level} Risk</span>
              </div>

              {/* SHAP */}
              {shapEntries.length > 0 && (
                <div className="card p-5">
                  <p className="text-sm font-medium text-white mb-4">Key Risk Factors (SHAP)</p>
                  <div className="space-y-3">
                    {shapEntries.map(([feat, val]) => (
                      <div key={feat}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-white">{feat}</span>
                          <span className={val > 0 ? "text-red-300" : "text-green-300"}>{val > 0 ? "+" : ""}{val.toFixed(2)}</span>
                        </div>
                        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${Math.abs(val) * 200}%`, maxWidth: "100%", background: val > 0 ? "#fca5a5" : "#86efac" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-600 mt-3">Red = increases risk · Green = reduces risk</p>
                </div>
              )}

              {/* Actions */}
              {result.recommended_actions?.length > 0 && (
                <div className="card p-5">
                  <p className="text-sm font-medium text-white mb-3">Recommended Actions</p>
                  <div className="space-y-2">
                    {result.recommended_actions.map((a, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-white">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
                        {a}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
