import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { prisma } from "../../utils/prisma";
import { AppError } from "../../middleware/errorHandler";

const router = Router();

// ── GIS proximity check ───────────────────────────────────────────────────────
// Returns risk flags based on lat/lng coordinates.
// In production: queries PostGIS. Here: returns mock data based on coordinate ranges.
router.get("/check", requireAuth, asyncHandler(async (req, res) => {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);

  if (isNaN(lat) || isNaN(lng)) {
    throw new AppError("lat and lng are required query parameters", 400);
  }

  // Chhattisgarh bounding box check: lat 17.7–24.1, lng 80.2–84.4
  if (lat < 17 || lat > 25 || lng < 79 || lng > 85) {
    throw new AppError("Coordinates outside Chhattisgarh bounds", 400);
  }

  // Mock GIS risk flag generation based on coordinate proximity
  // In production, these would be ST_DWithin PostGIS queries
  const flags: { flagType: string; distanceM: number; layerName: string; severity: string }[] = [];

  // Simulate forest proximity check (Chhattisgarh has ~44% forest cover)
  const forestProb = Math.random();
  if (forestProb > 0.4) {
    flags.push({
      flagType: "FOREST_PROXIMITY",
      distanceM: Math.round(200 + Math.random() * 800),
      layerName: "Forest Survey of India — Reserved Forest",
      severity: forestProb > 0.7 ? "HIGH" : "MEDIUM",
    });
  }

  // Simulate river proximity
  if (Math.random() > 0.5) {
    flags.push({
      flagType: "RIVER_PROXIMITY",
      distanceM: Math.round(100 + Math.random() * 400),
      layerName: "CG River Network",
      severity: "MEDIUM",
    });
  }

  // Simulate sanctuary proximity (less common)
  if (Math.random() > 0.75) {
    flags.push({
      flagType: "WILDLIFE_SANCTUARY",
      distanceM: Math.round(3000 + Math.random() * 7000),
      layerName: "Wildlife Sanctuary Buffer Zone",
      severity: "HIGH",
    });
  }

  res.json({
    success: true,
    data: {
      lat, lng,
      riskFlags: flags,
      totalFlags: flags.length,
      riskLevel: flags.some(f => f.severity === "HIGH") ? "HIGH" : flags.length > 0 ? "MEDIUM" : "LOW",
    },
  });
}));

// ── GIS layer metadata ────────────────────────────────────────────────────────
router.get("/layers", requireAuth, asyncHandler(async (_req, res) => {
  res.json({
    success: true,
    data: {
      layers: [
        { id: "forests", name: "Reserved Forests", color: "#22c55e", bufferM: 1000 },
        { id: "rivers", name: "Rivers & Wetlands", color: "#3b82f6", bufferM: 500 },
        { id: "sanctuaries", name: "Wildlife Sanctuaries", color: "#f97316", bufferM: 10000 },
        { id: "wetlands", name: "Wetlands", color: "#06b6d4", bufferM: 2000 },
      ],
    },
  });
}));

export default router;
