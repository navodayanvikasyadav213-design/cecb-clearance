import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import ProtectedRoute        from "./components/ProtectedRoute";
import LoginPage             from "./pages/LoginPage";
import ApplyPage             from "./pages/ApplyPage";
import ProponentDashboard    from "./pages/ProponentDashboard";
import ApplicationsPage      from "./pages/ApplicationsPage";
import ApplicationDetailPage from "./pages/ApplicationDetailPage";
import ScrutinyDashboard     from "./pages/ScrutinyDashboard";
import MomDashboard          from "./pages/MomDashboard";
import MomEditorPage         from "./pages/MomEditorPage";
import AdminDashboard        from "./pages/AdminDashboard";
import { useAuthStore }      from "./store/authStore";
import { Unauthorized }      from "./pages/placeholders";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function HomeRedirect() {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  switch (user.role) {
    case "ADMIN":    return <Navigate to="/admin"    replace />;
    case "SCRUTINY": return <Navigate to="/scrutiny" replace />;
    case "MOM_TEAM": return <Navigate to="/mom"      replace />;
    default:         return <Navigate to="/dashboard" replace />;
  }
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{ duration: 3000, style: { fontSize: "13px" } }} />
        <Routes>
          {/* Public */}
          <Route path="/login"        element={<LoginPage />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Admin */}
          <Route path="/admin" element={
            <ProtectedRoute roles={["ADMIN"]}><AdminDashboard /></ProtectedRoute>
          } />

          {/* Proponent */}
          <Route path="/dashboard" element={
            <ProtectedRoute roles={["PROPONENT"]}><ProponentDashboard /></ProtectedRoute>
          } />
          <Route path="/applications" element={
            <ProtectedRoute roles={["PROPONENT"]}><ApplicationsPage /></ProtectedRoute>
          } />
          <Route path="/applications/:id" element={
            <ProtectedRoute roles={["PROPONENT","SCRUTINY","MOM_TEAM","ADMIN"]}>
              <ApplicationDetailPage />
            </ProtectedRoute>
          } />
          <Route path="/apply" element={
            <ProtectedRoute roles={["PROPONENT"]}><ApplyPage /></ProtectedRoute>
          } />

          {/* Scrutiny */}
          <Route path="/scrutiny" element={
            <ProtectedRoute roles={["SCRUTINY"]}><ScrutinyDashboard /></ProtectedRoute>
          } />

          {/* MoM Team */}
          <Route path="/mom" element={
            <ProtectedRoute roles={["MOM_TEAM","ADMIN"]}><MomDashboard /></ProtectedRoute>
          } />
          <Route path="/mom/:id" element={
            <ProtectedRoute roles={["MOM_TEAM","ADMIN"]}><MomEditorPage /></ProtectedRoute>
          } />

          {/* Catch-all */}
          <Route path="/" element={<HomeRedirect />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}