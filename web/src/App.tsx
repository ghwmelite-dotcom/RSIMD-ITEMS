import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { OfflineProvider } from "./context/OfflineContext";
import { useAuth } from "./hooks/useAuth";
import { AppShell } from "./components/layout/AppShell";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { AdminPage } from "./pages/AdminPage";
import { EquipmentPage } from "./pages/EquipmentPage";
import { EquipmentDetailPage } from "./pages/EquipmentDetailPage";
import { MaintenancePage } from "./pages/MaintenancePage";
import { ScanPage } from "./pages/ScanPage";
import { ReportsPage } from "./pages/ReportsPage";
import { AgingReportPage } from "./pages/AgingReportPage";
import { EntityDetailPage } from "./pages/EntityDetailPage";
import { FieldLogPage } from "./pages/FieldLogPage";

function ProtectedRoutes() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface-950 gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neon-green/30 border-t-neon-green" />
        <span className="font-mono text-xs text-surface-500">Loading system...</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppShell>
      <Routes>
        <Route index element={<DashboardPage />} />
        <Route path="dashboard/entity/:id" element={<EntityDetailPage />} />
        <Route path="admin" element={<AdminPage />} />
        <Route path="equipment" element={<EquipmentPage />} />
        <Route path="equipment/aging" element={<AgingReportPage />} />
        <Route path="equipment/:id" element={<EquipmentDetailPage />} />
        <Route path="maintenance" element={<MaintenancePage />} />
        <Route path="field-log" element={<FieldLogPage />} />
        <Route path="scan" element={<ScanPage />} />
        <Route path="scan/:assetTag" element={<ScanPage />} />
        <Route path="reports" element={<ReportsPage />} />
      </Routes>
    </AppShell>
  );
}

function LoginRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface-950 gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neon-green/30 border-t-neon-green" />
        <span className="font-mono text-xs text-surface-500">Validating session...</span>
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;

  return <LoginPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <OfflineProvider>
          <Routes>
            <Route path="/login" element={<LoginRoute />} />
            <Route path="/*" element={<ProtectedRoutes />} />
          </Routes>
        </OfflineProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
