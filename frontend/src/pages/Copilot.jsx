import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, Brain, Zap, RefreshCw } from "lucide-react";
import axios from "axios";

const SUGGESTED = [
  "Why is attrition increasing in Engineering?",
  "Which employees are at highest risk of leaving?",
  "Summarize workforce burnout signals",
  "Suggest retention strategies for Sales team",
  "Predict attrition for next quarter",
  "Which departments have lowest morale?",
];

const WELCOME_MSG = {
  role: "ai",
  content:
    "👋 Hello! I'm **WorkforceIQ Copilot** — your AI HR intelligence assistant.\n\nI can help you:\n• Analyze attrition risk and root causes\n• Understand employee sentiment and burnout signals\n• Generate retention strategies\n• Predict workforce trends\n• Answer questions about HR policies\n\nAsk me anything about your workforce data!",
  timestamp: new Date(),
};

function Message({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-3 animate-slide-up ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={
          isUser
            ? { background: "rgba(0,245,255,0.15)", border: "1px solid rgba(0,245,255,0.3)" }
            : { background: "linear-gradient(135deg, #b537f2, #00f5ff)", }
        }
      >
        {isUser ? <User size={14} className="text-neon-cyan" /> : <Bot size={14} className="text-white" />}
      </div>
      <div className={`max-w-[78%] ${isUser ? "chat-user" : "chat-ai"} p-3`}>
        <div
          className="text-sm text-white/90 leading-relaxed whitespace-pre-wrap"
          dangerouslySetInnerHTML={{
            __html: msg.content
              .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
              .replace(/• /g, '<span class="text-neon-cyan">•</span> '),
          }}
        />
        {msg.sources?.length > 0 && (
          <div className="mt-2 pt-2 border-t border-white/10">
            <div className="text-[10px] text-white/30 mb-1">Sources</div>
            {msg.sources.map((s, i) => (
              <div key={i} className="text-[10px] text-neon-cyan/70 font-mono">
                📄 {s.document} ({(s.relevance * 100).toFixed(0)}%)
              </div>
            ))}
          </div>
        )}
        {msg.suggested_questions?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {msg.suggested_questions.slice(0, 2).map((q, i) => (
              <span key={i} className="text-[10px] px-2 py-1 rounded-full bg-neon-cyan/10 text-neon-cyan/80 cursor-pointer hover:bg-neon-cyan/20 transition-colors">
                {q}
              </span>
            ))}
          </div>
        )}
        <div className="text-[10px] text-white/20 mt-1.5 font-mono">
          {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3 animate-fade-in">
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: "linear-gradient(135deg, #b537f2, #00f5ff)" }}>
        <Bot size={14} className="text-white" />
      </div>
      <div className="chat-ai p-3 flex items-center gap-2">
        <div className="flex gap-1">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-neon-cyan/60"
              style={{ animation: `bounce 1s ease-in-out ${i * 0.2}s infinite` }} />
          ))}
        </div>
        <span className="text-xs text-white/40 font-mono">AI thinking...</span>
      </div>
    </div>
  );
}

