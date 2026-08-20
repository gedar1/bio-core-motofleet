import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Footer, MobileBottomNav, TopNav } from "./components/layout";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { getRoleHomePath } from "./navigation";
import { Home } from "./pages/Home";
import { Login } from "./pages/auth/Login";
import { Register } from "./pages/auth/Register";
import { AdminWorkspace } from "./pages/admin/AdminWorkspace";
import { CreateCosigner } from "./pages/admin/CreateCosigner";
import { CreatePayment } from "./pages/admin/CreatePayment";
import { AvailableErrands } from "./pages/rider/AvailableErrands";
import { RiderErrands } from "./pages/rider/RiderErrands";
import { RiderHome } from "./pages/rider/RiderHome";
import { CreateErrand } from "./pages/user/CreateErrand";
import { UserMyErrands } from "./pages/user/MyErrands";

interface ProtectedRouteProps {
  readonly children: React.ReactNode;
  readonly allowedRoles?: readonly string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles && (!role || !allowedRoles.includes(role))) {
    return <Navigate to={getRoleHomePath(role)} replace />;
  }

  return <>{children}</>;
};

const RoleHomeRedirect: React.FC = () => {
  const { role } = useAuth();
  return <Navigate to={getRoleHomePath(role)} replace />;
};

const GuestRoute: React.FC<{ readonly children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated, role } = useAuth();
  if (isAuthenticated) return <Navigate to={getRoleHomePath(role)} replace />;
  return <>{children}</>;
};

const AppRoutes: React.FC = () => (
  <Routes>
    <Route path="/" element={<Home />} />
    <Route
      path="/login"
      element={
        <GuestRoute>
          <Login />
        </GuestRoute>
      }
    />
    <Route
      path="/register"
      element={
        <GuestRoute>
          <Register />
        </GuestRoute>
      }
    />
    <Route
      path="/dashboard"
      element={
        <ProtectedRoute>
          <RoleHomeRedirect />
        </ProtectedRoute>
      }
    />

    <Route
      path="/admin"
      element={
        <ProtectedRoute allowedRoles={["admin"]}>
          <AdminWorkspace />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/motorcycles"
      element={<Navigate to="/admin?tab=motorcycles" replace />}
    />
    <Route
      path="/admin/motorcycles/create"
      element={<Navigate to="/admin?tab=motorcycles&mode=create" replace />}
    />
    <Route
      path="/admin/riders"
      element={<Navigate to="/admin?tab=riders" replace />}
    />
    <Route
      path="/admin/riders/create"
      element={<Navigate to="/admin?tab=riders&mode=create" replace />}
    />
    <Route
      path="/admin/contracts"
      element={<Navigate to="/admin?tab=contracts" replace />}
    />
    <Route
      path="/admin/contracts/create"
      element={<Navigate to="/admin?tab=contracts&mode=create" replace />}
    />
    <Route
      path="/admin/pricing"
      element={<Navigate to="/admin?tab=pricing" replace />}
    />
    <Route
      path="/admin/pricing/create"
      element={<Navigate to="/admin?tab=pricing&mode=create" replace />}
    />
    <Route
      path="/admin/errands"
      element={<Navigate to="/admin?tab=errands" replace />}
    />
    <Route
      path="/admin/metrics"
      element={<Navigate to="/admin?tab=overview" replace />}
    />
    <Route
      path="/admin/cosigners/create"
      element={
        <ProtectedRoute allowedRoles={["admin"]}>
          <CreateCosigner />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/payments/create"
      element={
        <ProtectedRoute allowedRoles={["admin"]}>
          <CreatePayment />
        </ProtectedRoute>
      }
    />

    <Route
      path="/user/create-errand"
      element={
        <ProtectedRoute allowedRoles={["user"]}>
          <CreateErrand />
        </ProtectedRoute>
      }
    />
    <Route
      path="/user/errands"
      element={
        <ProtectedRoute allowedRoles={["user"]}>
          <UserMyErrands />
        </ProtectedRoute>
      }
    />

    <Route
      path="/rider"
      element={
        <ProtectedRoute allowedRoles={["rider"]}>
          <RiderHome />
        </ProtectedRoute>
      }
    />
    <Route
      path="/rider/available"
      element={
        <ProtectedRoute allowedRoles={["rider"]}>
          <AvailableErrands />
        </ProtectedRoute>
      }
    />
    <Route
      path="/rider/errands"
      element={
        <ProtectedRoute allowedRoles={["rider"]}>
          <RiderErrands />
        </ProtectedRoute>
      }
    />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

const App: React.FC = () => (
  <AuthProvider>
    <div className="flex min-h-screen flex-col bg-canvas">
      <TopNav />
      <main className="flex-1 pb-[calc(64px+env(safe-area-inset-bottom))] pt-[64px] lg:pb-0">
        <AppRoutes />
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  </AuthProvider>
);

export default App;
