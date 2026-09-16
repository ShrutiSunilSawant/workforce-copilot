import { useState, useEffect } from "react";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from "recharts";
import { TrendingUp, Users, AlertTriangle, Activity } from "lucide-react";
import { apiUrl } from "../lib/api";

// Fallback generators, used only if the backend forecast API is unreachable.
const generateForecast = () => {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return months.map((m, i) => ({
    month: m,
    forecast: 10 + Math.sin(i * 0.5) * 2 + i * 0.3,
    upper: 14 + i * 0.4,
    lower: 7 + i * 0.2,
  }));
};

const generateHeadcount = () =>
  ["M1","M2","M3","M4","M5","M6","M7","M8","M9","M10","M11","M12"].map((q, i) => ({
    quarter: q,
    headcount: 1500 + i * 5,
    hires: Math.round(20 + Math.random() * 10),
    departures: Math.round(25 + Math.random() * 8),
  }));

const generateBurnout = () =>
  ["Q1 2025","Q2 2025","Q3 2025","Q4 2025"].map((q, i) => ({
    quarter: q,
    burnout_risk: 30 + i * 3,
    departments_at_risk: ["Engineering", "Sales"],
  }));

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card px-3 py-2 text-xs shadow-xl" style={{ background: "#1a1f2e", border: "1px solid #2d3748" }}>
      <p className="text-white font-medium mb-1">{label}</p>
      {payload.map(p => p.value != null && (
        <p key={p.name} className="text-white">{p.name}: {typeof p.value === "number" ? p.value.toFixed(1) : p.value}</p>
      ))}
    </div>
  );
};

