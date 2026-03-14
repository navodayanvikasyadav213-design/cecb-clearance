import { useState } from "react";
import Layout from "../components/Layout";
import StatusBadge from "../components/StatusBadge";
import { useAllApplications } from "../hooks/useApplications";
import { api } from "../config/api";
import toast from "react-hot-toast";
import { Users, FileText, Shield, Loader2, Search, RefreshCw, CheckCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

function useUsers() {
  return useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const res = await api.get("/api/admin/users");
      return res.data.data.users;
    },
  });
}

function useUpdateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      api.patch(`/api/admin/users/${id}/role`, { role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

const ROLES = ["ADMIN", "PROPONENT", "SCRUTINY", "MOM_TEAM"];
const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrator", PROPONENT: "Project Proponent",
  SCRUTINY: "Scrutiny Officer", MOM_TEAM: "MoM Team",
};

export default function AdminDashboard() {
  const { data: appData, isLoading: appsLoading } = useAllApplications();
  const { data: users = [], isLoading: usersLoading } = useUsers();
  const updateRole = useUpdateRole();
  const [activeTab, setActiveTab] = useState<"overview" | "users">("overview");
  const [search, setSearch] = useState("");

  const filteredUsers = users.filter((u: any) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleRoleChange = async (id: string, role: string) => {
    try {
      await updateRole.mutateAsync({ id, role });
      toast.success("Role updated");
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to update role");
    }
  };

  const handleAuditVerify = async () => {
    try {
      const res = await api.get("/api/admin/audit/verify");
      const { valid, totalEvents, tamperedEventIds } = res.data.data;
      if (valid) {
        toast.success(`✅ Audit chain is valid — ${totalEvents} events verified`);
      } else {
        toast.error(`⚠️ Tampered events detected: IDs ${tamperedEventIds.join(", ")}`);
      }
    } catch {
      toast.error("Audit chain verification failed");
    }
  };

  const stats = appData?.stats ?? {};
  const applications = appData?.applications ?? [];

  return (
    <Layout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Admin Dashboard</h1>
            <p className="text-gray-400 text-sm mt-1">System overview, user management, and audit controls</p>
          </div>
          <button
            onClick={handleAuditVerify}
            className="flex items-center gap-2 text-sm px-4 py-2 border border-gray-200
                       rounded-lg text-gray-600 hover:bg-gray-50 transition"
          >
            <CheckCircle size={14} /> Verify Audit Chain
          </button>
        </div>

        {/* System Stats */}
        {!appsLoading && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: "Total Applications", value: stats.total ?? 0, color: "text-gray-700" },
              { label: "Under Scrutiny",     value: (stats.submitted ?? 0) + (stats.underScrutiny ?? 0), color: "text-blue-500" },
              { label: "Referred / MoM",     value: (stats.referred ?? 0) + (stats.momGenerated ?? 0), color: "text-amber-500" },
              { label: "Finalized",          value: stats.finalized ?? 0, color: "text-green-600" },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-100">
          {[["overview", "All Applications", FileText], ["users", "User Management", Users]].map(([key, label, Icon]: any) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition
                ${activeTab === key
                  ? "border-forest text-forest"
                  : "border-transparent text-gray-400 hover:text-gray-600"}`}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {/* All Applications Tab */}
        {activeTab === "overview" && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            {appsLoading ? (
              <div className="py-16 text-center">
                <Loader2 size={28} className="text-gray-300 mx-auto mb-3 animate-spin" />
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {["Project","Proponent","District","Sector","Status","Updated"].map((h) => (
                      <th key={h} className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-5 py-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {applications.map((app: any) => (
                    <tr key={app.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => window.location.href = `/applications/${app.id}`}>
                      <td className="px-5 py-3 font-medium text-gray-800">{app.projectName}</td>
                      <td className="px-5 py-3 text-gray-500 text-xs">{app.proponent?.name}</td>
                      <td className="px-5 py-3 text-gray-500">{app.district}</td>
                      <td className="px-5 py-3 text-gray-500">{app.sector}</td>
                      <td className="px-5 py-3"><StatusBadge status={app.status} /></td>
                      <td className="px-5 py-3 text-gray-400 text-xs">
                        {new Date(app.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* User Management Tab */}
        {activeTab === "users" && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1 max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                <input
                  type="text"
                  placeholder="Search users…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-forest outline-none"
                />
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              {usersLoading ? (
                <div className="py-12 text-center">
                  <Loader2 size={24} className="text-gray-300 mx-auto animate-spin" />
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {["Name","Email","Role","Applications","Joined","Change Role"].map((h) => (
                        <th key={h} className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-5 py-3">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredUsers.map((u: any) => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-5 py-3 font-medium text-gray-800">{u.name}</td>
                        <td className="px-5 py-3 text-gray-500">{u.email}</td>
                        <td className="px-5 py-3">
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                            {ROLE_LABELS[u.role] || u.role}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-gray-500 text-center">{u._count?.applications ?? 0}</td>
                        <td className="px-5 py-3 text-gray-400 text-xs">
                          {new Date(u.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-5 py-3">
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            disabled={updateRole.isPending}
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600
                                       focus:ring-2 focus:ring-forest outline-none bg-white"
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
