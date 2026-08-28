import React from "react";
import { t } from "../../i18n";
import logoFvr from "../../assets/images/logo-fvr-v2.png";

export const Footer: React.FC = () => {
  return (
    <>
      {/* Sunset stripe — brand signature */}
      <div className="sunset-stripe" />

      {/* Footer region */}
      <footer className="footer-region-mobile md:footer-region">
        <div className="max-w-[1280px] h-hero mx-auto text-center">
          <div className="flex flex-row items-center justify-center ">
            <img
              src={logoFvr}
              alt="Isotipo RYD"
              className="home-brand-logo-nav"
            />
            <span className="flex gap-sm text-heading-4">
              <span>RYD</span>
              <span>Favorcitos</span>
            </span>
          </div>
          <p className="mt-sm md:mt-lg font-body text-body-sm text-slate">
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