export default function ForecastPage() {
  const [attritionData, setAttritionData] = useState(generateForecast);
  const [headcountData, setHeadcountData] = useState(generateHeadcount);
  const [burnoutData, setBurnoutData] = useState(generateBurnout);
  const [meta, setMeta] = useState({ model: "ARIMA (fallback)", trend: "increasing", peakMonth: null, interventionImpact: null, startingHeadcount: 1500, live: false });
  const [model, setModel] = useState("prophet");

  useEffect(() => {
    fetch(apiUrl("/api/forecast/attrition?months=12"), { credentials: "include" })
      .then(res => res.ok ? res.json() : Promise.reject(res.status))
      .then(data => {
        const mapped = (data.forecast || []).map(f => ({
          month: f.month,
          forecast: +(f.predicted_rate * 100).toFixed(2),
          upper: +(f.upper_bound * 100).toFixed(2),
          lower: +(f.lower_bound * 100).toFixed(2),
        }));
        if (mapped.length) {
          setAttritionData(mapped);
          setMeta(m => ({ ...m, model: data.model, trend: data.trend, live: true }));
        }
      })
      .catch(() => {});

    fetch(apiUrl("/api/forecast/headcount?months=12"), { credentials: "include" })
      .then(res => res.ok ? res.json() : Promise.reject(res.status))
      .then(data => {
        const mapped = (data.forecast || []).map(f => ({
          quarter: f.month,
          headcount: f.headcount,
          hires: f.new_hires,
          departures: f.attrition_count,
        }));
        if (mapped.length) setHeadcountData(mapped);
        if (data.starting_headcount) setMeta(m => ({ ...m, startingHeadcount: data.starting_headcount }));
      })
      .catch(() => {});

    fetch(apiUrl("/api/forecast/burnout-risk"), { credentials: "include" })
      .then(res => res.ok ? res.json() : Promise.reject(res.status))
      .then(data => {
        const mapped = (data.quarters || []).map(q => ({
          quarter: q.quarter,
          burnout_risk: Math.round(q.burnout_risk * 100),
          departments_at_risk: q.departments_at_risk,
        }));
        if (mapped.length) setBurnoutData(mapped);
        setMeta(m => ({ ...m, peakMonth: data.peak_month, interventionImpact: data.intervention_impact }));
      })
      .catch(() => {});
  }, []);

  const lastAttrition = attritionData[attritionData.length - 1];
  const lastHeadcount = headcountData[headcountData.length - 1];
  const totalHires = headcountData.reduce((sum, h) => sum + (h.hires || 0), 0);
  const highestBurnoutQuarter = burnoutData.reduce((max, q) => (q.burnout_risk > (max?.burnout_risk ?? -1) ? q : max), null);

  const kpis = [
    { label: "Projected Attrition (end of period)", value: lastAttrition ? `${lastAttrition.forecast}%` : "—", delta: `Model: ${meta.model}`, icon: TrendingUp },
    { label: "Expected Headcount", value: lastHeadcount ? String(lastHeadcount.headcount) : "—", delta: `vs ${meta.startingHeadcount} today`, icon: Users },
    { label: "Burnout Risk Peak", value: meta.peakMonth || (highestBurnoutQuarter?.quarter ?? "—"), delta: highestBurnoutQuarter ? (highestBurnoutQuarter.departments_at_risk || []).join(", ") : "—", icon: AlertTriangle },
    { label: "Hiring Need (period)", value: `~${totalHires}`, delta: "Sum of projected new hires", icon: Activity },
  ];

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Workforce Forecast</h1>
          <p className="text-sm text-white">Prophet and ARIMA time-series predictions{meta.live ? "" : " (showing offline sample data — backend forecast API unreachable)"}</p>
        </div>
        <div className="flex gap-2">
          {["prophet", "arima"].map(m => (
            <button key={m} onClick={() => setModel(m)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all uppercase tracking-wide font-medium ${
                model === m ? "border-gray-400 text-white bg-gray-700" : "border-gray-700 text-white hover:border-gray-500"
              }`}>{m}</button>
          ))}
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
            <p className="text-xs text-white mt-1">{k.delta}</p>
          </div>
        ))}
      </div>

      {/* Attrition Forecast */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-white">Attrition Rate Forecast</p>
          <div className="flex gap-3 text-xs text-white">
            <div className="flex items-center gap-1"><div className="w-3 h-0.5" style={{ borderTop: "2px dashed #fca5a5" }} /> Forecast</div>
            <div className="flex items-center gap-1"><div className="w-3 h-0.5" style={{ borderTop: "1px dashed #4b5563" }} /> Confidence interval</div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={attritionData}>
            <defs>
              <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#fca5a5" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#fca5a5" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="month" tick={{ fill: "#ffffff", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#ffffff", fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="upper" stroke="#4b5563" fill="none" strokeWidth={1} strokeDasharray="3 3" name="CI Upper" dot={false} />
            <Area type="monotone" dataKey="forecast" stroke="#fca5a5" fill="url(#forecastGrad)" strokeWidth={2} strokeDasharray="6 3" name="Forecast" dot={false} />
            <Area type="monotone" dataKey="lower" stroke="#4b5563" fill="none" strokeWidth={1} strokeDasharray="3 3" name="CI Lower" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
        <p className="text-xs text-white mt-2">Shaded region = confidence interval · Model: <span className="uppercase">{meta.model}</span> · Trend: {meta.trend}</p>
      </div>

      {/* Bottom Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Headcount */}
        <div className="card p-5">
          <p className="text-sm font-medium text-white mb-4">Headcount Projection</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={headcountData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="quarter" tick={{ fill: "#ffffff", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#ffffff", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="hires" name="New Hires" fill="#93c5fd" radius={[2,2,0,0]} />
              <Bar dataKey="departures" name="Departures" fill="#fca5a5" radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 justify-center text-xs text-white">
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-gray-500" /> New Hires</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-gray-600" /> Departures</div>
          </div>
        </div>

        {/* Burnout risk */}
        <div className="card p-5">
          <p className="text-sm font-medium text-white mb-4">Burnout Risk Forecast</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={burnoutData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="quarter" tick={{ fill: "#ffffff", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#ffffff", fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} unit="%" />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={70} stroke="#4b5563" strokeDasharray="4 4" label={{ value: "Critical", fill: "#9ca3af", fontSize: 9 }} />
              <Line type="monotone" dataKey="burnout_risk" name="Burnout Risk" stroke="#fca5a5" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-xs text-white mt-2 text-center">
            {highestBurnoutQuarter ? `Departments at risk in ${highestBurnoutQuarter.quarter}: ${(highestBurnoutQuarter.departments_at_risk || []).join(", ")}` : ""}
          </p>
        </div>
      </div>

      {/* AI Narrative */}
      <div className="card p-5">
        <p className="text-sm font-medium text-white mb-2">Forecast Summary</p>
        <p className="text-sm text-white leading-relaxed">
          Based on {meta.model} modeling of workforce data, attrition is projected to reach{" "}
          <span className="font-semibold">{lastAttrition ? `${lastAttrition.forecast}%` : "an elevated level"}</span> by the end of the forecast window
          (trend: {meta.trend}). Headcount is projected to reach{" "}
          <span className="font-semibold">{lastHeadcount ? lastHeadcount.headcount : "—"}</span>, requiring approximately{" "}
          <span className="font-semibold">{totalHires} new hires</span> to offset attrition.{" "}
          {highestBurnoutQuarter && (
            <>Burnout risk peaks around <span className="font-semibold">{meta.peakMonth || highestBurnoutQuarter.quarter}</span>, concentrated in{" "}
            {(highestBurnoutQuarter.departments_at_risk || []).join(", ")}. {meta.interventionImpact ? `Estimated impact of intervention: ${meta.interventionImpact}.` : ""}</>
          )}
        </p>
      </div>
    </div>
  );
}
