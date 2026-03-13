import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "../config/api";
import { useAuthStore, Role } from "../store/authStore";
import toast from "react-hot-toast";

const schema = z.object({
  email:    z.string().email("Invalid email"),
  password: z.string().min(1, "Password required"),
});

type FormData = z.infer<typeof schema>;

const DEMO_USERS = [
  { label: "Admin",     email: "admin@example.com",     password: "Admin@123",      role: "ADMIN"     },
  { label: "Proponent", email: "proponent@example.com", password: "Proponent@123",  role: "PROPONENT" },
  { label: "Scrutiny",  email: "scrutiny@example.com",  password: "Scrutiny@123",   role: "SCRUTINY"  },
  { label: "MoM Team",  email: "mom@example.com",       password: "MomTeam@123",    role: "MOM_TEAM"  },
];

const ROLE_ROUTES: Record<Role, string> = {
  ADMIN:     "/admin",
  PROPONENT: "/dashboard",
  SCRUTINY:  "/scrutiny",
  MOM_TEAM:  "/mom",
};

export default function LoginPage() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { setAuth, user } = useAuthStore();

  // If already logged in, redirect immediately
  useEffect(() => {
    if (user) navigate(ROLE_ROUTES[user.role], { replace: true });
  }, [user, navigate]);

  const {
    register, handleSubmit, setValue, watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const watchEmail = watch("email");

  const onSubmit = async (data: FormData) => {
    try {
      const res = await api.post("/api/auth/login", data);
      const { user, accessToken } = res.data.data;

      setAuth(user, accessToken);
      toast.success(`Welcome, ${user.name}!`);

      // Go back to the page they were trying to visit, or role default
      const from = (location.state as any)?.from?.pathname;
      navigate(from || ROLE_ROUTES[user.role as Role], { replace: true });
    } catch (err: any) {
      const msg = err.response?.data?.error || "Login failed";
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen bg-forest flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Top banner */}
        <div className="bg-forest px-8 pt-8 pb-6 text-center">
          <div className="w-14 h-14 bg-mid rounded-full flex items-center
                          justify-center mx-auto mb-4 ring-2 ring-light">
            <span className="text-white font-bold text-xl">C</span>
          </div>
          <h1 className="text-white text-xl font-bold">CECB Portal</h1>
          <p className="text-pale text-xs mt-1 opacity-80">
            Environmental Clearance System · PARIVESH 3.0
          </p>
        </div>

        <div className="px-8 py-6">
          {/* Demo quick-fill buttons */}
          <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">
            Quick Demo Login
          </p>
          <div className="grid grid-cols-2 gap-2 mb-6">
            {DEMO_USERS.map((u) => (
              <button
                key={u.role}
                type="button"
                onClick={() => {
                  setValue("email",    u.email,    { shouldValidate: true });
                  setValue("password", u.password, { shouldValidate: true });
                }}
                className={`text-xs px-3 py-2 rounded-lg border font-medium
                            transition text-left
                            ${watchEmail === u.email
                              ? "border-forest bg-pale text-forest"
                              : "border-gray-200 text-gray-600 hover:border-forest hover:bg-pale"
                            }`}
              >
                <span className="block font-semibold">{u.label}</span>
                <span className="text-gray-400 text-[10px]">{u.role}</span>
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400">or enter manually</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                {...register("email")}
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5
                           text-sm focus:outline-none focus:ring-2 focus:ring-mid
                           focus:border-transparent transition"
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                {...register("password")}
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5
                           text-sm focus:outline-none focus:ring-2 focus:ring-mid
                           focus:border-transparent transition"
              />
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-forest hover:bg-green text-white font-semibold
                         rounded-lg py-2.5 text-sm transition
                         disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-8 py-3 text-center border-t border-gray-100">
          <p className="text-xs text-gray-400">
            Chhattisgarh Environment Conservation Board
          </p>
        </div>
      </div>
    </div>
  );
}