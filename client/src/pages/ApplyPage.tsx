import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { api } from "../config/api";
import Layout from "../components/Layout";
import toast from "react-hot-toast";
import { ChevronRight, ChevronLeft, Upload, MapPin } from "lucide-react";
import { SECTORS, DISTRICTS } from "../mocks/application";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix Leaflet default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ── Zod schemas for each step ─────────────────────────────────────────────────
const step1Schema = z.object({
  projectName: z.string().min(3, "Min 3 characters"),
  sector:      z.string().min(1, "Select a sector"),
  district:    z.string().min(1, "Select a district"),
  areaHa:      z.coerce.number().positive("Must be positive"),
  description: z.string().optional(),
});

type Step1Data = z.infer<typeof step1Schema>;

// ── Map click handler ─────────────────────────────────────────────────────────
function MapClickHandler({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

const STEPS = ["Project Details", "Location Map", "Upload Docs", "Review & Submit"];

export default function ApplyPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Step 1 data
  const { register, handleSubmit, getValues,
          formState: { errors } } = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: { description: "" },
  });

  // Step 2 data
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);

  // Step 3 data
  const [files, setFiles]       = useState<{ docType: string; file: File }[]>([]);
  const [docType, setDocType]   = useState("EIA Report");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const DOC_TYPES = [
    "EIA Report", "Project Report", "Site Plan", "NOC",
    "Land Document", "Fee Receipt", "Other",
  ];

  const addFile = () => {
    if (!selectedFile) return toast.error("Select a file first");
    setFiles((prev) => [...prev, { docType, file: selectedFile }]);
    setSelectedFile(null);
    toast.success(`${docType} added`);
  };

  // Final submit
  const onSubmit = async () => {
    setLoading(true);
    try {
      const step1 = getValues();

      // SYNC 2: create application
      const res = await api.post("/api/applications", {
        ...step1,
        lat: position?.lat,
        lng: position?.lng,
      });
      const appId = res.data.data.application.id;

      // SYNC 3: upload documents
      for (const { docType, file } of files) {
        const form = new FormData();
        form.append("file",    file);
        form.append("docType", docType);
        await api.post(`/api/applications/${appId}/documents`, form);
      }

      // Submit application
      await api.post(`/api/applications/${appId}/submit`);

      toast.success("Application submitted successfully!");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Submission failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="p-8 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          New Application
        </h1>
        <p className="text-gray-500 text-sm mb-8">
          Environmental Clearance — PARIVESH 3.0
        </p>

        {/* Step indicator */}
        <div className="flex items-center mb-10">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center
                               text-sm font-bold transition
                               ${i < step  ? "bg-forest text-white" :
                                 i === step ? "bg-gold text-white" :
                                              "bg-gray-200 text-gray-500"}`}>
                {i < step ? "✓" : i + 1}
              </div>
              <div className="ml-2 hidden sm:block">
                <p className={`text-xs font-medium
                               ${i === step ? "text-forest" : "text-gray-400"}`}>
                  {label}
                </p>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-3
                                 ${i < step ? "bg-forest" : "bg-gray-200"}`} />
              )}
            </div>
          ))}
        </div>

        {/* ── Step 0: Project Details ── */}
        {step === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Name *
              </label>
              <input {...register("projectName")}
                     className="w-full border border-gray-300 rounded-lg px-4 py-2.5
                                focus:outline-none focus:ring-2 focus:ring-mid text-sm"
                     placeholder="e.g. Kumar Steel Plant Unit 2" />
              {errors.projectName && (
                <p className="text-red-500 text-xs mt-1">{errors.projectName.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sector *
                </label>
                <select {...register("sector")}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5
                                   focus:outline-none focus:ring-2 focus:ring-mid text-sm">
                  <option value="">Select sector</option>
                  {SECTORS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                {errors.sector && (
                  <p className="text-red-500 text-xs mt-1">{errors.sector.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  District *
                </label>
                <select {...register("district")}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5
                                   focus:outline-none focus:ring-2 focus:ring-mid text-sm">
                  <option value="">Select district</option>
                  {DISTRICTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                {errors.district && (
                  <p className="text-red-500 text-xs mt-1">{errors.district.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Area (hectares) *
              </label>
              <input {...register("areaHa")} type="number" step="0.1"
                     className="w-full border border-gray-300 rounded-lg px-4 py-2.5
                                focus:outline-none focus:ring-2 focus:ring-mid text-sm"
                     placeholder="e.g. 45.5" />
              {errors.areaHa && (
                <p className="text-red-500 text-xs mt-1">{errors.areaHa.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Description
              </label>
              <textarea {...register("description")} rows={3}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5
                                   focus:outline-none focus:ring-2 focus:ring-mid text-sm
                                   resize-none"
                        placeholder="Brief description of the project..." />
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSubmit(() => setStep(1))}
                className="flex items-center gap-2 bg-forest text-white
                           px-6 py-2.5 rounded-lg text-sm font-medium
                           hover:bg-green transition"
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 1: Map ── */}
        {step === 1 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm text-gray-600 mb-4 flex items-center gap-2">
              <MapPin size={16} className="text-forest" />
              Click on the map to mark your project location
            </p>

            <div className="rounded-lg overflow-hidden border border-gray-200 mb-4"
                 style={{ height: 380 }}>
              <MapContainer
                center={[21.2514, 81.6296]}
                zoom={8}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="© OpenStreetMap contributors"
                />
                <MapClickHandler onPick={(lat, lng) => setPosition({ lat, lng })} />
                {position && <Marker position={[position.lat, position.lng]} />}
              </MapContainer>
            </div>

            {position ? (
              <p className="text-sm text-forest font-medium">
                📍 Selected: {position.lat.toFixed(4)}, {position.lng.toFixed(4)}
              </p>
            ) : (
              <p className="text-sm text-gray-400">No location selected yet</p>
            )}

            <div className="flex justify-between mt-6">
              <button onClick={() => setStep(0)}
                      className="flex items-center gap-2 text-gray-500
                                 hover:text-gray-700 text-sm">
                <ChevronLeft size={16} /> Back
              </button>
              <button onClick={() => setStep(2)}
                      className="flex items-center gap-2 bg-forest text-white
                                 px-6 py-2.5 rounded-lg text-sm font-medium
                                 hover:bg-green transition">
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Documents ── */}
        {step === 2 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Document Type
                  </label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5
                               focus:outline-none focus:ring-2 focus:ring-mid text-sm"
                  >
                    {DOC_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    File (PDF / Image)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5
                               file:px-3 file:rounded-lg file:border-0 file:text-xs
                               file:font-medium file:bg-pale file:text-forest
                               hover:file:bg-light"
                  />
                </div>
              </div>

              <button onClick={addFile}
                      className="flex items-center gap-2 text-sm bg-pale text-forest
                                 px-4 py-2 rounded-lg hover:bg-light transition font-medium">
                <Upload size={14} /> Add Document
              </button>
            </div>

            {/* Added files list */}
            {files.length > 0 && (
              <div className="border border-gray-200 rounded-lg divide-y">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700">{f.docType}</p>
                      <p className="text-xs text-gray-400">{f.file.name}</p>
                    </div>
                    <button
                      onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between mt-6">
              <button onClick={() => setStep(1)}
                      className="flex items-center gap-2 text-gray-500
                                 hover:text-gray-700 text-sm">
                <ChevronLeft size={16} /> Back
              </button>
              <button
                onClick={() => {
                  if (files.length === 0) return toast.error("Add at least one document");
                  setStep(3);
                }}
                className="flex items-center gap-2 bg-forest text-white
                           px-6 py-2.5 rounded-lg text-sm font-medium
                           hover:bg-green transition"
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Review ── */}
        {step === 3 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-800 mb-5">Review Your Application</h3>

            <div className="space-y-3 mb-6">
              {[
                ["Project Name",   getValues("projectName")],
                ["Sector",         getValues("sector")],
                ["District",       getValues("district")],
                ["Area",           `${getValues("areaHa")} ha`],
                ["Location",       position
                  ? `${position.lat.toFixed(4)}, ${position.lng.toFixed(4)}`
                  : "Not specified"],
                ["Documents",      `${files.length} file(s) attached`],
              ].map(([label, value]) => (
                <div key={label}
                     className="flex justify-between py-2.5 border-b border-gray-100">
                  <span className="text-sm text-gray-500">{label}</span>
                  <span className="text-sm font-medium text-gray-800">{value}</span>
                </div>
              ))}
            </div>

            <div className="bg-pale rounded-lg p-4 mb-6">
              <p className="text-sm text-forest font-medium">
                By submitting, you confirm all information is accurate and complete.
              </p>
            </div>

            <div className="flex justify-between">
              <button onClick={() => setStep(2)}
                      className="flex items-center gap-2 text-gray-500
                                 hover:text-gray-700 text-sm">
                <ChevronLeft size={16} /> Back
              </button>
              <button
                onClick={onSubmit}
                disabled={loading}
                className="bg-forest text-white px-8 py-2.5 rounded-lg
                           text-sm font-medium hover:bg-green transition
                           disabled:opacity-60"
              >
                {loading ? "Submitting..." : "Submit Application"}
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}