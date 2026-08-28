import React from "react";
import { useMyErrands, useErrandActions } from "../../hooks";
import { Card, Button } from "../../components/ui";
import { t, translateStatus } from "../../i18n";

export const UserMyErrands: React.FC = () => {
  const { errands, loading, refresh } = useMyErrands();
  const { cancel } = useErrandActions();

  const handleCancel = async (errandId: string) => {
    const reason = prompt("Motivo de cancelación (mín. 10 caracteres):");
    if (!reason || reason.length < 10) return;
    try {
      await cancel(errandId, reason);
      refresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al cancelar");
    }
  };

  if (loading)
    return <p className="caption text-center py-2xl">{t.common.loading}</p>;

  return (
    <div className="section px-2xl">
      <div className="max-w-[1280px] mx-auto">
        <h2 className="mb-2xl">{t.user.myErrandsTitle}</h2>
        {errands.length === 0 ? (
          <p className="text-muted font-body text-body-md">
            {t.user.noErrands}
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
                      {translateStatus(e.payment_method)} · ${e.fare}
                    </p>
                    {e.pin && (
                      <div className="mt-md p-md bg-primary-50 rounded-lg border border-primary-200">
                        <p className="caption text-primary-700 font-semibold">
                          🔐 PIN de verificación:{" "}
                          <span className="text-lg font-bold tracking-wider">
                            {e.pin}
                          </span>
                        </p>
                        <p className="text-xs text-muted mt-xs">
                          Comparte este PIN con la persona que recibirá el
                          paquete
                        </p>
                      </div>
                    )}
                  </div>
                  {(e.status === "requested" || e.status === "accepted") && (
                    <Button
                      variant="secondary"
                      onClick={() => handleCancel(e.id)}
                    >
                      {t.user.cancel}
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
