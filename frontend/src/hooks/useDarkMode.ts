import { useState, useEffect } from "react";

const THEME_EVENT = "themechange";

function getInitialTheme(): boolean {
  const stored = localStorage.getItem("theme");
  if (stored) return stored === "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(isDark: boolean) {
  const root = document.documentElement;
  if (isDark) {
    root.classList.add("dark");
    localStorage.setItem("theme", "dark");
  } else {
    root.classList.remove("dark");
    localStorage.setItem("theme", "light");
  }
}

export function useDarkMode() {
  const [isDark, setIsDark] = useState(getInitialTheme);

  // Apply the theme to <html> whenever this instance's value changes.
  useEffect(() => {
    applyTheme(isDark);
  }, [isDark]);

  // Keep every useDarkMode instance in sync: react to toggles from other
  // instances (custom event) and to changes from other tabs (storage event).
  useEffect(() => {
    const syncFromEvent = (event: Event) => {
      const next = (event as CustomEvent<boolean>).detail;
      setIsDark((prev) => (prev === next ? prev : next));
    };

    const syncFromStorage = (event: StorageEvent) => {
      if (event.key !== "theme" || event.newValue === null) return;
      const next = event.newValue === "dark";
      setIsDark((prev) => (prev === next ? prev : next));
    };

    window.addEventListener(THEME_EVENT, syncFromEvent);
    window.addEventListener("storage", syncFromStorage);

    return () => {
      window.removeEventListener(THEME_EVENT, syncFromEvent);
      window.removeEventListener("storage", syncFromStorage);
    };
  }, []);

  const toggle = () => {
    setIsDark((prev) => {
      const next = !prev;
      // Notify all other instances in this tab about the change.
      window.dispatchEvent(
        new CustomEvent<boolean>(THEME_EVENT, { detail: next }),
      );
      return next;
    });
  };

  return { isDark, toggle };
}