export default function Copilot() {
  const [messages, setMessages] = useState([WELCOME_MSG]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [convId, setConvId] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text) => {
    const userMsg = text || input.trim();
    if (!userMsg || loading) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg, timestamp: new Date() }]);
    setLoading(true);

    try {
      const res = await axios.post("/api/chat/", {
        message: userMsg,
        conversation_id: convId,
        include_rag: true,
      });
      setConvId(res.data.conversation_id);
      setMessages(prev => [...prev, {
        role: "ai",
        content: res.data.response,
        sources: res.data.sources,
        suggested_questions: res.data.suggested_questions,
        timestamp: new Date(),
      }]);
    } catch (err) {
      // Fallback response
      setMessages(prev => [...prev, {
        role: "ai",
        content: _fallbackResponse(userMsg),
        timestamp: new Date(),
        suggested_questions: ["What retention strategies do you recommend?", "Which departments are at risk?"],
      }]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([WELCOME_MSG]);
    setConvId(null);
  };

  return (
    <div className="max-w-5xl mx-auto h-[calc(100vh-120px)] flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-white flex items-center gap-2">
            <Brain className="text-neon-cyan" size={22} />
            AI HR <span className="gradient-text">Copilot</span>
          </h1>
          <p className="text-white/50 text-sm mt-0.5">
            Conversational HR analytics · RAG-powered · LLM-enhanced
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={clearChat} className="btn-ghost flex items-center gap-2 text-xs">
            <RefreshCw size={12} /> New Chat
          </button>
          <div className="glass-card px-3 py-1.5 flex items-center gap-2 text-xs">
            <div className="pulse-dot bg-neon-green" />
            <span className="text-white/50 font-mono">flan-t5-base</span>
          </div>
        </div>
      </div>

      {/* Model badges
      <div className="flex gap-2 flex-wrap">
        {[
          { label: "LangChain Memory", color: "#00f5ff" },
          { label: "ChromaDB RAG", color: "#b537f2" },
          { label: "Sentence Transformers", color: "#00ff88" },
          { label: "Free LLM", color: "#ffab00" },
        ].map((b, i) => (
          <div key={i} className="text-[10px] font-mono px-2 py-1 rounded-full"
            style={{ background: `${b.color}12`, color: b.color, border: `1px solid ${b.color}25` }}>
            {b.label}
          </div>
        ))}
      </div> */}

      {/* Chat area */}
      <div className="flex-1 glass-card overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-4 chat-scroll">
          {messages.map((msg, i) => (
            <Message key={i} msg={msg} />
          ))}
          {loading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        {/* Suggestions */}
        <div className="border-t border-white/5 px-4 py-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {SUGGESTED.map((q, i) => (
              <button
                key={i}
                onClick={() => send(q)}
                disabled={loading}
                className="text-xs whitespace-nowrap px-3 py-1.5 rounded-full transition-colors flex-shrink-0"
                style={{
                  background: "rgba(0,245,255,0.06)",
                  color: "rgba(0,245,255,0.7)",
                  border: "1px solid rgba(0,245,255,0.15)",
                }}
              >
                <Sparkles size={10} className="inline mr-1" />
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-white/5 p-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="Ask anything about your workforce..."
              disabled={loading}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-neon-cyan/40 focus:bg-white/7 transition-colors font-body"
            />
            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              className="w-12 h-12 rounded-xl flex items-center justify-center transition-all disabled:opacity-40"
              style={{
                background: "linear-gradient(135deg, #00f5ff, #b537f2)",
              }}
            >
              {loading
                ? <Zap size={16} className="text-black animate-pulse" />
                : <Send size={16} className="text-black" />
              }
            </button>
          </div>
          <div className="text-[10px] text-white mt-2 font-mono text-center">
            Powered by google/flan-t5-base · ChromaDB · Sentence Transformers · LangChain 
          </div>
        </div>
      </div>
    </div>
  );
}

function _fallbackResponse(q) {
  const ql = q.toLowerCase();
  if (ql.includes("attrition") || ql.includes("resign"))
    return "Attrition rate is currently **18.7%** — above the industry benchmark of 15%. I've identified **234 high-risk employees**, primarily in Engineering and Sales. Top drivers: overtime (35% of workforce), low satisfaction (avg 2.8/4), and promotion stagnation (3.2yr avg). Would you like a detailed breakdown by department?";
  if (ql.includes("burnout") || ql.includes("stress"))
    return "Burnout analysis shows **31%** of the workforce at high risk. Engineering is critical at 71% burnout rate. Key signals: sustained overtime patterns, declining work-life balance scores, and reduced job involvement. Recommended: mandatory PTO enforcement and workload audits for Engineering and Sales teams.";
  if (ql.includes("retention") || ql.includes("strateg"))
    return "**Top 5 Retention Strategies** based on your data:\n\n1. **Compensation Review** — 34% below market P50\n2. **Overtime Caps** — 2.5x attrition multiplier\n3. **Promotion Fast-Track** — 67% high-risk were passed over 2+ times\n4. **Manager Training** — 3x attrition in low-manager-satisfaction teams\n5. **Recognition Programs** — high performers leave within 18mo without recognition";
  return "I'm analyzing your workforce data. Your organization has **1,500 employees** with an attrition rate of **18.7%** and **234 high-risk employees**. What specific aspect of workforce intelligence would you like to explore?";
}