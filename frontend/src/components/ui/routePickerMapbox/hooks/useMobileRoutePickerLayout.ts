import { useEffect, useState } from "react";

const MOBILE_LAYOUT_QUERY = "(max-width: 1023px)";

/** Keeps mobile-only picker composition aligned with the CSS desktop breakpoint. */
export const useMobileRoutePickerLayout = (): boolean => {
  const [isMobileLayout, setIsMobileLayout] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia(MOBILE_LAYOUT_QUERY).matches
      : false,
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_LAYOUT_QUERY);
    const updateLayout = () => setIsMobileLayout(mediaQuery.matches);

    updateLayout();
    mediaQuery.addEventListener("change", updateLayout);
    return () => mediaQuery.removeEventListener("change", updateLayout);
  }, []);

  return isMobileLayout;
};
