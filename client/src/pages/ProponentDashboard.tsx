import { Link } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import Layout from "../components/Layout";
import StatusBadge from "../components/StatusBadge";
import { MOCK_APPLICATIONS } from "../mocks/applications";
import { Plus, FileText, Clock, CheckCircle } from "lucide-react";

export default function ProponentDashboard() {
  const user = useAuthStore((s) => s.user);

  // SYNC 2: replace MOCK_APPLICATIONS with real API call
  const applications = MOCK_APPLICATIONS;

  const stats = {
    total:    applications.length,
    draft:    applications.filter((a) => a.status === "DRAFT").length,
    active:   applications.filter((a) =>
      ["SUBMITTED","UNDER_SCRUTINY","EDS","REFERRED"].includes(a.status)).length,
    done:     applications.filter((a) => a.status === "FINALIZED").length,
  };

  return (
    <Layout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Welcome, {user?.name}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {user?.organization}
            </p>
          </div>
          <Link
            to="/apply"
            className="flex items-center gap-2 bg-forest text-white
                       px-4 py-2.5 rounded-lg text-sm font-medium
                       hover:bg-green transition"
          >
            <Plus size={16} />
            New Application
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total",    value: stats.total,  icon: FileText,    color: "text-gray-600",  bg: "bg-gray-50"   },
            { label: "Drafts",   value: stats.draft,  icon: Clock,       color: "text-yellow-600", bg: "bg-yellow-50" },
            { label: "Active",   value: stats.active, icon: Clock,       color: "text-blue-600",   bg: "bg-blue-50"   },
            { label: "Cleared",  value: stats.done,   icon: CheckCircle, color: "text-green-600",  bg: "bg-green-50"  },
          ].map((s) => (
            <div key={s.label}
                 className={`${s.bg} rounded-xl p-5 border border-gray-100`}>
              <s.icon size={20} className={`${s.color} mb-2`} />
              <p className="text-2xl font-bold text-gray-800">{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Applications table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">My Applications</h2>
            <span className="text-xs text-gray-400">{applications.length} total</span>
          </div>

          {applications.length === 0 ? (
            <div className="p-12 text-center">
              <FileText size={32} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No applications yet</p>
              <Link to="/apply"
                    className="text-forest text-sm font-medium hover:underline mt-2 inline-block">
                File your first application →
              </Link>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {["Project Name","Sector","District","Area (ha)","Status","Updated"].map((h) => (
                    <th key={h} className="text-left text-xs font-medium
                                           text-gray-500 px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {applications.map((app) => (
                  <tr key={app.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => window.location.href = `/applications/${app.id}`}>
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-800 text-sm">
                        {app.projectName}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">{app.sector}</td>
                    <td className="px-5 py-4 text-sm text-gray-600">{app.district}</td>
                    <td className="px-5 py-4 text-sm text-gray-600">{app.areaHa}</td>
                    <td className="px-5 py-4">
                      <StatusBadge status={app.status} />
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-400">
                      {new Date(app.updatedAt).toLocaleDateString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  );
}