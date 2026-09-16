import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Bot, TrendingUp, Brain, BarChart3, FileText, Users, BookOpen, ChevronLeft, ChevronRight, RefreshCw, LogOut, Activity, Building2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const NAV = [
  { group: "OVERVIEW", items: [
    { to: "/", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/copilot", icon: Bot, label: "HR Copilot" },
  ]},
  { group: "ANALYTICS", items: [
    { to: "/attrition", icon: TrendingUp, label: "Attrition Risk" },
    { to: "/sentiment", icon: Brain, label: "Employee Sentiment" },
    { to: "/forecast", icon: BarChart3, label: "Workforce Forecast" },
    { to: "/agents", icon: Activity, label: "AI Intelligence" },
  ]},
  { group: "TOOLS", items: [
    { to: "/documents", icon: BookOpen, label: "Policy Assistant" },
    { to: "/reports", icon: FileText, label: "Reports" },
    { to: "/retrain", icon: RefreshCw, label: "Model Retraining" },
  ]},
];

const SUPER_ADMIN_NAV = [
  { group: "PLATFORM", items: [
    { to: "/", icon: Building2, label: "Companies" },
  ]},
];

export default function Sidebar({ open, onToggle }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const nav = user?.role === "super_admin" ? SUPER_ADMIN_NAV : NAV;

  const handleLogout = () => { logout(); navigate("/login"); };

  return (
    <aside className={`fixed left-0 top-0 h-full flex flex-col transition-all duration-300 z-40 border-r ${open ? "w-56" : "w-14"}`}
      style={{ background: "#111827", borderColor: "#1f2937" }}>

      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4 border-b" style={{ borderColor: "#1f2937" }}>
        {open && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center">
              <Activity className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-white">WorkforceIQ</span>
          </div>
        )}
        <button onClick={onToggle} className="p-1 rounded text-white hover:text-white hover:bg-gray-800 transition-colors ml-auto">
          {open ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* User */}
      {open && user && (
        <div className="px-4 py-3 border-b" style={{ borderColor: "#1f2937" }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center text-xs font-semibold">
              {user.full_name?.[0] || "U"}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-white truncate">{user.full_name}</p>
              <p className="text-xs text-white capitalize">
                {user.role === "super_admin" ? "Platform Owner" : `${user.role}${user.company_name ? ` · ${user.company_name}` : ""}`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {nav.map(group => (
          <div key={group.group} className="mb-4">
            {open && <p className="text-xs text-gray-600 font-medium px-2 mb-1">{group.group}</p>}
            {group.items.map(item => (
              <NavLink key={item.to} to={item.to} end={item.to === "/"}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-2 py-2 rounded-lg text-xs font-medium transition-all mb-0.5 ${
                    isActive ? "bg-blue-600/15 text-blue-400 border border-blue-600/20" :
                    "text-white hover:text-white hover:bg-gray-800"
                  } ${!open ? "justify-center" : ""}`
                }>
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {open && <span className="truncate">{item.label}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-2 py-3 border-t" style={{ borderColor: "#1f2937" }}>
        {open && (
          <div className="flex items-center gap-1.5 px-2 mb-2">
            <div className="dot-green animate-pulse" />
            <span className="text-xs text-white">Systems operational</span>
          </div>
        )}
        <button onClick={handleLogout}
          className={`flex items-center gap-2 w-full px-2 py-2 rounded-lg text-xs text-white hover:text-red-400 hover:bg-gray-800 transition-colors ${!open ? "justify-center" : ""}`}>
          <LogOut className="w-4 h-4" />
          {open && "Sign out"}
        </button>
      </div>
    </aside>
  );
}