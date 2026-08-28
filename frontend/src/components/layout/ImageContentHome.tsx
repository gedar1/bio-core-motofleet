import logoFvr from "../../assets/images/logo-fvr-v2.png";
import { t } from "../../i18n";

export const ImageContentHome = () => {
  return (
    <div className="home-brand-lockup">
      <div className="home-brand-logo-stage">
        <img src={logoFvr} alt="Isotipo RYD" className="home-brand-logo" />
      </div>
      <div className="home-brand-copy">
        <h1 className="home-brand-title">
          <span className="home-brand-prefix">RYD</span>
          <span>Favorcitos</span>
        </h1>
        <div className="flex flex-col justify-around items-center md:flex-row ">
          <p className="home-brand-tagline">Renta de Motos y Domicilios</p>
          <span className=" text-body-sm-medium md:text-body-md-medium w-fit my-sm bg-brand-primary text-center text-on-primary h-3xl px-md py-xs rounded-full drop-shadow-[0_2px_4px_rgba(255,129,5,0.8)]">
            {t.home.hero}
          </span>
        </div>
      </div>
    </div>
  );
};
