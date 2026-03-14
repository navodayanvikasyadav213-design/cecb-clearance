import { useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import StatusBadge from "../components/StatusBadge";
import { useApplications } from "../hooks/useApplications";
import { useStartScrutiny, useIssueEds, useReferApplication, useTriggerGist } from "../hooks/useApplications";
import { useVerifyDocument } from "../hooks/useApplications";
import {
  Loader2, Search, FileText, CheckCircle2, AlertTriangle, ChevronRight, X, Eye
} from "lucide-react";
import toast from "react-hot-toast";

const SCRUTINY_STATUSES = ["SUBMITTED", "UNDER_SCRUTINY", "EDS"];

export default function ScrutinyDashboard() {
  const { data: applications = [], isLoading } = useApplications();
  const startScrutinyMutation = useStartScrutiny();
  const issueEdsMutation = useIssueEds();
  const referMutation = useReferApplication();
  const triggerGistMutation = useTriggerGist();
  const verifyDocMutation = useVerifyDocument();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [edsModal, setEdsModal] = useState<{ id: string; name: string } | null>(null);
  const [edsText, setEdsText] = useState("");

  const queue = applications.filter((a: any) =>
    SCRUTINY_STATUSES.includes(a.status) &&
    (statusFilter === "ALL" || a.status === statusFilter) &&
    (a.projectName.toLowerCase().includes(search.toLowerCase()) ||
     a.district.toLowerCase().includes(search.toLowerCase()))
  );

  const handleStartScrutiny = async (id: string) => {
    try {
      await startScrutinyMutation.mutateAsync(id);
      toast.success("Moved to Under Scrutiny");
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed");
    }
  };

  const handleIssueEds = async () => {
    if (!edsModal || !edsText.trim()) return;
    try {
      await issueEdsMutation.mutateAsync({ id: edsModal.id, deficiencies: edsText });
      toast.success("EDS notice issued");
      setEdsModal(null);
      setEdsText("");
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to issue EDS");
    }
  };

  const handleRefer = async (id: string) => {
    try {
      await referMutation.mutateAsync(id);
      toast.success("Referred to meeting — generating AI gist…");
      await triggerGistMutation.mutateAsync(id);
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to refer");
    }
  };

  return (
    <Layout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-800">Scrutiny Queue</h1>
          <p className="text-gray-400 text-sm mt-1">Review applications, verify documents, issue EDS or refer to meeting</p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
            <input
              type="text"
              placeholder="Search project or district…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm
                         focus:ring-2 focus:ring-forest outline-none"
            />
          </div>
          {["ALL", "SUBMITTED", "UNDER_SCRUTINY", "EDS"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition
                ${statusFilter === s
                  ? "bg-forest text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
            >
              {s.replace("_", " ")}
            </button>
          ))}
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Submitted", count: applications.filter((a: any) => a.status === "SUBMITTED").length, color: "text-blue-500" },
            { label: "Under Scrutiny", count: applications.filter((a: any) => a.status === "UNDER_SCRUTINY").length, color: "text-amber-500" },
            { label: "EDS Pending", count: applications.filter((a: any) => a.status === "EDS").length, color: "text-red-500" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Queue table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="py-16 text-center">
              <Loader2 size={28} className="text-gray-300 mx-auto mb-3 animate-spin" />
            </div>
          ) : queue.length === 0 ? (
            <div className="py-16 text-center">
              <FileText size={32} className="text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">No applications in queue</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["Project","Proponent","District","Docs","Fee","Status","Actions"].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-5 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {queue.map((app: any) => {
                  const docsVerified = app.documents?.filter((d: any) => d.verified).length;
                  const docsTotal = app.documents?.length ?? 0;
                  const feePaid = app.payments?.[0]?.verified;
                  return (
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
                        <span className={`text-xs font-medium ${docsVerified === docsTotal && docsTotal > 0 ? "text-green-600" : "text-amber-500"}`}>
                          {docsVerified}/{docsTotal}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-xs font-medium ${feePaid ? "text-green-600" : "text-gray-400"}`}>
                          {feePaid ? "Paid ✓" : "Unpaid"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={app.status} />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Link to={`/applications/${app.id}`}
                                className="p-1.5 bg-gray-100 rounded hover:bg-gray-200 text-gray-500 transition">
                            <Eye size={13} />
                          </Link>
                          {app.status === "SUBMITTED" && (
                            <button
                              onClick={() => handleStartScrutiny(app.id)}
                              disabled={startScrutinyMutation.isPending}
                              className="text-xs px-2.5 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition whitespace-nowrap"
                            >
                              Start Scrutiny
                            </button>
                          )}
                          {app.status === "UNDER_SCRUTINY" && (
                            <>
                              <button
                                onClick={() => setEdsModal({ id: app.id, name: app.projectName })}
                                className="text-xs px-2.5 py-1 bg-amber-500 text-white rounded hover:bg-amber-600 transition"
                                title="Issue EDS"
                              >
                                <AlertTriangle size={12} />
                              </button>
                              <button
                                onClick={() => handleRefer(app.id)}
                                disabled={referMutation.isPending}
                                className="text-xs px-2.5 py-1 bg-forest text-white rounded hover:bg-green transition flex items-center gap-1"
                              >
                                Refer <ChevronRight size={11} />
                              </button>
                            </>
                          )}
                          {app.status === "EDS" && (
                            <span className="text-xs text-red-400 font-medium">Awaiting proponent</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* EDS Modal */}
      {edsModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">Issue EDS Notice</h3>
              <button onClick={() => setEdsModal(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-3">
              Project: <span className="font-medium text-gray-700">{edsModal.name}</span>
            </p>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Describe the deficiencies / missing documents:
            </label>
            <textarea
              rows={5}
              value={edsText}
              onChange={(e) => setEdsText(e.target.value)}
              placeholder="e.g. Missing environmental impact assessment report, land ownership certificate not uploaded…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                         focus:ring-2 focus:ring-amber-400 outline-none resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setEdsModal(null)}
                      className="flex-1 py-2 text-sm border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={handleIssueEds}
                disabled={!edsText.trim() || issueEdsMutation.isPending}
                className="flex-1 py-2 text-sm bg-amber-500 text-white rounded-lg
                           hover:bg-amber-600 disabled:opacity-50 transition font-medium"
              >
                {issueEdsMutation.isPending ? "Issuing…" : "Issue EDS"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
