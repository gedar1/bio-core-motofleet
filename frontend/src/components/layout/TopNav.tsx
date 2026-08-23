import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useDarkMode } from "../../hooks/useDarkMode";
import { t } from "../../i18n";
import { getRoleHomePath } from "../../navigation";
import { NotificationBell } from "../notifications/NotificationBell";
import sunIcon from "../../assets/icons/sun.svg";
import signIn from "../../assets/icons/signIn.svg";
import logInBlack from "../../assets/icons/logInBlack.svg";
import moonBlack from "../../assets/icons/moonBlack.svg";

export const TopNav: React.FC = () => {
  const { isAuthenticated, role, logout } = useAuth();
  const { isDark, toggle } = useDarkMode();
  const homePath = getRoleHomePath(role);

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 flex h-[64px] items-center lg:justify-between justify-around border-b border-hairline-soft bg-canvas lg:px-2xl px-md transition-colors duration-200">
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
          className="flex h-[48px] w-[48px] items-center justify-center rounded-md border border-hairline text-ink transition-colors"
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark ? (
            <img src={sunIcon} alt="" aria-hidden="true" className="h-3 w-3" />
          ) : (
            <img
              src={moonBlack}
              alt=""
              aria-hidden="true"
              className="h-3 w-3"
            />
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
            <Link to="/register" className="btn-primary no-underline">
              {t.nav.signup.toUpperCase()}
            </Link>
            <Link to="/login" className="nav-link no-underline">
              {isDark ? (
                <img
                  src={signIn}
                  alt=""
                  aria-hidden="true"
                  className="h-7 w-7"
                />
              ) : (
                <img
                  src={logInBlack}
                  alt=""
                  aria-hidden="true"
                  className="h-7 w-7"
                />
              )}
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};
