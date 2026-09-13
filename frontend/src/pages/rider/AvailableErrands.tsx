import React from "react";
import { useAvailableErrands, useErrandActions } from "../../hooks";
import { t } from "../../i18n";
import { AvailableErrandCard } from "./components/AvailableErrandCard";

export const AvailableErrands: React.FC = () => {
  const { errands, loading, refresh } = useAvailableErrands();
  const { accept } = useErrandActions();

  const handleAccept = async (errandId: string) => {
    try {
      await accept(errandId);
      refresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al aceptar");
    }
  };

  if (loading) {
    return <p className="caption text-center py-2xl">{t.common.loading}</p>;
  }

  const firstAvailableErrandId = errands[0]?.id;

  return (
    <div className="section-mobile md:section  px-2xl">
      <div className="max-w-[1280px] mx-auto">
        <h2 className="mb-2xl">{t.rider.availableTitle}</h2>
        {errands.length === 0 ? (
          <p className="text-muted font-body text-body-md">
            {t.rider.noAvailable}
          </p>
        ) : (
          <div className="flex flex-col gap-lg">
            {errands.map((errand) => (
              <AvailableErrandCard
                key={errand.id}
                errand={errand}
                autoLoadOnMobile={errand.id === firstAvailableErrandId}
                onAccept={handleAccept}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
