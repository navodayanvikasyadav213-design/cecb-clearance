import { NavLink, useNavigate } from "react-router-dom";
import { useAuthStore, Role } from "../store/authStore";
import { api } from "../config/api";
import toast from "react-hot-toast";
import { Home, FileText, PlusCircle, Users, BookOpen, LogOut, ChevronRight, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";

const NAV_BY_ROLE: Record<Role, { label: string; path: string; icon: any }[]> = {
  PROPONENT: [
    { label: "Dashboard",       path: "/dashboard",    icon: Home       },
    { label: "My Applications", path: "/applications", icon: FileText   },
    { label: "New Application", path: "/apply",        icon: PlusCircle },
  ],
  SCRUTINY: [
    { label: "Dashboard", path: "/scrutiny",       icon: Home     },
    { label: "Queue",     path: "/scrutiny/queue", icon: FileText },
  ],
  MOM_TEAM: [
    { label: "Dashboard", path: "/mom",       icon: Home     },
    { label: "Referred",  path: "/mom/queue", icon: BookOpen },
  ],
  ADMIN: [
    { label: "Dashboard", path: "/admin",       icon: Home     },
    { label: "Users",     path: "/admin/users", icon: Users    },
    { label: "All Apps",  path: "/admin/apps",  icon: FileText },
  ],
};

const ROLE_LABELS: Record<Role, string> = {
  ADMIN:     "Administrator",
  PROPONENT: "Project Proponent",
  SCRUTINY:  "Scrutiny Officer",
  MOM_TEAM:  "MoM Team",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const navigate         = useNavigate();
  const navItems         = NAV_BY_ROLE[user?.role || "PROPONENT"] || [];
  const { t, i18n }      = useTranslation();

  const handleLogout = async () => {
    try {
      await api.post("/api/auth/logout");
    } finally {
      logout();
      navigate("/login");
      toast.success("Logged out successfully");
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50">

      {/* ── Sidebar ── */}
      <aside className="w-56 bg-forest flex flex-col shrink-0">

        {/* Logo */}
        <div className="px-5 py-5 border-b border-green">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-mid rounded-lg flex items-center
                            justify-center ring-1 ring-light shrink-0">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-tight">CECB</p>
              <p className="text-light text-[10px] opacity-80">Clearance Portal</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
           {navItems.map((item) => (
  <NavLink
    key={item.path}
    to={item.path}
    end={item.path !== "/dashboard"}
    className={({ isActive }) =>
      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition
       ${isActive
         ? "bg-mid text-white font-medium"
         : "text-pale hover:bg-green"
       }`
    }
  >
    <item.icon size={15} className="shrink-0" />
    {t(item.label)}
  </NavLink>
))}       </nav>

        {/* User */}
        <div className="px-4 py-4 border-t border-green">
          <div className="mb-3">
            <p className="text-white text-xs font-medium truncate">
              {user?.name}
            </p>
            <p className="text-light text-[10px] opacity-70 truncate">
              {ROLE_LABELS[user?.role || "PROPONENT"]}
            </p>
          </div>
          <button
            onClick={() => i18n.changeLanguage(i18n.language === 'en' ? 'hi' : 'en')}
            className="flex items-center gap-2 text-pale hover:text-white transition text-xs w-full mb-3"
          >
            <Globe size={13} />
            {i18n.language === 'en' ? 'हिंदी' : 'English'}
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-pale hover:text-gold
                       transition text-xs w-full"
          >
            <LogOut size={13} />
            {t('Logout')}
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 overflow-auto min-h-screen">
        {children}
      </main>
    </div>
  );
}