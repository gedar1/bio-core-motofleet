import React from "react";
import { useSearchParams } from "react-router-dom";
import { Motorcycles } from "./Motorcycles";
import { Riders } from "./Riders";
import { Contracts } from "./Contracts";
import { PricingRules } from "./PricingRules";
import { AdminErrands } from "./AdminErrands";
import { Metrics } from "./Metrics";
import { CreateMotorcycle } from "./CreateMotorcycle";
import { CreateRider } from "./CreateRider";
import { CreateContract } from "./CreateContract";
import { CreatePricingRule } from "./CreatePricingRule";
import caretLeftIcon from "../../assets/icons/caret-left.svg";
import { tabs } from "../utils/constants";

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
    <div className="flex min-h-screen w-full bg-surface-alt">
      {/* SIDEBAR DE ICONOS REDONDOS */}
      <aside
        className="flex flex-col items-center w-20 py-md bg-slate-900 shrink-0 sticky top-0 h-screen border-r border-slate-800"
        aria-label="Navegación lateral"
      >
        {/* Espacio superior para un logo identificador pequeño */}
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-md mb-xl">
          ADM
        </div>

        {/* Botones Redondos de Navegación */}
        <nav
          className="flex flex-col gap-sm w-full items-center flex-1"
          role="tablist"
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                type="button"
                key={tab.id}
                onClick={() => navigateToTab(tab.id)}
                className={`
                  relative group flex items-center justify-center 
                  w-12 h-12 rounded-full transition-all duration-200
                  ${
                    isActive
                      ? "bg-primary text-white shadow-md shadow-primary/20 scale-105"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
                  }
                `}
                role="tab"
                aria-selected={isActive}
                title={tab.label}
              >
                {/* Reutiliza tus iconos originales configurados en la constante tabs */}
                <img
                  src={tab.icon}
                  alt=""
                  aria-hidden="true"
                  className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${isActive ? "brightness-0 invert" : ""}`}
                />

                {/* Pequeño indicador de barra lateral activa */}
                {isActive && (
                  <span className="absolute left-0 w-1 h-5 bg-primary-light rounded-r" />
                )}

                {/* Tooltip flotante al pasar el mouse por encima */}
                <span className="absolute left-16 scale-0 transition-all duration-150 rounded bg-slate-950 px-2 py-1 text-xs text-white group-hover:scale-100 z-50 shadow-lg pointer-events-none whitespace-nowrap">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ÁREA DE CONTENIDO PRINCIPAL */}
      <main className="flex-1 overflow-y-auto px-md sm:px-2xl py-md">
        <div className="max-w-[1280px] mx-auto">
          <div className="min-h-[400px] bg-surface rounded-lg p-md">
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminWorkspace;
