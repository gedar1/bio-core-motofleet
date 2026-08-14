import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useDarkMode } from "../../hooks/useDarkMode";
import { t } from "../../i18n";

// Import SVG icons as Vite asset URLs.
import sunIcon from "../../assets/icons/sun.svg";
import moonIcon from "../../assets/icons/moon.svg";

export const TopNav: React.FC = () => {
  const { isAuthenticated, role, logout } = useAuth();
  const { isDark, toggle } = useDarkMode();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-[64px] flex items-center justify-between px-2xl bg-canvas border-b border-hairline-soft transition-colors duration-200">
      <Link to="/" className="wordmark no-underline">
        MOTOFLEET
      </Link>
      <div className="flex items-center gap-xl">
        {/* Dark mode toggle */}
        <button
          type="button"
          onClick={toggle}
          className="w-[36px] h-[36px] flex items-center justify-center rounded-md border border-hairline text-ink transition-colors"
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark ? (
            <img src={sunIcon} alt="" aria-hidden="true" className="w-5 h-5" />
          ) : (
            <img src={moonIcon} alt="" aria-hidden="true" className="w-5 h-5" />
          )}
        </button>

        {isAuthenticated ? (
          <>
            <Link to="/dashboard" className="nav-link no-underline">
              {t.nav.dashboard.toUpperCase()}
            </Link>
            <span className="badge-cream">{role?.toUpperCase()}</span>
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
