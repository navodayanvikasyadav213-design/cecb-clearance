type Status = "DRAFT"|"SUBMITTED"|"UNDER_SCRUTINY"|"EDS"|"REFERRED"|"MOM_GENERATED"|"FINALIZED";

const CONFIG: Record<Status, { label: string; cls: string }> = {
  DRAFT:          { label: "Draft",          cls: "bg-gray-100  text-gray-600"  },
  SUBMITTED:      { label: "Submitted",      cls: "bg-blue-100  text-blue-700"  },
  UNDER_SCRUTINY: { label: "Under Scrutiny", cls: "bg-yellow-100 text-yellow-700"},
  EDS:            { label: "EDS Pending",    cls: "bg-orange-100 text-orange-700"},
  REFERRED:       { label: "Referred",       cls: "bg-purple-100 text-purple-700"},
  MOM_GENERATED:  { label: "MoM Generated",  cls: "bg-teal-100  text-teal-700"  },
  FINALIZED:      { label: "Finalized",      cls: "bg-green-100 text-green-700"  },
};

export default function StatusBadge({ status }: { status: Status }) {
  const { label, cls } = CONFIG[status] ?? CONFIG.DRAFT;
  return (
    <span className={`inline-flex items-center text-xs font-semibold
                      px-2.5 py-0.5 rounded-full ${cls}`}>
      {label}
    </span>
  );
}