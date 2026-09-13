import { Button, Card, RiderRouteActions } from "../../../components/ui";
import type { Errand } from "../../../hooks/useErrands";
import { t, translateStatus } from "../../../i18n";
import { RiderErrandLocationDetails } from "./RiderErrandLocationDetails";

type AvailableErrandCardProps = {
  readonly errand: Errand;
  readonly autoLoadOnMobile: boolean;
  readonly onAccept: (errandId: string) => void;
};

export const AvailableErrandCard = ({
  errand,
  autoLoadOnMobile,
  onAccept,
}: AvailableErrandCardProps) => (
  <Card className="flex flex-col overflow-hidden p-0 lg:p-xl">
    <RiderRouteActions
      errand={errand}
      mobileMapFirst
      autoLoadOnMobile={autoLoadOnMobile}
    />
    <div className="order-2 z-10 -mt-md flex flex-col gap-md rounded-t-xl bg-canvas px-xl py-2xl shadow-card lg:order-1 lg:mt-0 lg:flex-row lg:items-start lg:justify-between lg:rounded-none lg:bg-transparent lg:p-0 lg:shadow-none">
      <div>
        <p className="caption">{translateStatus(errand.type)}</p>
        <RiderErrandLocationDetails errand={errand} />
        <p className="caption mt-sm">
          {t.rider.earn}: ${errand.rider_earnings} · {t.rider.fare}: $
          {errand.fare}
        </p>
      </div>
      <Button className="w-full lg:w-auto" onClick={() => onAccept(errand.id)}>
        {t.rider.accept}
      </Button>
    </div>
  </Card>
);
