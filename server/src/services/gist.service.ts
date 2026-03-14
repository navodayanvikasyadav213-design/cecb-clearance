import { env } from "../config/env";

interface AppWithRelations {
  id: string;
  projectName: string;
  sector: string;
  district: string;
  state: string;
  areaHa: number | null;
  description: string | null;
  lat: number | null;
  lng: number | null;
  createdAt: Date;
  proponent: { name: string; email: string; organization: string | null } | null;
  documents: { docType: string; fileName: string; ocrText: string | null; verified: boolean }[];
  gisRiskFlags: { flagType: string; distanceM: number; layerName: string; severity: string }[];
}

export async function generateGist(app: AppWithRelations): Promise<string> {
  const documentList = app.documents.map((d) => `${d.docType} (${d.verified ? "Verified" : "Unverified"})`).join(", ");
  const gisFlags = app.gisRiskFlags.length > 0
    ? app.gisRiskFlags.map((f) => `${f.flagType} within ${f.distanceM}m of ${f.layerName} [${f.severity}]`).join("; ")
    : "No GIS risk flags identified";

  const ocrSummary = app.documents
    .filter((d) => d.ocrText)
    .map((d) => d.ocrText?.slice(0, 200))
    .join(" | ")
    .slice(0, 800) || "No OCR text available";

  const prompt = `You are an expert environmental clearance officer at CECB.
Generate a formal Meeting Gist document for the following environmental clearance application.

Application Data:
- Project Name: ${app.projectName}
- Sector: ${app.sector}
- Location: ${app.district}, ${app.state}
- Area (ha): ${app.areaHa ?? "Not specified"}
- Proponent: ${app.proponent?.name ?? "Unknown"} (${app.proponent?.organization ?? "Unknown Organization"})
- Applied: ${app.createdAt.toDateString()}
- Key Documents: ${documentList || "None uploaded"}
- Environmental Concerns: ${gisFlags}
- Extracted Text Summary: ${ocrSummary}

Generate a structured gist with these sections:
1. Project Overview
2. Location & Environmental Context
3. Key Facts & Parameters
4. Documents Verified
5. Environmental Concerns Identified
6. Committee Observations
7. Recommended Conditions (if applicable)

Tone: Formal government document. Language: English.
Format: Structured paragraphs. No bullet points.`;

  // Try Gemini API
  try {
    const geminiKey = (env as any).GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (geminiKey) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 2048, temperature: 0.3 },
          }),
        }
      );
      const data = await response.json() as any;
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
    } else {
      console.warn("GEMINI_API_KEY not found in environment, falling back to template.");
    }
  } catch (err) {
    console.error("Gemini API failed:", err);
  }

  // Final fallback — template
  return `MEETING GIST — ${app.projectName.toUpperCase()}

1. PROJECT OVERVIEW
This application pertains to the project "${app.projectName}" in the ${app.sector} sector, submitted by ${app.proponent?.name ?? "the proponent"} from ${app.proponent?.organization ?? "unknown organization"}.

2. LOCATION & ENVIRONMENTAL CONTEXT
The project is located in ${app.district}, ${app.state}. The project area covers approximately ${app.areaHa ?? "N/A"} hectares.

3. KEY FACTS & PARAMETERS
Project Name: ${app.projectName}
Sector: ${app.sector}
District: ${app.district}
Area: ${app.areaHa ?? "N/A"} ha
Application Date: ${app.createdAt.toDateString()}

4. DOCUMENTS VERIFIED
${documentList || "No documents submitted."}

5. ENVIRONMENTAL CONCERNS IDENTIFIED
${gisFlags}

6. COMMITTEE OBSERVATIONS
The committee has reviewed the application and associated documents. The application appears complete and the proponent has addressed the necessary requirements for this sector category.

7. RECOMMENDED CONDITIONS
Standard environmental clearance conditions apply as per CECB guidelines. The proponent shall comply with all stipulated environmental safeguards during project implementation.`;
}
