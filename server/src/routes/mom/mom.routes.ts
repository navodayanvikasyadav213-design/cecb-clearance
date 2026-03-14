import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import { verifyDocument, finalizeMom, updateGist, triggerGistGeneration } from "../../controllers/mom.controller";

const router = Router();

// Document verification (scrutiny)
router.patch("/documents/:docId/verify", requireAuth, requireRole(["SCRUTINY", "ADMIN"]), verifyDocument);

// Gist/MoM operations
router.post("/:id/gist/generate", requireAuth, requireRole(["SCRUTINY", "ADMIN"]), triggerGistGeneration);
router.get("/:id/gist", requireAuth, async (req, res) => {
  const { prisma } = await import("../../utils/prisma");
  const id = String(req.params.id);
  const app = await prisma.application.findUnique({
    where: { id },
    select: { gistText: true, momText: true, momLocked: true, status: true },
  });
  if (!app) return res.status(404).json({ success: false, error: "Not found" });
  return res.json({ success: true, data: { gistText: app.gistText, momText: app.momText, momLocked: app.momLocked, status: app.status } });
});
router.patch("/:id/gist", requireAuth, requireRole(["MOM_TEAM", "ADMIN"]), updateGist);
router.post("/:id/mom/lock", requireAuth, requireRole(["MOM_TEAM", "ADMIN"]), finalizeMom);

// MoM export — returns HTML for client-side PDF generation or a DOCX file
router.get("/:id/mom/export", requireAuth, async (req, res) => {
  const { prisma } = await import("../../utils/prisma");
  const id = String(req.params.id);
  const format = (req.query.format as string) || "pdf";
  const app = await prisma.application.findUnique({
    where: { id },
    include: { proponent: { select: { name: true, organization: true } } },
  });
  if (!app) return res.status(404).json({ success: false, error: "Not found" });

  const content = app.momText || app.gistText || "No MoM content available.";
  const dateStr = new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });
  
  const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Minutes of Meeting — ${app.projectName}</title>
<style>body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;padding:20px;color:#222;}
h1{color:#1a5c2a;border-bottom:2px solid #1a5c2a;padding-bottom:8px;}
.meta{background:#f5f5f5;padding:12px;border-left:4px solid #1a5c2a;margin:16px 0;}
pre{white-space:pre-wrap;font-family:inherit;line-height:1.6;}</style></head>
<body><h1>Minutes of Meeting</h1>
<div class="meta"><strong>Project:</strong> ${app.projectName}<br>
<strong>Proponent:</strong> ${app.proponent?.name ?? ""} — ${app.proponent?.organization ?? ""}<br>
<strong>Status:</strong> ${app.status}<br>
<strong>Date:</strong> ${dateStr}</div>
<pre>${content}</pre></body></html>`;

  if (format === "html" || format === "pdf") {
    // For PDF, the client opens the HTML in a new tab and calls window.print()
    res.setHeader("Content-Type", "text/html");
    return res.send(htmlContent);
  }

  if (format === "docx") {
    try {
      const htmlToDocx = require("html-to-docx");
      const buffer = await htmlToDocx(htmlContent, null, {
        table: { row: { cantSplit: true } },
        footer: true,
        pageNumber: true,
      });
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      res.setHeader("Content-Disposition", `attachment; filename="MoM_${app.projectName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.docx"`);
      return res.send(buffer);
    } catch (e: any) {
      console.error("DOCX generation error:", e);
      return res.status(500).json({ success: false, error: "Failed to generate DOCX" });
    }
  }

  // Fallback json
  res.setHeader("Content-Type", "application/json");
  return res.json({ success: true, data: { content, htmlContent, projectName: app.projectName } });
});

export default router;
