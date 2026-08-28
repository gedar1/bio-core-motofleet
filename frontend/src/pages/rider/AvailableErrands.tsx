import React from "react";
import { useAvailableErrands, useErrandActions } from "../../hooks";
import { Card, Button, RiderRouteActions } from "../../components/ui";
import { t, translateStatus } from "../../i18n";

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

  if (loading)
    return <p className="caption text-center py-2xl">{t.common.loading}</p>;

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
            {errands.map((e) => (
              <Card
                key={e.id}
                className="flex flex-col overflow-hidden p-0 lg:p-xl"
              >
                <RiderRouteActions
                  errand={e}
                  mobileMapFirst
                  autoLoadOnMobile={e.id === firstAvailableErrandId}
                />
                <div className="order-2 z-10 -mt-md flex flex-col gap-md rounded-t-xl bg-canvas px-xl py-2xl shadow-card lg:order-1 lg:mt-0 lg:flex-row lg:items-start lg:justify-between lg:rounded-none lg:bg-transparent lg:p-0 lg:shadow-none">
                  <div>
                    <p className="caption">{translateStatus(e.type)}</p>
                    <p className="font-body text-body-md text-ink mt-xs">
                      {e.description}
                    </p>
                    <p className="font-body text-body-sm text-slate mt-xs">
                      {e.origin_address} → {e.destination_address}
                    </p>
                    <p className="caption mt-sm">
                      {t.rider.earn}: ${e.rider_earnings} · {t.rider.fare}: $
                      {e.fare}
                    </p>
                  </div>
                  <Button
                    className="w-full lg:w-auto"
                    onClick={() => handleAccept(e.id)}
                  >
                    {t.rider.accept}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
