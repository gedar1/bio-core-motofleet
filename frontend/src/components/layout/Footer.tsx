import React from "react";
import { t } from "../../i18n";

export const Footer: React.FC = () => {
  return (
    <>
      {/* Sunset stripe — brand signature */}
      <div className="sunset-stripe" />

      {/* Footer region */}
      <footer className="footer-region">
        <div className="max-w-[1280px] h-hero mx-auto text-center">
          <p className="font-display text-heading-4 text-ink">MOTOFLEET</p>
          <p className="mt-lg font-body text-body-sm text-slate">
            {t.footer.tagline}
          </p>
          <p className="mt-sm font-body text-micro text-stone">
            {t.footer.copyright}
          </p>
        </div>
      </footer>
    </>
  );
};
