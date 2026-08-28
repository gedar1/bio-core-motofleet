import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useDarkMode } from "../../hooks/useDarkMode";
import { t } from "../../i18n";
import { getRoleHomePath } from "../../navigation";
import { NotificationBell } from "../notifications/NotificationBell";
import sunIcon from "../../assets/icons/sun.svg";
import logOutPrimary from "../../assets/icons/logOutPrimary.svg";
import logInPrimary from "../../assets/icons/logInPrimary.svg";
import moonBlack from "../../assets/icons/moonBlack.svg";
import logoFvr from "../../assets/images/logo-fvr-v2.png";

export const TopNav: React.FC = () => {
  const { isAuthenticated, role, logout } = useAuth();
  const { isDark, toggle } = useDarkMode();
  const homePath = getRoleHomePath(role);

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 flex h-[64px] items-center justify-between border-b border-hairline-soft bg-canvas lg:px-2xl px-md transition-colors duration-200">
      <Link
        to={isAuthenticated ? homePath : "/"}
        className="flex flex-row items-center  wordmark no-underline"
      >
        <img src={logoFvr} alt="Isotipo RYD" className="home-brand-logo-nav" />
        <span className="flex gap-sm text-heading-3">
          <span>RYD</span>
          <span>Favorcitos</span>
        </span>
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
              className="flex h-[48px] w-[48px] items-center justify-center rounded-md border border-hairline text-ink transition-colors"
            >
              <img
                src={logOutPrimary}
                alt=""
                aria-hidden="true"
                className="h-7 w-7"
              />
            </button>
          </>
        ) : (
          <>
            {/* <Link to="/register" className="btn-primary no-underline">
              {t.nav.signup.toUpperCase()}
            </Link> */}
            <Link
              to="/login"
              className="flex h-[48px] w-[48px] items-center justify-center rounded-md border border-hairline text-ink transition-colors"
            >
              <img
                src={logInPrimary}
                alt=""
                aria-hidden="true"
                className="h-7 w-7"
              />
              {/* {isDark ? (
                <img
                  src={logInDark}
                  alt=""
                  aria-hidden="true"
                  className="h-7 w-7"
                />
              ) : (
                <img
                  src={logInLight}
                  alt=""
                  aria-hidden="true"
                  className="h-7 w-7"
                />
              )} */}
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};
