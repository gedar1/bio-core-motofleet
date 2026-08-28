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

import chartBarIcon from "../../assets/icons/chart-bar.svg";
import motorcycleIcon from "../../assets/icons/motorcycle.svg";
import personSimpleBikeIcon from "../../assets/icons/person-simple-bike.svg";
import calendarDotsIcon from "../../assets/icons/calendar-dots.svg";
import walletIcon from "../../assets/icons/wallet.svg";
import packageIcon from "../../assets/icons/package.svg";
import caretLeftIcon from "../../assets/icons/caret-left.svg";

interface TabConfig {
  id: string;
  label: string;
  icon: string;
}

const tabs: TabConfig[] = [
  { id: "overview", label: "Resumen", icon: chartBarIcon },
  { id: "motorcycles", label: "Motocicletas", icon: motorcycleIcon },
  { id: "riders", label: "Riders", icon: personSimpleBikeIcon },
  { id: "contracts", label: "Contratos", icon: calendarDotsIcon },
  { id: "pricing", label: "Tarifas", icon: walletIcon },
  { id: "errands", label: "Mandados", icon: packageIcon },
];

const IconCaretLeft: React.FC = () => (
  <img src={caretLeftIcon} alt="" aria-hidden="true" className="w-4 h-4" />
);

export const AdminWorkspace: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";
  const mode = searchParams.get("mode");

  const navigateToTab = (tabId: string, createMode = false) => {
    const params = new URLSearchParams();
    params.set("tab", tabId);
    if (createMode) {
      params.set("mode", "create");
    }
    setSearchParams(params);
  };

  const goBack = () => {
    const params = new URLSearchParams();
    params.set("tab", activeTab);
    setSearchParams(params);
  };

  const renderContent = () => {
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

  return (
    <div className="section px-md sm:px-2xl">
      <div className="max-w-[1280px] mx-auto">
        {/* Tabs navigation */}
        <div
          className="w-full max-w-full overflow-x-auto touch-pan-x overscroll-x-contain [-webkit-overflow-scrolling:touch] mb-2xl border-b border-hairline-soft pb-xs"
          role="tablist"
          aria-label="Secciones del espacio de trabajo administrativo"
        >
          <div className="flex min-w-max gap-xs">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  type="button"
                  key={tab.id}
                  onClick={() => navigateToTab(tab.id)}
                  className={`
                    flex shrink-0 items-center gap-xs px-lg py-sm rounded-t-md whitespace-nowrap transition-colors
                    ${
                      isActive
                        ? "bg-primary text-white"
                        : "bg-surface text-ink-soft hover:bg-surface-alt hover:text-ink"
                    }
                  `}
                  role="tab"
                  aria-selected={isActive}
                >
                  <img
                    src={tab.icon}
                    alt=""
                    aria-hidden="true"
                    className="w-5 h-5"
                  />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content area */}
        <div className="min-h-[400px] bg-surface rounded-lg ">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default AdminWorkspace;
