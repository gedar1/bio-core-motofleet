import { Icon } from "@/components/shared/components/Icon";
import type { AdminNavItem } from "./workspaceConfig";

type AdminMobileDrawerProps = {
  readonly isOpen: boolean;
  readonly items: readonly AdminNavItem[];
  readonly activeTab: string;
  readonly onClose: () => void;
  readonly onNavigate: (tabId: string) => void;
};

export const AdminMobileDrawer = ({
  isOpen,
  items,
  activeTab,
  onClose,
  onNavigate,
}: AdminMobileDrawerProps) => (
  <>
    {isOpen && (
      <button
        type="button"
        aria-label="Cerrar menú"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/40 lg:hidden"
      />
    )}

    <div
      className={`
        fixed inset-y-0 left-0 z-50 w-[264px] max-w-[80vw] transform border-r border-hairline-soft bg-canvas
        transition-transform duration-200 lg:hidden
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}
      role="dialog"
      aria-modal="true"
      aria-label="Menú de administración"
    >
      <div className="flex items-center justify-between border-b border-hairline-soft px-lg py-md">
        <span className="text-body-md-medium text-ink">Administración</span>
        <button
          type="button"
          onClick={onClose}
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
        {items.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              type="button"
              key={item.id}
              onClick={() => onNavigate(item.id)}
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
        })}
      </nav>
    </div>
  </>
);
