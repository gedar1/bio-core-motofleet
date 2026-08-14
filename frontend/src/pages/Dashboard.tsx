import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { Button } from "../components/ui";
import { t } from "../i18n";

export const Dashboard: React.FC = () => {
  const { role, email, logout } = useAuth();

  return (
    <div className="section px-xl">
      <div className="max-w-[1280px] mx-auto">
        <div className="flex justify-between items-center mb-2xl">
          <div>
            <h2>{t.dashboard.title.toUpperCase()}</h2>
            <p className="mt-sm caption">
              {role?.toUpperCase()} — {email}
            </p>
          </div>
          <Button onClick={logout}>{t.nav.logout.toUpperCase()}</Button>
        </div>

        {role === "admin" && <AdminDashboard />}
        {role === "user" && <UserDashboard />}
        {role === "rider" && <RiderDashboard />}
      </div>
    </div>
  );
};

const AdminDashboard: React.FC = () => (
  <div className="flex flex-col items-start gap-xl">
    <p className="text-body-md text-ink-soft mb-md">
      Gestiona la flota, riders, contratos y tarifas desde un solo lugar.
    </p>
    <a
      href="/admin?tab=overview"
      className="btn-primary no-underline text-body-md-medium"
    >
      Ir al centro de administración
    </a>
  </div>
);

const UserDashboard: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-xl">
    <DashCard
      title={t.dashboard.createErrand.toUpperCase()}
      href="/user/create-errand"
    />
    <DashCard
      title={t.dashboard.myErrands.toUpperCase()}
      href="/user/errands"
    />
  </div>
);

const RiderDashboard: React.FC = () => {
  const { token } = useAuth();
  const [available, setAvailable] = useState<boolean>(false);
  const [toggling, setToggling] = useState(false);

  const loadStatus = useCallback(async () => {
    if (!token) return;
    try {
      await api.getMyErrands(token);
      // If no in-progress errand, availability can be toggled
    } catch {
      /* ignore */
    }
  }, [token]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleToggle = async () => {
    if (!token) return;
    setToggling(true);
    try {
      await api.toggleMyAvailability(token, !available);
      setAvailable(!available);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error");
    } finally {
      setToggling(false);
    }
  };

  return (
    <div>
      <div className="card-cream p-xl mb-xl flex justify-between items-center">
        <div>
          <p className="font-body text-body-md-medium text-ink">
            Mi disponibilidad
          </p>
          <p className="caption mt-xxs">
            {available
              ? "Estás recibiendo mandados"
              : "No estás recibiendo mandados"}
          </p>
        </div>
        <Button
          variant={available ? "secondary" : "primary"}
          onClick={handleToggle}
          disabled={toggling}
        >
          {available ? "Desactivar" : "Activar"}
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-xl">
        <DashCard
          title={t.dashboard.availableErrands.toUpperCase()}
          href="/rider/available"
        />
        <DashCard
          title={t.dashboard.myErrands.toUpperCase()}
          href="/rider/errands"
        />
      </div>
    </div>
  );
};

const DashCard: React.FC<{ readonly title: string; readonly href: string }> = ({
  title,
  href,
}) => (
  <a
    href={href}
    className="card border border-hairline p-xl block no-underline hover:border-on-dark transition-colors"
  >
    <h4>{title}</h4>
    <span className="caption mt-sm block">{t.dashboard.open}</span>
  </a>
);
