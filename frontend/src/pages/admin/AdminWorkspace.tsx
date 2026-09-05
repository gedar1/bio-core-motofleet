import React from "react";
import { useSearchParams } from "react-router-dom";

import { Motorcycles } from "./motorcycles/Motorcycles";
import { Riders } from "./riders/Riders";
import { Contracts } from "./contracts/Contracts";
import { PricingRules } from "./rules/PricingRules";
import { AdminErrands } from "./errands/AdminErrands";
import { Metrics } from "./metrics/Metrics";
import { CreateMotorcycle } from "./motorcycles/CreateMotorcycle";
import { CreateRider } from "./riders/CreateRider";
import { CreateContract } from "./contracts/CreateContract";
import { CreatePricingRule } from "./rules/CreatePricingRule";
import { EditRider } from "./riders/EditRider";
import { EditMotorcycle } from "./motorcycles/EditMotorcycle";
import { EditContract } from "./contracts/EditContract";
import { EditPricingRule } from "./rules/EditPricingRule";
import { Icon, type IconName } from "@/components/shared/components/Icon";

interface NavItemConfig {
  id: string;
  label: string;
  icon: IconName;
}

const navItems: NavItemConfig[] = [
  { id: "overview", label: "Resumen", icon: "chartBar" },
  { id: "motorcycles", label: "Motocicletas", icon: "motorcycle" },
  { id: "riders", label: "Riders", icon: "personSimpleBike" },
  { id: "contracts", label: "Contratos", icon: "calendarDots" },
  { id: "pricing", label: "Tarifas", icon: "wallet" },
  { id: "errands", label: "Mandados", icon: "package" },
];

const IconCaretLeft: React.FC = () => <Icon name="caretLeft" size={16} />;

