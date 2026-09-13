import { Icon } from "@/components/shared/components/Icon";
import type { AdminNavItem } from "./workspaceConfig";

type AdminDesktopNavProps = {
  readonly items: readonly AdminNavItem[];
  readonly activeTab: string;
  readonly onNavigate: (tabId: string) => void;
};

export const AdminDesktopNav = ({
  items,
  activeTab,
  onNavigate,
}: AdminDesktopNavProps) => (
  <aside className="hidden lg:flex lg:w-[68px] lg:shrink-0 lg:flex-col border-r border-hairline-soft bg-canvas">
    <nav
      aria-label="Secciones del espacio de trabajo administrativo"
      className="sticky top-[64px] flex flex-col items-center gap-xs md:gap-xl py-lg"
    >
      {items.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <div key={item.id} className="group relative flex justify-center">
            <button
              type="button"
              onClick={() => onNavigate(item.id)}
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
            <span
              role="tooltip"
              className="pointer-events-none absolute left-full top-1/2 z-50 ml-sm -translate-y-1/2 whitespace-nowrap rounded-md bg-surface-code px-sm py-xxs text-caption-bold text-on-dark opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100"
            >
              {item.label}
            </span>
          </div>
        );
      })}
    </nav>
  </aside>
);
