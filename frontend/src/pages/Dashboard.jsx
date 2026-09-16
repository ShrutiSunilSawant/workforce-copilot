import { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, Users, AlertTriangle, Heart, Filter, X, ChevronRight } from "lucide-react";

const DEPARTMENTS = ["All Departments", "Engineering", "Sales", "HR", "Finance", "Marketing", "Operations"];

const DEPT_DATA = {
  "All Departments": {
    employees: 1247, attrition: "11.8%", highRisk: 89, morale: 63,
    trend: [8,9,10,11,10,12,13,11,12,14,13,12].map((v,i) => ({ month: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][i], rate: v })),
    deptRisk: [
      { dept: "Engineering", risk: 28, employees: 312, morale: 62 },
      { dept: "Sales", risk: 31, employees: 198, morale: 55 },
      { dept: "Marketing", risk: 22, employees: 167, morale: 48 },
      { dept: "Operations", risk: 14, employees: 340, morale: 66 },
      { dept: "Finance", risk: 11, employees: 143, morale: 70 },
      { dept: "HR", risk: 8, employees: 87, morale: 78 },
    ],
    topRisk: [
      { id: "EMP00142", name: "Alex Chen", dept: "Engineering", role: "Senior Engineer", risk: "High", score: 87, salary: 4200, overtime: "Yes", satisfaction: 1, tenure: 3, lastPromotion: 2, reasons: ["Excessive overtime (55+ hrs/week)", "Very low job satisfaction (1/4)", "No promotion in 2 years", "Below department salary average"] },
      { id: "EMP00387", name: "Sarah Kim", dept: "Sales", role: "Account Executive", risk: "High", score: 82, salary: 3800, overtime: "Yes", satisfaction: 2, tenure: 4, lastPromotion: 3, reasons: ["High overtime workload", "Low satisfaction score", "3 years since last promotion", "Burnout signals detected"] },
      { id: "EMP00231", name: "James Wu", dept: "Engineering", role: "Software Engineer", risk: "High", score: 79, salary: 3600, overtime: "No", satisfaction: 1, tenure: 2, lastPromotion: 2, reasons: ["Very low job satisfaction (1/4)", "Below market compensation", "Limited career growth opportunities", "Low environment satisfaction"] },
      { id: "EMP00561", name: "Maria Garcia", dept: "Operations", role: "Operations Manager", risk: "High", score: 76, salary: 4500, overtime: "Yes", satisfaction: 2, tenure: 5, lastPromotion: 4, reasons: ["Overtime fatigue", "4 years since last promotion", "Work-life balance concerns", "Declining engagement scores"] },
      { id: "EMP00094", name: "David Lee", dept: "Sales", role: "Sales Representative", risk: "Medium", score: 68, salary: 3200, overtime: "No", satisfaction: 2, tenure: 1, lastPromotion: 1, reasons: ["Low tenure risk (1 year)", "Below average compensation", "Limited training opportunities"] },
    ],
  },
  "Engineering": {
    employees: 312, attrition: "18.2%", highRisk: 34, morale: 62,
    trend: [12,13,15,16,14,17,18,16,17,19,18,17].map((v,i) => ({ month: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][i], rate: v })),
    deptRisk: [{ dept: "Engineering", risk: 28, employees: 312, morale: 62 }],
    topRisk: [
      { id: "EMP00142", name: "Alex Chen", dept: "Engineering", role: "Senior Engineer", risk: "High", score: 87, salary: 4200, overtime: "Yes", satisfaction: 1, tenure: 3, lastPromotion: 2, reasons: ["Excessive overtime (55+ hrs/week)", "Very low job satisfaction (1/4)", "No promotion in 2 years", "Below department salary average"] },
      { id: "EMP00231", name: "James Wu", dept: "Engineering", role: "Software Engineer", risk: "High", score: 79, salary: 3600, overtime: "No", satisfaction: 1, tenure: 2, lastPromotion: 2, reasons: ["Very low job satisfaction (1/4)", "Below market compensation", "Limited career growth opportunities"] },
      { id: "EMP00445", name: "Lisa Park", dept: "Engineering", role: "DevOps Engineer", risk: "Medium", score: 65, salary: 4800, overtime: "No", satisfaction: 2, tenure: 3, lastPromotion: 1, reasons: ["Low satisfaction score", "Limited growth visibility"] },
    ],
  },
  "Sales": {
    employees: 198, attrition: "22.1%", highRisk: 28, morale: 55,
    trend: [15,16,18,19,17,20,22,19,21,23,22,20].map((v,i) => ({ month: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][i], rate: v })),
    deptRisk: [{ dept: "Sales", risk: 31, employees: 198, morale: 55 }],
    topRisk: [
      { id: "EMP00387", name: "Sarah Kim", dept: "Sales", role: "Account Executive", risk: "High", score: 82, salary: 3800, overtime: "Yes", satisfaction: 2, tenure: 4, lastPromotion: 3, reasons: ["High overtime workload", "Low satisfaction score", "3 years since last promotion", "Burnout signals detected"] },
      { id: "EMP00094", name: "David Lee", dept: "Sales", role: "Sales Representative", risk: "Medium", score: 68, salary: 3200, overtime: "No", satisfaction: 2, tenure: 1, lastPromotion: 1, reasons: ["Low tenure risk (1 year)", "Below average compensation"] },
    ],
  },
  "HR": { employees: 87, attrition: "6.4%", highRisk: 4, morale: 78, trend: [5,6,5,6,6,7,6,5,6,7,6,6].map((v,i) => ({ month: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][i], rate: v })), deptRisk: [{ dept: "HR", risk: 8, employees: 87, morale: 78 }], topRisk: [] },
  "Finance": { employees: 143, attrition: "8.1%", highRisk: 9, morale: 70, trend: [6,7,8,7,8,8,9,7,8,9,8,8].map((v,i) => ({ month: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][i], rate: v })), deptRisk: [{ dept: "Finance", risk: 11, employees: 143, morale: 70 }], topRisk: [] },
  "Marketing": { employees: 167, attrition: "15.3%", highRisk: 18, morale: 48, trend: [10,11,12,13,11,14,15,13,14,16,15,14].map((v,i) => ({ month: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][i], rate: v })), deptRisk: [{ dept: "Marketing", risk: 22, employees: 167, morale: 48 }], topRisk: [] },
  "Operations": { employees: 340, attrition: "9.7%", highRisk: 16, morale: 66, trend: [7,8,9,8,9,10,9,8,9,10,9,9].map((v,i) => ({ month: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][i], rate: v })), deptRisk: [{ dept: "Operations", risk: 14, employees: 340, morale: 66 }], topRisk: [] },
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card px-3 py-2 text-xs shadow-xl">
      <p className="text-white mb-1">{label}</p>
      {payload.map(p => <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value}%</p>)}
    </div>
  );
};

