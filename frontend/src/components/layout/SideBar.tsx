import React, { useState } from "react";
import { tabs } from "../../pages/utils/constants";
import { Metrics } from "../../pages/admin/Metrics";
import { Motorcycles } from "../../pages/admin/Motorcycles";
import { Riders } from "../../pages/admin/Riders";
import { Contracts } from "../../pages/admin/Contracts";
import { PricingRules } from "../../pages/admin/PricingRules";
import { AdminErrands } from "../../pages/admin/AdminErrands";

export default function IconSidebar() {
  const [activeTab, setActiveTab] = useState("inicio");

  const renderContent = () => {
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
    <div className="flex h-screen bg-slate-100">
      {/* SIDEBAR MINIMALISTA */}
      <aside className="flex flex-col items-center w-20 py-6 bg-slate-900 border-r border-slate-800 shrink-0">
        {/* Espacio para un logo pequeño redondo (Opcional) */}
        <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-lg mb-8">
          A
        </div>

        {/* Navegación Principal */}
        <nav className="flex flex-col gap-4 w-full items-center flex-1">
          {tabs.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                type="button"
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                title={item.label}
                className={`
                  relative group flex items-center justify-center 
                  w-12 h-12 rounded-full transition-all duration-200
                  ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-105"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                  }
                `}
              >
                <img
                  src={item.icon}
                  alt=""
                  aria-hidden="true"
                  className="w-5 h-5"
                />

                {/* Indicador visual activo (Línea lateral) */}
                {isActive && (
                  <span className="absolute left-0 w-1 h-6 bg-indigo-400 rounded-r" />
                )}

                {/* Tooltip flotante al pasar el mouse */}
                <span className="absolute left-16 scale-0 transition-all rounded bg-slate-950 px-2 py-1 text-xs text-white group-hover:scale-100 z-50 shadow-md pointer-events-none whitespace-nowrap">
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </aside>
    </div>
  );
}
