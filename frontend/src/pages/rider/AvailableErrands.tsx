import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAvailableErrands, useErrandActions } from "../../hooks";
import type { Errand } from "../../types/errand";
import { t } from "../../i18n";
import { AvailableErrandCard } from "./components/AvailableErrandCard";

export const AvailableErrands: React.FC = () => {
  const { errands, loading, error, refresh, confirmAccepted } =
    useAvailableErrands();
  const { accept } = useErrandActions();
  const navigate = useNavigate();
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [acceptErrors, setAcceptErrors] = useState<Record<string, string>>({});

  const handleAccept = async (errandId: string) => {
    if (acceptingId) return;

    setAcceptingId(errandId);
    setAcceptErrors((current) => {
      const next = { ...current };
      delete next[errandId];
      return next;
    });

    try {
      const acceptedErrand = (await accept(errandId)) as Errand;
      if (
        acceptedErrand.id !== errandId ||
        (acceptedErrand.status !== "accepted" &&
          acceptedErrand.status !== "picked_up")
      ) {
        throw new Error("El servidor no confirmó la aceptación del favor.");
      }

      confirmAccepted(acceptedErrand);
      void refresh(false);
      navigate("/rider", {
        replace: true,
        state: { acceptedErrand },
      });
    } catch (err: unknown) {
      setAcceptErrors((current) => ({
        ...current,
        [errandId]: err instanceof Error ? err.message : "Error al aceptar",
      }));
    } finally {
      setAcceptingId(null);
    }
  };

  if (loading) {
    return <p className="caption text-center py-2xl">{t.common.loading}</p>;
  }

  const firstAvailableErrandId = errands[0]?.id;

  return (
    <div className="section-mobile md:section  px-2xl">
      <div className="max-w-[1280px] mx-auto">
        {/* <h2 className="mb-2xl">{t.rider.availableTitle}</h2> */}
        {error && (
          <div className="mb-lg flex flex-col gap-sm" role="alert">
            <p className="font-body text-body-md text-error">{error}</p>
            <button
              type="button"
              className="self-start font-body text-body-sm underline"
              onClick={() => void refresh(true)}
            >
              Reintentar
            </button>
          </div>
        )}
        {errands.length === 0 && !error ? (
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
                isAccepting={acceptingId === errand.id}
                error={acceptErrors[errand.id] ?? null}
                onAccept={handleAccept}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
