export type AppStatus =
  | "DRAFT" | "SUBMITTED" | "UNDER_SCRUTINY"
  | "EDS"   | "REFERRED"  | "MOM_GENERATED" | "FINALIZED";

export interface Application {
  id:          string;
  projectName: string;
  sector:      string;
  district:    string;
  status:      AppStatus;
  areaHa:      number;
  createdAt:   string;
  updatedAt:   string;
}

export const MOCK_APPLICATIONS: Application[] = [
  {
    id: "app-draft-001", projectName: "Kumar Steel Plant Unit 2",
    sector: "Iron & Steel", district: "Raipur",
    status: "DRAFT", areaHa: 45.5,
    createdAt: "2025-03-01T10:00:00Z", updatedAt: "2025-03-05T14:00:00Z",
  },
  {
    id: "app-submitted-001", projectName: "Raipur Solar Farm Phase 1",
    sector: "Solar Power", district: "Raipur",
    status: "SUBMITTED", areaHa: 120.0,
    createdAt: "2025-02-15T09:00:00Z", updatedAt: "2025-03-01T11:00:00Z",
  },
  {
    id: "app-finalized-001", projectName: "Bilaspur Cement Plant",
    sector: "Cement", district: "Bilaspur",
    status: "FINALIZED", areaHa: 200.0,
    createdAt: "2025-01-10T08:00:00Z", updatedAt: "2025-02-20T16:00:00Z",
  },
];

export const SECTORS = [
  "Iron & Steel", "Cement", "Thermal Power", "Solar Power",
  "Mining", "Chemical", "Textile", "Paper & Pulp",
  "Sugar", "Distillery", "Infrastructure", "Other",
];

export const DISTRICTS = [
  "Raipur", "Bilaspur", "Durg", "Rajnandgaon",
  "Korba", "Raigarh", "Jagdalpur", "Ambikapur",
];