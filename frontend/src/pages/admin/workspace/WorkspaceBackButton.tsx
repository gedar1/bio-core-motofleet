import { Icon } from "@/components/shared/components/Icon";

type WorkspaceBackButtonProps = {
  readonly label: string;
  readonly onBack: () => void;
};

export const WorkspaceBackButton = ({
  label,
  onBack,
}: WorkspaceBackButtonProps) => (
  <button
    type="button"
    onClick={onBack}
    className="flex items-center gap-xs mb-lg text-ink hover:text-primary transition-colors"
  >
    <Icon name="caretLeft" size={16} /> Volver a {label}
  </button>
);
