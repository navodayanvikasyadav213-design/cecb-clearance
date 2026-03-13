import { Link } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import Layout from "../components/Layout";
import StatusBadge from "../components/StatusBadge";
import { MOCK_APPLICATIONS } from "../mocks/application";
import { PlusCircle, FileText, Clock, CheckCircle, AlertCircle } from "lucide-react";

export default function ProponentDashboard() {
  const user = useAuthStore((s) => s.user);

  // Swap with real API on Day 4:
  // const { data: applications = [] } = useApplications();
  const applications = MOCK_APPLICATIONS;

  const counts = {
    total:   applications.length,
    draft:   applications.filter((a) => a.status === "DRAFT").length,
    active:  applications.filter((a) =>
               ["SUBMITTED","UNDER_SCRUTINY","EDS","REFERRED"].includes(a.status)).length,
    cleared: applications.filter((a) => a.status === "FINALIZED").length,
  };

  return (
    <Layout>
      <div className="p-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-bold text-gray-800">
              Good morning, {user?.name?.split(" ")[0]} 👋
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">{user?.organization}</p>
          </div>
          <Link
            to="/apply"
            className="flex items-center gap-2 bg-forest text-white text-sm
                       font-medium px-4 py-2.5 rounded-lg hover:bg-green transition"
          >
            <PlusCircle size={15} />
            New Application
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total",    value: counts.total,   icon: FileText,    bg: "bg-gray-50",    color: "text-gray-500"   },
            { label: "Drafts",   value: counts.draft,   icon: Clock,       bg: "bg-amber-50",   color: "text-amber-500"  },
            { label: "In Review",value: counts.active,  icon: AlertCircle, bg: "bg-blue-50",    color: "text-blue-500"   },
            { label: "Cleared",  value: counts.cleared, icon: CheckCircle, bg: "bg-green-50",   color: "text-green-500"  },
          ].map((s) => (
            <div key={s.label}
                 className={`${s.bg} rounded-xl p-5 border border-white shadow-sm`}>
              <s.icon size={18} className={`${s.color} mb-3`} />
              <p className="text-2xl font-bold text-gray-800">{s.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Applications table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800 text-sm">My Applications</h2>
            <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
              {applications.length} total
            </span>
          </div>

          {applications.length === 0 ? (
            <div className="py-16 text-center">
              <FileText size={32} className="text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">No applications yet</p>
              <Link to="/apply"
                    className="text-forest text-sm font-medium hover:underline mt-2 inline-block">
                Start your first application →
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {["Project Name","Sector","District","Area (ha)","Status","Last Updated"].map((h) => (
                      <th key={h}
                          className="text-left text-xs font-medium text-gray-400
                                     uppercase tracking-wide px-6 py-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {applications.map((app) => (
                    <tr key={app.id}
                        className="hover:bg-gray-50 cursor-pointer transition"
                        onClick={() => window.location.href = `/applications/${app.id}`}>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-800">{app.projectName}</p>
                      </td>
                      <td className="px-6 py-4 text-gray-500">{app.sector}</td>
                      <td className="px-6 py-4 text-gray-500">{app.district}</td>
                      <td className="px-6 py-4 text-gray-500">{app.areaHa}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={app.status} />
                      </td>
                      <td className="px-6 py-4 text-gray-400 text-xs">
                        {new Date(app.updatedAt).toLocaleDateString("en-IN", {
                          day: "numeric", month: "short", year: "numeric"
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}