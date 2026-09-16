import { useState, useEffect } from "react";
import { Building2, Plus, Loader2, Users, UserCircle, Ban } from "lucide-react";
import { apiUrl } from "../lib/api";

export default function CompaniesPage() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ company_name: "", admin_full_name: "", admin_email: "", admin_password: "" });

  const loadCompanies = () => {
    setLoading(true);
    fetch(apiUrl("/api/auth/companies"), { credentials: "include" })
      .then(res => res.ok ? res.json() : Promise.reject(res.status))
      .then(data => setCompanies(data.companies || []))
      .catch(() => setError("Failed to load companies"))
      .finally(() => setLoading(false));
  };

  useEffect(loadCompanies, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      const res = await fetch(apiUrl("/api/auth/companies"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to create company");
      }
      setForm({ company_name: "", admin_full_name: "", admin_email: "", admin_password: "" });
      loadCompanies();
    } catch (err) {
      setError(err.message);
    }
    setCreating(false);
  };

  const handleDeactivate = async (id) => {
    if (!confirm("Deactivate this company? All of its users will be logged out and unable to sign in.")) return;
    await fetch(apiUrl(`/api/auth/companies/${id}`), { method: "DELETE", credentials: "include" });
    loadCompanies();
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="page-title flex items-center gap-2"><Building2 className="w-5 h-5" /> Companies</h1>
        <p className="text-sm text-white">Provision new tenant companies onto the platform</p>
      </div>

      <div className="card p-5">
        <p className="text-sm font-medium text-white mb-4 flex items-center gap-2"><Plus className="w-4 h-4" /> Create New Company</p>
        {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
        <form onSubmit={handleCreate} className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-xs text-white mb-1 block">Company Name</label>
            <input required value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 text-sm text-white" placeholder="Acme Corp" />
          </div>
          <div>
            <label className="text-xs text-white mb-1 block">Admin Full Name</label>
            <input required value={form.admin_full_name} onChange={e => setForm({ ...form, admin_full_name: e.target.value })}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 text-sm text-white" placeholder="Jane Doe" />
          </div>
          <div>
            <label className="text-xs text-white mb-1 block">Admin Email</label>
            <input required type="email" value={form.admin_email} onChange={e => setForm({ ...form, admin_email: e.target.value })}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 text-sm text-white" placeholder="admin@acme.com" />
          </div>
          <div>
            <label className="text-xs text-white mb-1 block">Admin Password</label>
            <input required type="password" value={form.admin_password} onChange={e => setForm({ ...form, admin_password: e.target.value })}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 text-sm text-white" placeholder="Strong password" />
          </div>
          <div className="col-span-2">
            <button type="submit" disabled={creating} className="btn-primary flex items-center gap-2">
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create Company
            </button>
          </div>
        </form>
      </div>

      <div className="card p-5">
        <p className="text-sm font-medium text-white mb-4">Existing Companies ({companies.length})</p>
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin text-white" />
        ) : companies.length === 0 ? (
          <p className="text-xs text-white">No companies yet — create the first one above.</p>
        ) : (
          <div className="space-y-2">
            {companies.map(c => (
              <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-900/50 border border-gray-700">
                <div>
                  <p className="text-sm text-white font-medium">{c.name} {!c.is_active && <span className="text-xs text-red-400">(deactivated)</span>}</p>
                  <div className="flex gap-4 mt-1 text-xs text-white">
                    <span className="flex items-center gap-1"><UserCircle className="w-3 h-3" /> {c.user_count} users</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {c.employee_count} employees</span>
                  </div>
                </div>
                {c.is_active && (
                  <button onClick={() => handleDeactivate(c.id)} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                    <Ban className="w-3 h-3" /> Deactivate
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
