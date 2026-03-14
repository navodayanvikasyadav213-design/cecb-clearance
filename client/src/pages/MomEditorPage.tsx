import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { useApplication, useUpdateGist, useFinalizeMom } from "../hooks/useApplications";
import { api } from "../config/api";
import toast from "react-hot-toast";
import { Loader2, Lock, Download, ArrowLeft, RefreshCw, Check } from "lucide-react";

export default function MomEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: app, isLoading, refetch } = useApplication(id!);
  const updateGist = useUpdateGist();
  const finalizeM = useFinalizeMom();

  const [gistText, setGistText] = useState("");
  const [saved, setSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (app) {
      setGistText(app.gistText || app.momText || "");
    }
  }, [app]);

  const handleSave = async () => {
    if (!id) return;
    try {
      await updateGist.mutateAsync({ id, gistText });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      toast.success("Gist saved");
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to save");
    }
  };

  const handleFinalize = async () => {
    if (!id) return;
    if (!window.confirm("Finalize and lock this MoM? This action cannot be undone.")) return;
    try {
      await handleSave();
      await finalizeM.mutateAsync(id);
      toast.success("MoM finalized and locked!");
      refetch();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to finalize");
    }
  };

  const handleExport = async (format: "pdf" | "html" | "docx") => {
    try {
      const isBinary = format === "docx";
      const res = await api.get(`/api/applications/${id}/mom/export?format=${format}`, {
        responseType: isBinary ? "arraybuffer" : "json",
      });
      
      if (format === "html") {
        const blob = new Blob([res.data], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const w = window.open(url, "_blank");
        if (w) { w.focus(); setTimeout(() => { w.print(); }, 500); }
      } else if (format === "docx") {
        const blob = new Blob([res.data], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `MoM_${app?.projectName?.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0,10)}.docx`;
        a.click();
      } else {
        const { content, projectName } = res.data.data;
        const blob = new Blob([content], { type: "text/plain" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `MoM_${projectName}_${new Date().toISOString().slice(0,10)}.txt`;
        a.click();
      }
    } catch (e: any) {
      console.error(e);
      toast.error("Export failed");
    }
  };

  if (isLoading) return (
    <Layout>
      <div className="flex items-center justify-center h-screen">
        <Loader2 size={32} className="animate-spin text-gray-300" />
      </div>
    </Layout>
  );

  const isLocked = app?.momLocked;

  return (
    <Layout>
      <div className="p-8 max-w-5xl">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-6 transition"
        >
          <ArrowLeft size={14} /> Back
        </button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-800">MoM Editor</h1>
            <p className="text-sm text-gray-400 mt-1">{app?.projectName} · {app?.sector}</p>
          </div>
          <div className="flex items-center gap-3">
            {isLocked && (
              <span className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-3 py-1.5 rounded-full font-medium">
                <Lock size={12} /> Finalized & Locked
              </span>
            )}
            {!isLocked && (
              <>
                <button
                  onClick={handleSave}
                  disabled={updateGist.isPending}
                  className="flex items-center gap-1.5 text-sm px-4 py-2 border border-gray-200
                             rounded-lg text-gray-600 hover:bg-gray-50 transition"
                >
                  {saved
                    ? <><Check size={14} className="text-green-500" /> Saved</>
                    : updateGist.isPending
                    ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                    : "Save Draft"}
                </button>
                <button
                  onClick={handleFinalize}
                  disabled={finalizeM.isPending}
                  className="flex items-center gap-1.5 text-sm px-4 py-2 bg-forest text-white
                             rounded-lg hover:bg-green transition font-medium"
                >
                  <Lock size={14} />
                  {finalizeM.isPending ? "Locking…" : "Finalize MoM"}
                </button>
              </>
            )}
            <button
              onClick={() => handleExport("html")}
              className="flex items-center gap-1.5 text-sm px-3 py-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition"
              title="Export as PDF (browser print)"
            >
              <Download size={14} /> PDF
            </button>
            <button
              onClick={() => handleExport("docx")}
              className="flex items-center gap-1.5 text-sm px-3 py-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition"
              title="Export as Word Document"
            >
              <Download size={14} /> Word
            </button>
          </div>
        </div>

        {/* Gist generation status */}
        {app?.status === "REFERRED" && !app?.gistText && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-5 flex items-center gap-3">
            <RefreshCw size={16} className="text-amber-500 animate-spin" />
            <div>
              <p className="text-sm font-medium text-amber-700">AI is generating the meeting gist…</p>
              <p className="text-xs text-amber-500 mt-0.5">This may take 10–30 seconds. Refresh to check.</p>
            </div>
            <button onClick={() => refetch()} className="ml-auto text-xs text-amber-600 underline">Refresh</button>
          </div>
        )}

        {/* Editor */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Minutes of Meeting — Edit</p>
            <p className="text-xs text-gray-300">{gistText.length} characters</p>
          </div>
          <textarea
            ref={textareaRef}
            value={gistText}
            onChange={(e) => setGistText(e.target.value)}
            disabled={isLocked}
            className={`w-full p-6 text-sm text-gray-700 leading-relaxed font-mono resize-none outline-none
              ${isLocked ? "bg-gray-50 text-gray-400 cursor-not-allowed" : "bg-white focus:ring-0"}`}
            rows={30}
            placeholder="AI-generated gist will appear here. You can edit it before finalizing…"
          />
        </div>

        <p className="text-xs text-gray-300 mt-3 text-center">
          {isLocked
            ? "This MoM has been locked and published. No further edits are possible."
            : "Changes are saved as draft. Click 'Finalize MoM' to lock and publish."}
        </p>
      </div>
    </Layout>
  );
}