// Maps an employee's actual risk factors ("reasons") to specific actions,
// instead of showing the same generic checklist for every employee.
const ACTION_RULES = [
  { match: /overtime/i, action: "Assess and reduce overtime workload" },
  { match: /burnout|fatigue|engagement/i, action: "Enroll in burnout recovery program: mandatory PTO + workload rebalancing" },
  { match: /satisfaction/i, action: "Schedule 1:1 with manager to address job satisfaction" },
  { match: /promotion|growth|career/i, action: "Discuss career growth and promotion timeline" },
  { match: /compensation|salary|market/i, action: "Review compensation against department benchmark" },
  { match: /tenure/i, action: "Assign mentor and structured 90-day onboarding check-ins" },
  { match: /training/i, action: "Enroll in relevant training/certification programs" },
  { match: /work-life balance/i, action: "Review workload distribution and time-off usage" },
  { match: /environment/i, action: "Gather feedback on team/workplace environment" },
];

function getRecommendedActions(emp) {
  const actions = [];
  for (const { match, action } of ACTION_RULES) {
    if (emp.reasons.some(r => match.test(r)) && !actions.includes(action)) {
      actions.push(action);
    }
  }
  if (!actions.length) actions.push("Schedule 1:1 with manager this week");
  return actions;
}

function EmployeeModal({ emp, onClose }) {
  const recommendedActions = getRecommendedActions(emp);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="card w-full max-w-lg animate-slide-up" style={{ background: "#1a1f2e" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "#2d3748" }}>
          <div>
            <p className="text-white font-semibold">{emp.name}</p>
            <p className="text-xs text-white mt-0.5">{emp.role} · {emp.dept} · {emp.id}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={emp.risk === "High" ? "badge-high" : "badge-medium"}>{emp.risk} Risk</span>
            <button onClick={onClose} className="p-1 rounded hover:bg-gray-700 text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Risk Score */}
        <div className="px-6 py-4 border-b" style={{ borderColor: "#2d3748" }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-white font-medium">Attrition Risk Score</p>
            <span className="text-2xl font-bold text-white">{emp.score}%</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${emp.score}%`, background: emp.score >= 80 ? "#fca5a5" : "#fcd34d" }} />
          </div>
        </div>

        {/* Employee Details */}
        <div className="px-6 py-4 border-b" style={{ borderColor: "#2d3748" }}>
          <p className="text-xs font-semibold text-white uppercase tracking-wide mb-3">Employee Details</p>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Monthly Salary", value: `$${emp.salary.toLocaleString()}` },
              { label: "Overtime", value: emp.overtime },
              { label: "Job Satisfaction", value: `${emp.satisfaction}/4` },
              { label: "Tenure", value: `${emp.tenure} years` },
              { label: "Last Promotion", value: `${emp.lastPromotion} yrs ago` },
              { label: "Department", value: emp.dept },
            ].map(d => (
              <div key={d.label}>
                <p className="text-xs text-white mb-1">{d.label}</p>
                <p className="text-sm text-white font-medium">{d.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Why High Risk */}
        <div className="px-6 py-4 border-b" style={{ borderColor: "#2d3748" }}>
          <p className="text-xs font-semibold text-white uppercase tracking-wide mb-3">Why High Risk (SHAP Factors)</p>
          <div className="space-y-2">
            {emp.reasons.map((r, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-white">
                <div className="w-1.5 h-1.5 rounded-full bg-red-300 flex-shrink-0 mt-1.5" />
                {r}
              </div>
            ))}
          </div>
        </div>

        {/* Recommended Actions */}
        <div className="px-6 py-4">
          <p className="text-xs font-semibold text-white uppercase tracking-wide mb-3">Recommended Actions</p>
          <div className="space-y-2">
            {recommendedActions.map((a, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-white">
                <div className="w-1.5 h-1.5 rounded-full bg-green-300 flex-shrink-0 mt-1.5" />
                {a}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [dept, setDept] = useState("All Departments");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const data = DEPT_DATA[dept] || DEPT_DATA["All Departments"];

  const kpis = [
    { label: "Total Employees", value: data.employees.toLocaleString(), delta: "+12 this month", up: true, icon: Users },
    { label: "Attrition Rate", value: data.attrition, delta: "Above benchmark", up: false, icon: TrendingUp },
    { label: "High Risk Employees", value: data.highRisk, delta: "Needs attention", up: false, icon: AlertTriangle },
    { label: "Avg Morale Score", value: `${data.morale}/100`, delta: data.morale >= 70 ? "Healthy" : "Declining", up: data.morale >= 70, icon: Heart },
  ];

  return (
    <div className="p-6 space-y-5">
      {selectedEmployee && <EmployeeModal emp={selectedEmployee} onClose={() => setSelectedEmployee(null)} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Workforce Dashboard</h1>
          <p className="text-sm text-white">Real-time HR analytics and risk monitoring</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-white" />
          <select value={dept} onChange={e => { setDept(e.target.value); setSelectedEmployee(null); }} className="select text-sm">
            {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
          </select>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => (
          <div key={k.label} className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-white">{k.label}</span>
              <k.icon className="w-4 h-4 text-white" />
            </div>
            <p className="stat-value">{k.value}</p>
            <p className={`text-xs mt-1 ${k.up ? "text-green-300" : "text-red-300"}`}>{k.delta}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Attrition Trend */}
        <div className="card p-5">
          <p className="text-sm font-medium text-white mb-4">Attrition Rate Trend</p>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={data.trend}>
              <defs>
                <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="month" tick={{ fill: "#ffffff", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#ffffff", fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="rate" stroke="#3b82f6" fill="url(#aGrad)" strokeWidth={2} name="Attrition" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Dept Risk */}
        <div className="card p-5">
          <p className="text-sm font-medium text-white mb-4">Department Risk & Morale</p>
          <div className="space-y-4">
            {data.deptRisk.map(d => (
              <div key={d.dept}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-white">{d.dept}</span>
                  <span className="text-white">Risk {d.risk}% · Morale {d.morale}/100</span>
                </div>
                <div className="flex gap-1.5">
                  <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${d.risk}%`, background: "#6b7280" }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* High Risk Table */}
      <div className="card">
        <div className="px-5 py-4 border-b" style={{ borderColor: "#2d3748" }}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-white">High Risk Employees</p>
            <span className="text-xs text-white">{data.topRisk.length} employees flagged</span>
          </div>
        </div>
        {data.topRisk.length === 0 ? (
          <div className="px-5 py-8 text-center text-white text-sm">No high risk employees in this department</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                {["Employee ID", "Name", "Role", "Department", "Risk Score", "Status", ""].map(h => (
                  <th key={h} className="table-header text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.topRisk.map(emp => (
                <tr key={emp.id} className="hover:bg-gray-800/30 transition-colors">
                  <td className="table-cell font-mono text-xs text-white">{emp.id}</td>
                  <td className="table-cell font-medium text-white">{emp.name}</td>
                  <td className="table-cell text-white text-xs">{emp.role}</td>
                  <td className="table-cell text-white">{emp.dept}</td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${emp.score}%`, background: "#6b7280" }} />
                      </div>
                      <span className="text-xs text-white">{emp.score}%</span>
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className={emp.risk === "High" ? "badge-high" : "badge-medium"}>{emp.risk}</span>
                  </td>
                  <td className="table-cell">
                    <button onClick={() => setSelectedEmployee(emp)}
                      className="flex items-center gap-1 text-xs text-white border border-gray-600 px-2.5 py-1 rounded-lg hover:border-gray-400 hover:bg-gray-700 transition-all">
                      View <ChevronRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}