export const AdminWorkspace: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";
  const mode = searchParams.get("mode");
  const editId = searchParams.get("id");
  const [isMobileNavOpen, setMobileNavOpen] = React.useState(false);

  const activeItem =
    navItems.find((item) => item.id === activeTab) ?? navItems[0];

  const navigateToTab = (tabId: string, createMode = false) => {
    const params = new URLSearchParams();
    params.set("tab", tabId);
    if (createMode) {
      params.set("mode", "create");
    }
    setSearchParams(params);
    setMobileNavOpen(false);
  };

  const goBack = () => {
    const params = new URLSearchParams();
    params.set("tab", activeTab);
    setSearchParams(params);
  };

  const renderContent = () => {
    // Edit mode forms
    if (mode === "edit") {
      if (!editId) {
        return (
          <p className="section px-md text-error">
            No se especificó el registro que se desea editar.
          </p>
        );
      }

      switch (activeTab) {
        case "motorcycles":
          return (
            <div>
              <button
                onClick={goBack}
                type="button"
                className="flex items-center gap-xs mb-lg text-ink hover:text-primary transition-colors"
              >
                <IconCaretLeft /> Volver a Motocicletas
              </button>
              <EditMotorcycle motorcycleId={editId} />
            </div>
          );
        case "riders":
          return (
            <div>
              <button
                type="button"
                onClick={goBack}
                className="flex items-center gap-xs mb-lg text-ink hover:text-primary transition-colors"
              >
                <IconCaretLeft /> Volver a Riders
              </button>
              <EditRider riderId={editId} />
            </div>
          );
        case "contracts":
          return (
            <div>
              <button
                type="button"
                onClick={goBack}
                className="flex items-center gap-xs mb-lg text-ink hover:text-primary transition-colors"
              >
                <IconCaretLeft /> Volver a Contratos
              </button>
              <EditContract contractId={editId} />
            </div>
          );
        case "pricing":
          return (
            <div>
              <button
                type="button"
                onClick={goBack}
                className="flex items-center gap-xs mb-lg text-ink hover:text-primary transition-colors"
              >
                <IconCaretLeft /> Volver a Tarifas
              </button>
              <EditPricingRule ruleId={editId} />
            </div>
          );
        default:
          return <Metrics />;
      }
    }

    // Create mode forms
    if (mode === "create") {
      switch (activeTab) {
        case "motorcycles":
          return (
            <div>
              <button
                onClick={goBack}
                type="button"
                className="flex items-center gap-xs mb-lg text-ink hover:text-primary transition-colors"
              >
                <IconCaretLeft /> Volver a Motocicletas
              </button>
              <CreateMotorcycle />
            </div>
          );
        case "riders":
          return (
            <div>
              <button
                type="button"
                onClick={goBack}
                className="flex items-center gap-xs mb-lg text-ink hover:text-primary transition-colors"
              >
                <IconCaretLeft /> Volver a Riders
              </button>
              <CreateRider />
            </div>
          );
        case "contracts":
          return (
            <div>
              <button
                type="button"
                onClick={goBack}
                className="flex items-center gap-xs mb-lg text-ink hover:text-primary transition-colors"
              >
                <IconCaretLeft /> Volver a Contratos
              </button>
              <CreateContract />
            </div>
          );
        case "pricing":
          return (
            <div>
              <button
                type="button"
                onClick={goBack}
                className="flex items-center gap-xs mb-lg text-ink hover:text-primary transition-colors"
              >
                <IconCaretLeft /> Volver a Tarifas
              </button>
              <CreatePricingRule />
            </div>
          );
        case "overview":
          // No create form for overview, show metrics
          return <Metrics />;
        default:
          return <Metrics />;
      }
    }

    // List views
    switch (activeTab) {
      case "overview":
        return <Metrics />;
      case "motorcycles":
        return (
          <div>
            <Motorcycles />
          </div>
        );
      case "riders":
        return (
          <div>
            <Riders />
          </div>
        );
      case "contracts":
        return (
          <div>
            <Contracts />
          </div>
        );
      case "pricing":
        return (
          <div>
            <PricingRules />
          </div>
        );
      case "errands":
        return <AdminErrands />;
      default:
        return <Metrics />;
    }
  };

  // Compact icon-only items with hover tooltip (desktop sidebar)
  const renderCompactNavItems = () =>
    navItems.map((item) => {
      const isActive = activeTab === item.id;
      return (
        <div key={item.id} className="group relative flex justify-center">
          <button
            type="button"
            onClick={() => navigateToTab(item.id)}
            aria-label={item.label}
            aria-current={isActive ? "page" : undefined}
            className={`
              flex h-section-sm w-section-sm rounded-full items-center justify-center  transition-colors
              ${
                isActive
                  ? "bg-primary text-white"
                  : "text-ink-soft hover:bg-surface-alt hover:text-ink"
              }
            `}
          >
            <Icon name={item.icon} size={32} />
          </button>
          {/* Tooltip */}
          <span
            role="tooltip"
            className="pointer-events-none absolute left-full top-1/2 z-50 ml-sm -translate-y-1/2 whitespace-nowrap rounded-md bg-surface-code px-sm py-xxs text-caption-bold text-on-dark opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100"
          >
            {item.label}
          </span>
        </div>
      );
    });

  // Full items with icon + label (mobile drawer)
  const renderFullNavItems = () =>
    navItems.map((item) => {
      const isActive = activeTab === item.id;
      return (
        <button
          type="button"
          key={item.id}
          onClick={() => navigateToTab(item.id)}
          aria-current={isActive ? "page" : undefined}
          className={`
            flex w-full items-center gap-sm rounded-md px-md py-sm text-left text-body-sm-medium transition-colors
            ${
              isActive
                ? "bg-primary text-white"
                : "text-ink-soft hover:bg-surface-alt hover:text-ink"
            }
          `}
        >
          <Icon name={item.icon} size={24} />
          <span className="truncate">{item.label}</span>
        </button>
      );
    });

  return (
    <div className="flex w-full min-h-[calc(100vh-64px)]">
      {/* Sidebar - desktop (compact, icon-only with tooltips) */}
      <aside className="hidden lg:flex lg:w-[68px] lg:shrink-0 lg:flex-col border-r border-hairline-soft bg-canvas">
        <nav
          aria-label="Secciones del espacio de trabajo administrativo"
          className="sticky top-[64px] flex flex-col items-center gap-xs md:gap-xl py-lg"
        >
          {renderCompactNavItems()}
        </nav>
      </aside>

      {/* Mobile drawer overlay */}
      {isMobileNavOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setMobileNavOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      )}

      {/* Mobile drawer */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 w-[264px] max-w-[80vw] transform border-r border-hairline-soft bg-canvas
          transition-transform duration-200 lg:hidden
          ${isMobileNavOpen ? "translate-x-0" : "-translate-x-full"}
        `}
        role="dialog"
        aria-modal="true"
        aria-label="Menú de administración"
      >
        <div className="flex items-center justify-between border-b border-hairline-soft px-lg py-md">
          <span className="text-body-md-medium text-ink">Administración</span>
          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Cerrar menú"
            className="flex h-9 w-9 items-center justify-center rounded-md text-ink"
          >
            <Icon name="close" size={24} />
          </button>
        </div>
        <nav
          aria-label="Secciones del espacio de trabajo administrativo"
          className="flex flex-col gap-xxs p-lg"
        >
          {renderFullNavItems()}
        </nav>
      </div>

      {/* Main content */}
      <div className="min-w-0 w-full flex-1">
        {/* Mobile top bar with hamburger */}
        <div className="flex items-center gap-sm border-b border-hairline-soft px-md py-sm lg:hidden">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Abrir menú de secciones"
            className="flex h-9 w-9 items-center justify-center rounded-md text-ink"
          >
            <Icon name="menu" size={18} />
          </button>
          <span className="text-body-md-medium text-ink">
            {activeItem.label}
          </span>
        </div>

        <div className="w-full">
          <div className="w-full min-h-[400px] rounded-lg bg-surface">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminWorkspace;
