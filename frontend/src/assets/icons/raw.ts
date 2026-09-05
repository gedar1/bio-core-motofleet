import calendarDots from "./receipt-text-dark.svg?raw";
import caretLeft from "./caret-left.svg?raw";
import chartBar from "./chart-bar.svg?raw";
import close from "./x.svg?raw";
import menu from "./menuLight.svg?raw";
import motorcycle from "./motorbikeLight.svg?raw";
import packageIcon from "./package_light.svg?raw";
import personSimpleBike from "./person_simple_bike.svg?raw";
import squarePen from "./square-pen.svg?raw";
import wallet from "./wallet_minimal.svg?raw";

export const rawIcons = {
  calendarDots,
  caretLeft,
  chartBar,
  close,
  menu,
  motorcycle,
  package: packageIcon,
  personSimpleBike,
  squarePen,
  wallet,
} as const;

export type IconName = keyof typeof rawIcons;
