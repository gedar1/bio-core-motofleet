import { Button, Card, RiderRouteActions } from "../../../components/ui";
import type { Errand } from "../../../types/errand";
import { t } from "../../../i18n";
import { ActiveRiderErrandStages } from "./ActiveRiderErrandStages";

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
      showTargetDetails={false}
      navigationTarget={
        errand.status === "accepted"
          ? "origin"
          : errand.status === "picked_up"
            ? "destination"
            : undefined
      }
    />
    <div className="order-2 z-10 flex flex-col gap-lg border-t border-hairline px-lg py-lg lg:order-1 lg:flex-row lg:items-start lg:justify-between lg:border-t-0 lg:p-0">
      <ActiveRiderErrandStages errand={errand} />
      <div className="flex w-full flex-col gap-sm lg:max-w-[220px]">
        {errand.status === "accepted" && (
          <Button
            className="w-full"
            onClick={() => onAction(errand.id, "pickup")}
          >
            {t.rider.pickup}
          </Button>
        )}
        {errand.status === "picked_up" && (
          <Button
            className="w-full"
            onClick={() => onAction(errand.id, "deliver")}
          >
            {t.rider.deliver}
          </Button>
        )}
        {(errand.status === "accepted" || errand.status === "picked_up") && (
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => onAction(errand.id, "cancel")}
          >
            {t.rider.cancel}
          </Button>
        )}
      </div>
    </div>
  </Card>
);
