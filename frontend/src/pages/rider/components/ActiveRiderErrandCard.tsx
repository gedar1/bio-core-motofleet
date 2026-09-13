import { Button, Card, RiderRouteActions } from "../../../components/ui";
import type { Errand } from "../../../hooks/useErrands";
import { t, translateStatus } from "../../../i18n";
import { RiderErrandLocationDetails } from "./RiderErrandLocationDetails";

export type RiderErrandAction = "pickup" | "deliver" | "cancel";

type ActiveRiderErrandCardProps = {
  readonly errand: Errand;
  readonly autoLoadOnMobile: boolean;
  readonly onAction: (errandId: string, action: RiderErrandAction) => void;
};

export const ActiveRiderErrandCard = ({
  errand,
  autoLoadOnMobile,
  onAction,
}: ActiveRiderErrandCardProps) => (
  <Card className="flex flex-col overflow-hidden p-0 lg:p-xl">
    <RiderRouteActions
      errand={errand}
      mobileMapFirst
      autoLoadOnMobile={autoLoadOnMobile}
      navigationTarget={
        errand.status === "accepted"
          ? "origin"
          : errand.status === "picked_up"
            ? "destination"
            : undefined
      }
    />
    <div className="order-2 z-10 mt-md flex flex-col gap-md rounded-t-xl bg-canvas px-xl py-2xl shadow-card lg:order-1 lg:mt-0 lg:flex-row lg:items-start lg:justify-between lg:rounded-none lg:bg-transparent lg:p-0 lg:shadow-none">
      <div>
        <p className="caption">
          {translateStatus(errand.type)} · {translateStatus(errand.status)}
        </p>
        <RiderErrandLocationDetails errand={errand} />
        <p className="caption mt-sm">
          {t.rider.earn}: ${errand.rider_earnings}
        </p>
        {errand.pin && (
          <div className="mt-md p-md bg-warning-50 rounded-lg border border-warning-200">
            <p className="caption text-warning-800 font-semibold">
              🔐 PIN de verificación:{" "}
              <span className="text-lg font-bold tracking-wider">
                {errand.pin}
              </span>
            </p>
            <p className="text-xs text-muted mt-xs">
              Pide este código al recoger y entregar el paquete
            </p>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-sm">
        {errand.status === "accepted" && (
          <Button onClick={() => onAction(errand.id, "pickup")}>
            {t.rider.pickup}
          </Button>
        )}
        {errand.status === "picked_up" && (
          <Button onClick={() => onAction(errand.id, "deliver")}>
            {t.rider.deliver}
          </Button>
        )}
        {(errand.status === "accepted" || errand.status === "picked_up") && (
          <Button
            variant="secondary"
            onClick={() => onAction(errand.id, "cancel")}
          >
            {t.rider.cancel}
          </Button>
        )}
      </div>
    </div>
  </Card>
);
