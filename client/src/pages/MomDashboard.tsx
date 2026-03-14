import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import StatusBadge from "../components/StatusBadge";
import { useApplications } from "../hooks/useApplications";
import { FileText, Loader2, Edit, Lock } from "lucide-react";

const MOM_STATUSES = ["REFERRED", "MOM_GENERATED", "FINALIZED"];

export default function MomDashboard() {
  const { data: applications = [], isLoading } = useApplications();

  const queue = applications.filter((a: any) => MOM_STATUSES.includes(a.status));

  const counts = {
    referred:     queue.filter((a: any) => a.status === "REFERRED").length,
    momGenerated: queue.filter((a: any) => a.status === "MOM_GENERATED").length,
    finalized:    queue.filter((a: any) => a.status === "FINALIZED").length,
  };

  return (
    <Layout>
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-800">MoM Team Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">Review AI-generated gists and finalize Minutes of Meeting</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Referred (Gist pending)", count: counts.referred,     color: "text-amber-500" },
            { label: "Ready for MoM edit",      count: counts.momGenerated, color: "text-blue-500"  },
            { label: "Finalized",               count: counts.finalized,    color: "text-green-600" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Applications list */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-700 text-sm">Applications Queue</h2>
            <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">{queue.length} total</span>
          </div>

          {isLoading ? (
            <div className="py-16 text-center">
              <Loader2 size={28} className="text-gray-300 mx-auto mb-3 animate-spin" />
            </div>
          ) : queue.length === 0 ? (
            <div className="py-16 text-center">
              <FileText size={32} className="text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">No applications referred yet</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["Project","Proponent","District","Gist","Status","Actions"].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-5 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {queue.map((app: any) => (
                  <tr key={app.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-800">{app.projectName}</p>
                      <p className="text-xs text-gray-400">{app.sector}</p>
                    </td>
                    <td className="px-5 py-4 text-gray-500 text-xs">
                      <p>{app.proponent?.name}</p>
                      <p className="text-gray-300">{app.proponent?.organization}</p>
                    </td>
                    <td className="px-5 py-4 text-gray-500">{app.district}</td>
                    <td className="px-5 py-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                        ${app.gistText ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-500"}`}>
                        {app.gistText ? "Generated" : "Pending AI"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={app.status} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Link to={`/applications/${app.id}`}
                              className="text-xs px-2.5 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition">
                          View
                        </Link>
                        {app.status === "MOM_GENERATED" && (
                          <Link to={`/mom/${app.id}`}
                                className="flex items-center gap-1 text-xs px-2.5 py-1 bg-forest text-white rounded hover:bg-green transition">
                            <Edit size={11} /> Edit MoM
                          </Link>
                        )}
                        {app.status === "FINALIZED" && (
                          <Link to={`/mom/${app.id}`}
                                className="flex items-center gap-1 text-xs px-2.5 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition">
                            <Lock size={11} /> View
                          </Link>
                        )}
                      </div>
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
