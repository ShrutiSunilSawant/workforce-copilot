import React, { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Copilot from "./pages/Copilot";
import AttritionPage from "./pages/AttritionPage";
import SentimentPage from "./pages/SentimentPage";
import ForecastPage from "./pages/ForecastPage";
import DocumentsPage from "./pages/DocumentsPage";
import AgentsPage from "./pages/AgentsPage";
import ReportsPage from "./pages/ReportsPage";
import LoginPage from "./pages/LoginPage";
import RetrainPage from "./pages/RetrainPage";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-ink-950">
      <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <main className={`flex-1 overflow-hidden flex flex-col transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-16"}`}>
        <div className="flex-1 overflow-y-auto p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/copilot" element={<Copilot />} />
            <Route path="/attrition" element={<AttritionPage />} />
            <Route path="/sentiment" element={<SentimentPage />} />
            <Route path="/forecast" element={<ForecastPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/agents" element={<AgentsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/retrain" element={<RetrainPage />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-ink-950">
      <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/*" element={
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
