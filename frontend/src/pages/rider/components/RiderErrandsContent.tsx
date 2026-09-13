import { useMemo } from "react";
import { useErrandActions } from "../../../hooks";
import type { Errand } from "../../../hooks/useErrands";
import {
  ActiveRiderErrandCard,
  type RiderErrandAction,
} from "./ActiveRiderErrandCard";
import { RiderErrandHistory } from "./RiderErrandHistory";

type RiderErrandsContentProps = {
  readonly errands: Errand[];
  readonly refresh: () => void;
  /** The dedicated errands route owns the history; the rider home is operational. */
  readonly showHistory?: boolean;
};

export const RiderErrandsContent = ({
  errands,
  refresh,
  showHistory = true,
}: RiderErrandsContentProps) => {
  const { pickup, deliver, cancel } = useErrandActions();

  const handleAction = async (errandId: string, action: RiderErrandAction) => {
    try {
      if (action === "pickup") {
        await pickup(errandId);
      } else if (action === "deliver") {
        await deliver(errandId);
      } else {
        const reason = prompt("Motivo de cancelación (mín. 10 caracteres):");
        if (!reason || reason.length < 10) return;
        await cancel(errandId, reason);
      }
      refresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error en la acción");
    }
  };

  const activeErrands = useMemo(
    () =>
      errands.filter(
        (errand) =>
          errand.status === "accepted" || errand.status === "picked_up",
      ),
    [errands],
  );
  const activeErrandId = activeErrands[0]?.id;

  return (
    <div className="section-mobile md:section px-0 lg:px-2xl">
      <div className="mx-auto max-w-[1280px]">
        {activeErrands.length > 0 && (
          <>
            <h2 className="px-xl mb-lg lg:mb-2xl lg:px-0">Favor activo</h2>
            <div className="mb-2xl flex flex-col gap-lg">
              {activeErrands.map((errand) => (
                <ActiveRiderErrandCard
                  key={errand.id}
                  errand={errand}
                  autoLoadOnMobile={errand.id === activeErrandId}
                  onAction={handleAction}
                />
              ))}
            </div>
          </>
        )}

        {showHistory && <RiderErrandHistory errands={errands} />}
      </div>
    </div>
  );
};
