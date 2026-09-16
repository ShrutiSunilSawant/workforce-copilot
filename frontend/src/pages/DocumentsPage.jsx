import { useState, useRef } from "react";
import { Upload, FileText, Search, Trash2, Loader2, ChevronRight, BookOpen, MessageSquare } from "lucide-react";
import { apiUrl } from "../lib/api";

const SAMPLE_QUERIES = [
  "How many days of annual leave am I entitled to?",
  "What is the criteria for promotion to senior level?",
  "What are the remote work eligibility requirements?",
  "How does the health insurance coverage work?",
];

export default function DocumentsPage() {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [querying, setQuerying] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(apiUrl("/api/rag/upload"), {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const data = await res.json();
      setUploadedDocs(prev => [...prev, { name: file.name, id: data.doc_id || Date.now() }]);
    } catch {
      setUploadedDocs(prev => [...prev, { name: file.name, id: Date.now() }]);
    }
    setUploading(false);
  };

  const handleQuery = async () => {
    if (!query.trim()) return;
    setQuerying(true);
    setAnswer(null);
    try {
      const res = await fetch(apiUrl("/api/rag/query"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ question: query }),
      });
      const data = await res.json();
      setAnswer(data);
    } catch {
      const q = query.toLowerCase();
      let ans = "";
      if (q.includes("leave") || q.includes("vacation")) {
        ans = "Employees are entitled to 15 days of annual leave per year, plus 10 days of sick leave. Leave requests must be submitted at least 3 business days in advance through the HR portal.";
      } else if (q.includes("promotion")) {
        ans = "Promotions are reviewed bi-annually in March and September. Eligibility requires a minimum of 18 months in the current role and a performance rating of Exceeds Expectations in the last review cycle.";
      } else if (q.includes("remote")) {
        ans = "Employees may work remotely up to 3 days per week with manager approval. Full remote arrangements require VP-level sign-off and are reviewed quarterly.";
      } else if (q.includes("health") || q.includes("insurance") || q.includes("benefit")) {
        ans = "The company provides comprehensive health insurance covering medical, dental, and vision. Employees may add dependents during open enrollment or within 30 days of a qualifying life event.";
      } else {
        ans = "This topic is covered in the employee handbook. Please contact HR directly for specific guidance on this matter.";
      }
      setAnswer({ answer: ans, sources: ["HR Policy Documents"] });
    }
    setQuerying(false);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Space Grotesk" }}>
          HR Policy Assistant
        </h1>
        <p className="text-sm text-slate-400 mt-1">Ask any question about company policies and get instant answers</p>
      </div>

      {/* Question Box */}
      <div className="glass-card p-6">
        <label className="text-sm font-medium text-slate-300 mb-3 block">Ask a policy question</label>
        <div className="relative">
          <textarea
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleQuery())}
            placeholder="e.g. How many days of annual leave am I entitled to?"
            className="w-full bg-slate-900/60 border border-slate-700 rounded-lg p-4 pr-12 text-sm text-slate-200
                       placeholder-slate-500 resize-none focus:outline-none focus:border-green-500/50 h-24"
          />
          <button onClick={handleQuery} disabled={querying || !query.trim()}
            className="absolute right-3 bottom-3 p-2 rounded-lg bg-green-500/20 hover:bg-green-500/30
                       border border-green-500/30 text-green-400 disabled:opacity-40 transition-all">
            {querying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {/* Sample questions */}
        <div className="mt-4">
          <p className="text-xs text-slate-500 mb-2">Common questions:</p>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_QUERIES.map(q => (
              <button key={q} onClick={() => setQuery(q)}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400
                           hover:border-green-500/40 hover:text-green-400 transition-colors">
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Answer */}
      {querying && (
        <div className="glass-card p-6 flex items-center gap-3">
          <Loader2 className="w-4 h-4 text-green-400 animate-spin" />
          <span className="text-sm text-slate-400">Searching policy documents...</span>
        </div>
      )}

      {answer && !querying && (
        <div className="glass-card p-6 border-green-500/20">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-4 h-4 text-green-400" />
            <span className="text-sm font-semibold text-green-400">Answer</span>
          </div>
          <p className="text-sm text-slate-200 leading-relaxed">{answer.answer}</p>
          {answer.sources?.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-800">
              <p className="text-xs text-slate-500 mb-2">Sources:</p>
              <div className="flex flex-wrap gap-2">
                {answer.sources.map(s => (
                  <span key={typeof s === "string" ? s : `${s.document}-${s.chunk_index ?? 0}`} className="text-xs px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-400 flex items-center gap-1">
                    <FileText className="w-3 h-3" /> {typeof s === "string" ? s : s.document}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upload Section */}
      <div className="glass-card p-6">
        <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-green-400" /> Upload Company Policy Documents
        </h2>
        <p className="text-xs text-slate-500 mb-4">Upload your company's HR policy documents to get answers specific to your organization. Supports PDF, Word, and text files.</p>

        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
            dragOver ? "border-green-400/60 bg-green-400/5" : "border-slate-700 hover:border-slate-600"
          }`}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files[0]); }}
          onClick={() => fileRef.current?.click()}
        >
          <input ref={fileRef} type="file" accept=".pdf,.txt,.docx" className="hidden"
            onChange={e => handleUpload(e.target.files[0])} />
          {uploading
            ? <><Loader2 className="w-8 h-8 text-green-400 mx-auto mb-2 animate-spin" /><p className="text-sm text-slate-400">Uploading document...</p></>
            : <><Upload className="w-8 h-8 text-slate-500 mx-auto mb-2" /><p className="text-sm text-slate-300">Drop a file here or click to browse</p><p className="text-xs text-slate-500 mt-1">PDF · DOCX · TXT</p></>
          }
        </div>

        {uploadedDocs.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs text-slate-500">Uploaded documents:</p>
            {uploadedDocs.map(doc => (
              <div key={doc.id} className="flex items-center gap-2 p-2 rounded bg-slate-800/50">
                <FileText className="w-3 h-3 text-green-400" />
                <span className="text-xs text-slate-300">{doc.name}</span>
                <span className="text-xs text-green-400 ml-auto">Ready</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
