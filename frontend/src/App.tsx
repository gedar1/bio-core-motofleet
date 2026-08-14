import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { TopNav, Footer } from "./components/layout";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Home } from "./pages/Home";
import { Login } from "./pages/auth/Login";
import { Register } from "./pages/auth/Register";
import { Dashboard } from "./pages/Dashboard";
import { AdminWorkspace } from "./pages/admin/AdminWorkspace";
// Keep imports for backward compatibility routes
import { CreateCosigner } from "./pages/admin/CreateCosigner";
import { CreatePayment } from "./pages/admin/CreatePayment";
import { CreateErrand } from "./pages/user/CreateErrand";
import { UserMyErrands } from "./pages/user/MyErrands";
import { AvailableErrands } from "./pages/rider/AvailableErrands";
import { RiderErrands } from "./pages/rider/RiderErrands";

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const GuestRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  return (
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
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* Admin workspace with tabs */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminWorkspace />
          </ProtectedRoute>
        }
      />

      {/* Backward compatibility redirects */}
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

      {/* Admin create forms - specific paths */}
      <Route
        path="/admin/cosigners/create"
        element={
          <ProtectedRoute>
            <CreateCosigner />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/payments/create"
        element={
          <ProtectedRoute>
            <CreatePayment />
          </ProtectedRoute>
        }
      />

      {/* User routes */}
      <Route
        path="/user/create-errand"
        element={
          <ProtectedRoute>
            <CreateErrand />
          </ProtectedRoute>
        }
      />
      <Route
        path="/user/errands"
        element={
          <ProtectedRoute>
            <UserMyErrands />
          </ProtectedRoute>
        }
      />

      {/* Rider routes */}
      <Route
        path="/rider/available"
        element={
          <ProtectedRoute>
            <AvailableErrands />
          </ProtectedRoute>
        }
      />
      <Route
        path="/rider/errands"
        element={
          <ProtectedRoute>
            <RiderErrands />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-canvas flex flex-col">
        <TopNav />
        <main className="pt-[64px] flex-1">
          <AppRoutes />
        </main>
        <Footer />
      </div>
    </AuthProvider>
  );
};

export default App;
