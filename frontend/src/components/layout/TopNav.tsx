import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useDarkMode } from "../../hooks/useDarkMode";
import { t } from "../../i18n";
import { getRoleHomePath } from "../../navigation";
import { NotificationBell } from "../notifications/NotificationBell";
import sunIcon from "../../assets/icons/sun.svg";
import moonIcon from "../../assets/icons/moon.svg";

export const TopNav: React.FC = () => {
  const { isAuthenticated, role, logout } = useAuth();
  const { isDark, toggle } = useDarkMode();
  const homePath = getRoleHomePath(role);

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 flex h-[64px] items-center justify-between border-b border-hairline-soft bg-canvas px-2xl transition-colors duration-200">
      <Link
        to={isAuthenticated ? homePath : "/"}
        className="wordmark no-underline"
      >
        MOTOFLEET
      </Link>
      <div className="flex items-center gap-md lg:gap-xl">
        <button
          type="button"
          onClick={toggle}
          className="flex h-[36px] w-[36px] items-center justify-center rounded-md border border-hairline text-ink transition-colors"
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark ? (
            <img src={sunIcon} alt="" aria-hidden="true" className="h-5 w-5" />
          ) : (
            <img src={moonIcon} alt="" aria-hidden="true" className="h-5 w-5" />
          )}
        </button>

        {isAuthenticated && <NotificationBell />}

        {isAuthenticated ? (
          <>
            <Link
              to={homePath}
              className="nav-link hidden no-underline lg:inline-flex"
            >
              {t.nav.home.toUpperCase()}
            </Link>
            <span className="badge-cream hidden sm:inline-flex">
              {role?.toUpperCase()}
            </span>
            <button
              type="button"
              onClick={logout}
              className="btn-secondary text-body-sm"
            >
              {t.nav.logout.toUpperCase()}
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="nav-link no-underline">
              {t.nav.login.toUpperCase()}
            </Link>
            <Link to="/register" className="btn-primary no-underline">
              {t.nav.signup.toUpperCase()}
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};
