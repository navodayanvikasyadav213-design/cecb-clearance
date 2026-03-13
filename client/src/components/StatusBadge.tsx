import { AppStatus } from "../mocks/applications";

const CONFIG: Record<AppStatus, { label: string; className: string }> = {
  DRAFT:          { label: "Draft",           className: "bg-gray-100 text-gray-600" },
  SUBMITTED:      { label: "Submitted",       className: "bg-blue-100 text-blue-700" },
  UNDER_SCRUTINY: { label: "Under Scrutiny",  className: "bg-yellow-100 text-yellow-700" },
  EDS:            { label: "EDS Pending",     className: "bg-orange-100 text-orange-700" },
  REFERRED:       { label: "Referred",        className: "bg-purple-100 text-purple-700" },
  MOM_GENERATED:  { label: "MoM Generated",   className: "bg-teal-100 text-teal-700" },
  FINALIZED:      { label: "Finalized",       className: "bg-green-100 text-green-700" },
};

export default function StatusBadge({ status }: { status: AppStatus }) {
  const { label, className } = CONFIG[status];
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${className}`}>
      {label}
    </span>
  );
}