import { Icon } from "@/components/shared/components/Icon";

type AdminMobileHeaderProps = {
  readonly activeLabel: string;
  readonly onOpen: () => void;
};

export const AdminMobileHeader = ({
  activeLabel,
  onOpen,
}: AdminMobileHeaderProps) => (
  <div className="flex items-center gap-sm border-b border-hairline-soft px-md py-sm lg:hidden">
    <button
      type="button"
      onClick={onOpen}
      aria-label="Abrir menú de secciones"
      className="flex h-9 w-9 items-center justify-center rounded-md text-ink"
    >
      <Icon name="menu" size={18} />
    </button>
    <span className="text-body-md-medium text-ink">{activeLabel}</span>
  </div>
);
