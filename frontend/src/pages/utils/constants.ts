import { TabConfig } from "../../types/pages/page.types";
import chartBarIcon from "../../assets/icons/chart-bar.svg";
import motorcycleIcon from "../../assets/icons/motorcycle.svg";
import personSimpleBikeIcon from "../../assets/icons/person-simple-bike.svg";
import calendarDotsIcon from "../../assets/icons/calendar-dots.svg";
import walletIcon from "../../assets/icons/wallet.svg";
import packageIcon from "../../assets/icons/package.svg";

export const tabs: TabConfig[] = [
  { id: "overview", label: "Resumen", icon: chartBarIcon },
  { id: "motorcycles", label: "Motocicletas", icon: motorcycleIcon },
  { id: "riders", label: "Riders", icon: personSimpleBikeIcon },
  { id: "contracts", label: "Contratos", icon: calendarDotsIcon },
  { id: "pricing", label: "Tarifas", icon: walletIcon },
  { id: "errands", label: "Mandados", icon: packageIcon },
];
