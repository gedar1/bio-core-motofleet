import React from "react";
import { useMyErrands, useErrandActions } from "../../hooks";
import { Card, Button } from "../../components/ui";
import { t, translateStatus } from "../../i18n";

export const RiderErrands: React.FC = () => {
  const { errands, loading, refresh } = useMyErrands();
  const { pickup, deliver, cancel } = useErrandActions();

  const handleAction = async (
    errandId: string,
    action: "pickup" | "deliver" | "cancel",
  ) => {
    try {
      if (action === "pickup") await pickup(errandId);
      else if (action === "deliver") await deliver(errandId);
      else {
        const reason = prompt("Motivo de cancelación (mín. 10 caracteres):");
        if (!reason || reason.length < 10) return;
        await cancel(errandId, reason);
      }
      refresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error en la acción");
    }
  };

  if (loading)
    return <p className="caption text-center py-2xl">{t.common.loading}</p>;

  return (
    <div className="section px-2xl">
      <div className="max-w-[1280px] mx-auto">
        <h2 className="mb-2xl">{t.rider.myErrandsTitle}</h2>
        {errands.length === 0 ? (
          <p className="text-muted font-body text-body-md">
            {t.rider.noAssigned}
          </p>
        ) : (
          <div className="flex flex-col gap-lg">
            {errands.map((e) => (
              <Card key={e.id} className="p-xl">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="caption">
                      {translateStatus(e.type)} · {translateStatus(e.status)}
                    </p>
                    <p className="font-body text-body-md text-ink mt-xs">
                      {e.description}
                    </p>
                    <p className="font-body text-body-sm text-slate mt-xs">
                      {e.origin_address} → {e.destination_address}
                    </p>
                    <p className="caption mt-sm">
                      {t.rider.earn}: ${e.rider_earnings}
                    </p>
                  </div>
                  <div className="flex flex-col gap-sm">
                    {e.status === "accepted" && (
                      <Button onClick={() => handleAction(e.id, "pickup")}>
                        {t.rider.pickup}
                      </Button>
                    )}
                    {e.status === "picked_up" && (
                      <Button onClick={() => handleAction(e.id, "deliver")}>
                        {t.rider.deliver}
                      </Button>
                    )}
                    {(e.status === "accepted" || e.status === "picked_up") && (
                      <Button
                        variant="secondary"
                        onClick={() => handleAction(e.id, "cancel")}
                      >
                        {t.rider.cancel}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
