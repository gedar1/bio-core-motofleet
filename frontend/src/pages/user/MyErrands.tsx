import React, { useEffect, useState } from "react";
import { useMyErrands, useErrandActions } from "../../hooks";
import { Card, Button } from "../../components/ui";
import { t, translateStatus } from "../../i18n";

export const UserMyErrands: React.FC = () => {
  const { errands, loading, refreshing, error, refresh } = useMyErrands();
  const { cancel } = useErrandActions();
  const [hasResolvedMyErrands, setHasResolvedMyErrands] = useState(false);

  useEffect(() => {
    if (!loading && !error) setHasResolvedMyErrands(true);
  }, [loading, error]);

  const hasKnownSnapshot = hasResolvedMyErrands || (!loading && !error);
  const isUpdating = refreshing || (loading && hasResolvedMyErrands);
  const retry = () => {
    if (loading || refreshing) return;
    void refresh(true);
  };

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

  return (
    <div className="pt-section-sm pb-section-sm px-2xl">
      <div className="max-w-[1280px] mx-auto">
        <h2 className="mb-2xl">{t.user.myErrandsTitle}</h2>

        {!hasKnownSnapshot && loading && (
          <div
            className="rounded-md border border-hairline p-xl"
            aria-busy="true"
            aria-live="polite"
            role="status"
          >
            <p className="text-muted font-body text-body-md">
              {t.user.loadingErrands}
            </p>
          </div>
        )}

        {!hasKnownSnapshot && error && (
          <div className="flex flex-col gap-sm" role="alert">
            <p className="font-body text-body-md text-error">
              {t.common.failedLoad}
            </p>
            <Button
              variant="secondary"
              onClick={retry}
              disabled={loading || refreshing}
              className="self-start"
            >
              {t.common.retry}
            </Button>
          </div>
        )}

        {hasKnownSnapshot && (
          <>
            {isUpdating && (
              <p
                className="mb-lg text-muted font-body text-body-sm"
                aria-live="polite"
                role="status"
              >
                {t.user.refreshingErrands}
              </p>
            )}

            {error && (
              <div className="mb-lg flex flex-col gap-sm" role="alert">
                <p className="font-body text-body-md text-error">
                  {t.common.failedLoad}
                </p>
                <Button
                  variant="secondary"
                  onClick={retry}
                  disabled={loading || refreshing}
                  className="self-start"
                >
                  {t.common.retry}
                </Button>
              </div>
            )}

            {errands.length === 0 ? (
              <p className="text-muted font-body text-body-md">
                {t.user.noErrands}
              </p>
            ) : (
              <div className="flex flex-col gap-lg">
                {errands.map((e) => (
                  <Card key={e.id} className="p-xl">
                    {(e.status === "requested" || e.status === "accepted") && (
                      <div className="flex justify-end pb-md">
                        <Button
                          variant="secondary"
                          onClick={() => handleCancel(e.id)}
                        >
                          {t.user.cancel}
                        </Button>
                      </div>
                    )}
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="caption">
                          {translateStatus(e.type)} ·{" "}
                          {translateStatus(e.status)}
                        </p>
                        <p className="font-body text-body-md text-ink mt-xs">
                          {e.description}
                        </p>
                        <div className="font-body text-body-sm text-slate mt-xs">
                          <p>
                            <strong>Recogida:</strong> {e.origin_address}
                          </p>
                          {e.origin_instructions && (
                            <p className="caption text-muted mt-xxs">
                              Instrucciones: {e.origin_instructions}
                            </p>
                          )}
                          <p className="mt-xxs">
                            <strong>Entrega:</strong> {e.destination_address}
                          </p>
                          {e.destination_instructions && (
                            <p className="caption text-muted mt-xxs">
                              Instrucciones: {e.destination_instructions}
                            </p>
                          )}
                        </div>
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
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
