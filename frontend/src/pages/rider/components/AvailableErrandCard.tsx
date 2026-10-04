import { Button, Card, RiderRouteActions } from "../../../components/ui";
import type { Errand } from "../../../types/errand";
import { t, translateStatus } from "../../../i18n";
import { RiderErrandLocationDetails } from "./RiderErrandLocationDetails";

type AvailableErrandCardProps = {
  readonly errand: Errand;
  readonly autoLoadOnMobile: boolean;
  readonly isAccepting: boolean;
  readonly error: string | null;
  readonly onAccept: (errandId: string) => void;
};

export const AvailableErrandCard = ({
  errand,
  autoLoadOnMobile,
  isAccepting,
  error,
  onAccept,
}: AvailableErrandCardProps) => (
  <Card className="flex flex-col overflow-hidden p-0 lg:p-xl">
    <div className=" py-xs">
      {/* <p className="caption mt-sm">
        {t.rider.earn}: ${errand.rider_earnings} · {t.rider.fare}: $
        {errand.fare}
      </p> */}
      <Button
        className="w-full lg:w-auto"
        onClick={() => onAccept(errand.id)}
        disabled={isAccepting}
        aria-busy={isAccepting}
      >
        {isAccepting
          ? "Aceptando..."
          : `${t.rider.accept} ${t.rider.fare}: $${errand.fare}`}
      </Button>
      {error && (
        <p className="caption text-error" role="alert">
          {error} Puedes intentarlo de nuevo.
        </p>
      )}
    </div>
    <RiderRouteActions
      errand={errand}
      mobileMapFirst
      autoLoadOnMobile={autoLoadOnMobile}
    />
    <div className="order-2 z-10 -mt-md flex flex-col gap-md rounded-t-xl bg-canvas px-xl py-2xl shadow-card lg:order-1 lg:mt-0 lg:flex-row lg:items-start lg:justify-between lg:rounded-none lg:bg-transparent lg:p-0 lg:shadow-none">
      <div>
        <p className="caption">{translateStatus(errand.type)}</p>
        <RiderErrandLocationDetails errand={errand} />
      </div>
    </div>
  </Card>
);
