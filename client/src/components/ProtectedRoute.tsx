import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore, Role } from "../store/authStore";

interface Props {
  children: React.ReactNode;
  roles?:   Role[];
}

export default function ProtectedRoute({ children, roles }: Props) {
  const user     = useAuthStore((s) => s.user);
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}