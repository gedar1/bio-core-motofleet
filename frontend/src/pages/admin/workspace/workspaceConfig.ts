import type { IconName } from "@/components/shared/components/Icon";

export type AdminNavItem = {
  readonly id: string;
  readonly label: string;
  readonly icon: IconName;
};

export const adminNavItems: readonly AdminNavItem[] = [
  { id: "overview", label: "Resumen", icon: "chartBar" },
  { id: "motorcycles", label: "Motocicletas", icon: "motorcycle" },
  { id: "riders", label: "Riders", icon: "personSimpleBike" },
  { id: "contracts", label: "Contratos", icon: "calendarDots" },
  { id: "pricing", label: "Tarifas", icon: "wallet" },
  { id: "errands", label: "Mandados", icon: "package" },
];
