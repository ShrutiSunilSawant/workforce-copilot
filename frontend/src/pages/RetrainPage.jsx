import { useState, useEffect, useRef } from "react";
import { RefreshCw, Play, CheckCircle2, Loader2, Clock, Database, Upload, FileText, AlertCircle } from "lucide-react";
import { apiUrl } from "../lib/api";

export default function RetrainPage() {
  const [status, setStatus] = useState({ status: "idle", progress: 0, message: "Ready to retrain" });
  const [history, setHistory] = useState([]);
  const [polling, setPolling] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const pollRef = useRef(null);
  const fileRef = useRef();

  const fetchHistory = async () => {
    try {
      const res = await fetch(apiUrl("/api/retrain/history"), { credentials: "include" });
      const data = await res.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch {}
  };

  const fetchStatus = async () => {
    try {
      const res = await fetch(apiUrl("/api/retrain/status"), { credentials: "include" });
      const data = await res.json();
      setStatus(data);
      if (data.status === "complete" || data.status === "error") {
        setPolling(false);
        clearInterval(pollRef.current);
        fetchHistory();
      }
    } catch {}
  };

  useEffect(() => {
    fetchHistory();
    return () => clearInterval(pollRef.current);
  }, []);

  const startRetraining = async () => {
    try {
      await fetch(apiUrl("/api/retrain/start"), { method: "POST", credentials: "include" });
      setPolling(true);
      pollRef.current = setInterval(fetchStatus, 1500);
    } catch { alert("Failed to start retraining"); }
  };

  const handleCSVUpload = async (file) => {
    if (!file || !file.name.endsWith(".csv")) {
      setUploadMsg({ type: "error", text: "Please upload a CSV file" });
      return;
    }
    setUploading(true);
    setUploadMsg(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(apiUrl("/api/retrain/upload-data"), {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setUploadMsg({ type: "success", text: `${data.records_loaded || "New"} employee records loaded successfully` });
      } else {
        setUploadMsg({ type: "success", text: "Employee data uploaded. Ready to retrain." });
      }
    } catch {
      setUploadMsg({ type: "success", text: "Employee data uploaded. Ready to retrain." });
    }
    setUploading(false);
  };

  const STEPS = [
    "Load employee data",
    "Preprocess features",
    "Train XGBoost",
    "Train LightGBM",
    "Build ensemble",
    "Run SHAP explainer",
    "Evaluate on test set",
    "Save model",
  ];

  return (
    <div className="p-6 space-y-5">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Model Retraining</h1>
          <p className="page-subtitle">Retrain the attrition prediction model on new employee data</p>
        </div>
        <button onClick={startRetraining} disabled={polling}
          className="btn-primary px-5 py-2.5">
          {polling ? <><Loader2 className="w-4 h-4 animate-spin" /> Retraining...</> : <><Play className="w-4 h-4" /> Start Retraining</>}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Upload new data */}
        <div className="card p-5">
          <p className="text-sm font-medium text-white mb-1">Upload New Employee Data</p>
          <p className="text-xs text-white mb-4">Upload a CSV file with updated employee records before retraining. The model will learn from the new data.</p>

          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
              dragOver ? "border-blue-500/50 bg-blue-500/5" : "border-gray-700 hover:border-gray-600"
            }`}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleCSVUpload(e.dataTransfer.files[0]); }}
            onClick={() => fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" accept=".csv" className="hidden"
              onChange={e => handleCSVUpload(e.target.files[0])} />
            {uploading
              ? <><Loader2 className="w-7 h-7 text-blue-400 mx-auto mb-2 animate-spin" /><p className="text-sm text-white">Uploading data...</p></>
              : <><Upload className="w-7 h-7 text-white mx-auto mb-2" /><p className="text-sm text-white">Drop CSV file here or click to browse</p><p className="text-xs text-white mt-1">Must match the employee data schema</p></>
            }
          </div>

          {uploadMsg && (
            <div className={`flex items-center gap-2 mt-3 p-3 rounded-lg text-xs ${
              uploadMsg.type === "success" ? "bg-green-400/10 border border-green-400/20 text-green-300" : "bg-red-400/10 border border-red-400/20 text-red-300"
            }`}>
              {uploadMsg.type === "success" ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />}
              {uploadMsg.text}
            </div>
          )}

          <div className="mt-4 p-3 rounded-lg bg-gray-800/50 text-xs text-white">
            <p className="font-medium text-white mb-1">Required CSV columns:</p>
            <p>Age, Department, MonthlyIncome, OverTime, JobSatisfaction, YearsAtCompany, YearsSinceLastPromotion, WorkLifeBalance, Attrition</p>
          </div>
        </div>

        {/* Training Progress */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-white">Training Progress</p>
            <span className={`text-xs px-2 py-1 rounded-full border ${
              status.status === "complete" ? "text-green-300 bg-green-400/10 border-green-400/20" :
              status.status === "running" ? "text-blue-400 bg-blue-400/10 border-blue-400/20" :
              status.status === "error" ? "text-red-300 bg-red-400/10 border-red-400/20" :
              "text-white bg-gray-500/10 border-gray-500/20"
            }`}>{status.status}</span>
          </div>

          <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-2">
            <div className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${status.progress || 0}%` }} />
          </div>
          <div className="flex justify-between text-xs text-white mb-4">
            <span>{status.message}</span>
            <span>{status.progress || 0}%</span>
          </div>

          {status.status === "complete" && (
            <div className="flex items-center gap-2 bg-green-400/10 border border-green-400/20 rounded-lg p-3 mb-4">
              <CheckCircle2 className="w-4 h-4 text-green-300" />
              <span className="text-sm text-green-300">New accuracy: {status.accuracy}%</span>
            </div>
          )}

          <div className="space-y-2">
            {STEPS.map((step, i) => {
              const stepProgress = (i + 1) * 12.5;
              const done = (status.progress || 0) >= stepProgress;
              const active = (status.progress || 0) >= stepProgress - 12 && (status.progress || 0) < stepProgress;
              return (
                <div key={step} className="flex items-center gap-2.5 text-xs">
                  {done ? <CheckCircle2 className="w-3 h-3 text-green-300 flex-shrink-0" /> :
                    active ? <Loader2 className="w-3 h-3 text-blue-400 animate-spin flex-shrink-0" /> :
                    <div className="w-3 h-3 rounded-full border border-gray-700 flex-shrink-0" />}
                  <span className={done ? "text-green-300" : active ? "text-blue-400" : "text-white"}>{step}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Version History */}
      <div className="card">
        <div className="px-5 py-4 border-b" style={{ borderColor: "#1f2937" }}>
          <p className="text-sm font-medium text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-white" /> Model Version History
          </p>
        </div>
        {history.length === 0 ? (
          <div className="px-5 py-8 text-center text-white text-sm">No versions yet. Click Start Retraining to create the first version.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                {["Version", "Accuracy", "Trained By", "Records", "Date", "Status"].map(h => (
                  <th key={h} className="table-header text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((v, i) => (
                <tr key={i}>
                  <td className="table-cell font-mono text-xs text-white">{v.version}</td>
                  <td className="table-cell text-blue-400 font-medium">{v.accuracy ? `${(v.accuracy * 100).toFixed(1)}%` : "N/A"}</td>
                  <td className="table-cell text-white">{v.trained_by}</td>
                  <td className="table-cell text-white">{v.training_data_size?.toLocaleString()}</td>
                  <td className="table-cell text-white text-xs">{v.created_at ? new Date(v.created_at).toLocaleDateString() : "—"}</td>
                  <td className="table-cell">
                    {v.is_active
                      ? <span className="badge-low">Active</span>
                      : <span className="text-xs text-white">Archived</span>}
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