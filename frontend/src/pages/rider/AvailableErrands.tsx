import React from "react";
import { useAvailableErrands, useErrandActions } from "../../hooks";
import { Card, Button } from "../../components/ui";
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

  return (
    <div className="section px-2xl">
      <div className="max-w-[1280px] mx-auto">
        <h2 className="mb-2xl">{t.rider.availableTitle}</h2>
        {errands.length === 0 ? (
          <p className="text-muted font-body text-body-md">
            {t.rider.noAvailable}
          </p>
        ) : (
          <div className="flex flex-col gap-lg">
            {errands.map((e) => (
              <Card key={e.id} className="p-xl">
                <div className="flex justify-between items-start">
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
                  <Button onClick={() => handleAccept(e.id)}>
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
