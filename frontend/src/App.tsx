import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { TopNav, Footer } from "./components/layout";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Home } from "./pages/Home";
import { Login } from "./pages/auth/Login";
import { Register } from "./pages/auth/Register";
import { Dashboard } from "./pages/Dashboard";
import { Motorcycles } from "./pages/admin/Motorcycles";
import { Contracts } from "./pages/admin/Contracts";
import { PricingRules } from "./pages/admin/PricingRules";
import { AdminErrands } from "./pages/admin/AdminErrands";
import { Metrics } from "./pages/admin/Metrics";
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

      {/* Admin routes */}
      <Route
        path="/admin/motorcycles"
        element={
          <ProtectedRoute>
            <Motorcycles />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/contracts"
        element={
          <ProtectedRoute>
            <Contracts />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/pricing"
        element={
          <ProtectedRoute>
            <PricingRules />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/errands"
        element={
          <ProtectedRoute>
            <AdminErrands />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/metrics"
        element={
          <ProtectedRoute>
            <Metrics />
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
      <div className="min-h-screen bg-canvas">
        <TopNav />
        <main className="pt-[64px]">
          <AppRoutes />
        </main>
        <Footer />
      </div>
    </AuthProvider>
  );
};

export default App;
