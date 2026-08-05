import React from "react";
import { useAuth } from "../context/AuthContext";
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
  <div className="grid grid-cols-1 md:grid-cols-3 gap-xl">
    <DashCard
      title={t.dashboard.motorcycles.toUpperCase()}
      href="/admin/motorcycles"
    />
    <DashCard
      title={t.dashboard.contracts.toUpperCase()}
      href="/admin/contracts"
    />
    <DashCard
      title={t.dashboard.pricingRules.toUpperCase()}
      href="/admin/pricing"
    />
    <DashCard title={t.dashboard.errands.toUpperCase()} href="/admin/errands" />
    <DashCard title={t.dashboard.metrics.toUpperCase()} href="/admin/metrics" />
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

const RiderDashboard: React.FC = () => (
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
);

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
