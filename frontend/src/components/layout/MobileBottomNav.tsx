import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { t } from "../../i18n";
import packageIcon from "../../assets/icons/package_light.svg";
import notePencilIcon from "../../assets/icons/note-pencil.svg";
import personSimpleBikeIcon from "../../assets/icons/person_simple_bike.svg";

interface NavigationItem {
  readonly to: string;
  readonly label: string;
  readonly icon: string;
}

export const MobileBottomNav: React.FC = () => {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated || (role !== "user" && role !== "rider")) {
    return null;
  }

  const items: readonly NavigationItem[] =
    role === "user"
      ? [
          {
            to: "/user/create-errand",
            label: t.nav.requestErrand,
            icon: notePencilIcon,
          },
          {
            to: "/user/errands",
            label: t.nav.myErrands,
            icon: packageIcon,
          },
        ]
      : [
          {
            to: "/rider",
            label: t.nav.activeRoute,
            icon: personSimpleBikeIcon,
          },
          {
            to: "/rider/available",
            label: t.nav.availableErrands,
            icon: packageIcon,
          },
          {
            to: "/rider/errands",
            label: t.nav.riderHistory,
            icon: notePencilIcon,
          },
        ];

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline-soft bg-canvas/95 backdrop-blur lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex h-[64px] max-w-[600px] items-stretch">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center justify-center gap-xxs text-caption-bold no-underline transition-colors ${
                isActive ? "text-primary" : "text-steel"
              }`
            }
          >
            <img
              src={item.icon}
              alt=""
              aria-hidden="true"
              className="h-5 w-5"
            />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
