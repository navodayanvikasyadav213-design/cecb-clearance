import { useParams, Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useApplication, useSubmitApplication } from "../hooks/useApplications";
import { useAuthStore } from "../store/authStore";
import Layout from "../components/Layout";
import StatusBadge from "../components/StatusBadge";
import {
  Loader2, FileText, MapPin, Calendar, AlertCircle,
  CheckCircle2, ArrowLeft, Upload, CreditCard, ChevronRight
} from "lucide-react";
import { api } from "../config/api";
import toast from "react-hot-toast";

const STAGE_LABELS = [
  "DRAFT", "SUBMITTED", "UNDER_SCRUTINY", "EDS", "REFERRED", "MOM_GENERATED", "FINALIZED"
];

const STATUS_STEP: Record<string, number> = {
  DRAFT: 0, SUBMITTED: 1, UNDER_SCRUTINY: 2, EDS: 2,
  REFERRED: 3, MOM_GENERATED: 4, FINALIZED: 5,
};

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { data: app, isLoading, refetch } = useApplication(id!);
  const submitMutation = useSubmitApplication();
  const [utrNumber, setUtrNumber] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [initiatingPayment, setInitiatingPayment] = useState(false);

  const handleSubmit = async () => {
    try {
      await submitMutation.mutateAsync(id!);
      toast.success("Application submitted!");
      refetch();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to submit");
    }
  };

  const handleInitiatePayment = async () => {
    setInitiatingPayment(true);
    try {
      await api.post("/api/payments/initiate", { applicationId: id });
      toast.success("Payment initiated — scan the QR code");
      refetch();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to initiate payment");
    } finally {
      setInitiatingPayment(false);
    }
  };

  if (isLoading) return (
    <Layout>
      <div className="flex items-center justify-center h-screen">
        <Loader2 size={32} className="animate-spin text-gray-300" />
      </div>
    </Layout>
  );

  if (!app) return (
    <Layout>
      <div className="p-8 text-gray-400">Application not found.</div>
    </Layout>
  );

  const step = STATUS_STEP[app.status] ?? 0;
  const isProponent = user?.role === "PROPONENT";
  const payment = app.payments?.[0];

  return (
    <Layout>
      <div className="p-8 max-w-5xl">
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-6 transition"
        >
          <ArrowLeft size={14} /> Back
        </button>

        {/* Title row */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-800">{app.projectName}</h1>
            <p className="text-gray-400 text-sm mt-1">{app.sector} · {app.district}, {app.state}</p>
          </div>
          <StatusBadge status={app.status} />
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Application Journey</p>
          <div className="flex items-center gap-0">
            {["Draft","Submitted","Under Scrutiny","Referred","MoM","Finalized"].map((label, i) => (
              <div key={label} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2
                    ${i < step ? "bg-forest border-forest text-white"
                      : i === step ? "bg-white border-forest text-forest"
                      : "bg-gray-50 border-gray-200 text-gray-400"}`}>
                    {i < step ? <CheckCircle2 size={14} /> : i + 1}
                  </div>
                  <p className={`text-[10px] mt-1 font-medium ${i <= step ? "text-forest" : "text-gray-300"}`}>{label}</p>
                </div>
                {i < 5 && <div className={`h-0.5 flex-1 mx-1 ${i < step ? "bg-forest" : "bg-gray-100"}`} />}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Left: Project Info */}
          <div className="col-span-2 space-y-4">
            {/* Details card */}
            <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
              <h2 className="font-semibold text-gray-700 text-sm mb-4">Project Details</h2>
              <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                {[
                  ["Sector", app.sector],
                  ["District", app.district],
                  ["State", app.state],
                  ["Area (ha)", app.areaHa ?? "—"],
                  ["Latitude", app.lat ?? "—"],
                  ["Longitude", app.lng ?? "—"],
                  ["Fee Amount", app.feeAmount ? `₹${app.feeAmount.toLocaleString("en-IN")}` : "—"],
                  ["Fee Paid", app.feePaid ? "Yes ✓" : "No"],
                ].map(([label, value]) => (
                  <div key={label as string}>
                    <dt className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</dt>
                    <dd className="text-gray-700 mt-0.5">{String(value)}</dd>
                  </div>
                ))}
              </dl>
              {app.description && (
                <div className="mt-4 pt-4 border-t border-gray-50">
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Description</p>
                  <p className="text-sm text-gray-600">{app.description}</p>
                </div>
              )}
            </div>

            {/* Documents */}
            <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-700 text-sm">Documents</h2>
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                  {app.documents?.length ?? 0} files
                </span>
              </div>
              {app.documents?.length === 0 ? (
                <p className="text-sm text-gray-400">No documents uploaded yet.</p>
              ) : (
                <ul className="space-y-2">
                  {app.documents?.map((doc: any) => (
                    <li key={doc.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">{doc.fileName}</p>
                          <p className="text-xs text-gray-400">{doc.docType}</p>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        doc.verified ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600"
                      }`}>
                        {doc.verified ? "Verified" : "Pending"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* EDS Notices */}
            {app.edsNotices?.length > 0 && (
              <div className="bg-red-50 rounded-xl border border-red-100 p-6 shadow-sm">
                <h2 className="font-semibold text-red-700 text-sm mb-3 flex items-center gap-2">
                  <AlertCircle size={14} /> Essential Document Sought (EDS) Notice
                </h2>
                {app.edsNotices.map((n: any) => (
                  <div key={n.id} className="text-sm text-red-600">
                    <p className="font-medium mb-1">Deficiencies:</p>
                    <p className="text-red-500 leading-relaxed">{n.deficiencies}</p>
                    <p className="text-xs text-red-400 mt-2">Issued: {new Date(n.issuedAt).toLocaleDateString("en-IN")}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Audit timeline */}
            <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
              <h2 className="font-semibold text-gray-700 text-sm mb-4">Activity Timeline</h2>
              {app.auditEvents?.length === 0 ? (
                <p className="text-sm text-gray-400">No activity recorded yet.</p>
              ) : (
                <ul className="space-y-3">
                  {app.auditEvents?.map((e: any) => (
                    <li key={e.id} className="flex items-start gap-3 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-forest mt-2 shrink-0" />
                      <div>
                        <p className="font-medium text-gray-700">{e.eventType.replace(/_/g, " ")}</p>
                        <p className="text-xs text-gray-400">
                          by {e.actor?.name ?? "System"} · {new Date(e.createdAt).toLocaleString("en-IN")}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="space-y-4">
            {/* Action card */}
            {isProponent && (
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                <h2 className="font-semibold text-gray-700 text-sm mb-4">Actions</h2>

                {app.status === "DRAFT" && (
                  <button
                    onClick={handleSubmit}
                    disabled={submitMutation.isPending}
                    className="w-full bg-forest text-white text-sm font-medium py-2.5 rounded-lg
                               hover:bg-green transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {submitMutation.isPending
                      ? <><Loader2 size={14} className="animate-spin" /> Submitting…</>
                      : <>Submit Application <ChevronRight size={14} /></>}
                  </button>
                )}

                {app.status === "SUBMITTED" && !payment && (
                  <button
                    onClick={handleInitiatePayment}
                    disabled={initiatingPayment}
                    className="w-full bg-blue-600 text-white text-sm font-medium py-2.5 rounded-lg
                               hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {initiatingPayment
                      ? <><Loader2 size={14} className="animate-spin" /> Loading…</>
                      : <><CreditCard size={14} /> Generate Payment QR</>}
                  </button>
                )}

                {payment && !payment.verified && (
                  <div className="space-y-3">
                    <div className="bg-blue-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-blue-600 font-semibold mb-2">
                        Amount: ₹{payment.amount?.toLocaleString("en-IN")}
                      </p>
                      <p className="text-xs text-blue-400 break-all">
                        UPI: cecb.cg@icicipay
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Pay via UPI and enter UTR below
                      </p>
                    </div>
                    <input
                      type="text"
                      placeholder="UTR / Transaction ID"
                      value={utrNumber}
                      onChange={(e) => setUtrNumber(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-forest outline-none"
                    />
                    <p className="text-xs text-gray-400">Submit UTR to scrutiny team for verification</p>
                  </div>
                )}

                {payment?.verified && (
                  <div className="flex items-center gap-2 text-green-600 text-sm">
                    <CheckCircle2 size={16} />
                    Payment Verified ✓
                  </div>
                )}

                {app.status === "EDS" && (
                  <Link
                    to={`/apply?resumeId=${id}`}
                    className="w-full bg-amber-500 text-white text-sm font-medium py-2.5 rounded-lg
                               hover:bg-amber-600 transition flex items-center justify-center gap-2"
                  >
                    <Upload size={14} /> Re-upload Documents
                  </Link>
                )}
              </div>
            )}

            {/* GIS Risk Flags */}
            {app.gisRiskFlags?.length > 0 && (
              <div className="bg-white rounded-xl border border-red-100 p-5 shadow-sm">
                <h2 className="font-semibold text-red-700 text-sm mb-3">GIS Risk Flags</h2>
                <ul className="space-y-2">
                  {app.gisRiskFlags.map((f: any) => (
                    <li key={f.id} className="text-xs">
                      <span className={`inline-block px-1.5 py-0.5 rounded font-medium mr-1.5
                        ${f.severity === "HIGH" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"}`}>
                        {f.severity}
                      </span>
                      {f.layerName} — {f.distanceM}m
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* MoM Gist (for MOM/FINALIZED) */}
            {["MOM_GENERATED","FINALIZED"].includes(app.status) && app.gistText && (
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                <h2 className="font-semibold text-gray-700 text-sm mb-2">Meeting Gist</h2>
                <p className="text-xs text-gray-400 line-clamp-4">{app.gistText}</p>
                {user?.role === "MOM_TEAM" && (
                  <Link to={`/mom/${id}`}
                        className="text-xs text-forest font-medium hover:underline mt-2 inline-block">
                    Open MoM Editor →
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
