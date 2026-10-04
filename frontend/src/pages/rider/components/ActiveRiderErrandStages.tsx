import type { Errand } from "../../../types/errand";
import { t, translateStatus } from "../../../i18n";

type ActiveRiderErrandStagesProps = {
  readonly errand: Errand;
};

type StageDetailsProps = {
  readonly address: string;
  readonly inputAddress: string | null;
  readonly resolvedAddress: string | null;
  readonly instructions: string | null;
};

const normalizeAddress = (address: string | null): string =>
  (address ?? "").trim().toLocaleLowerCase("es-CO");

const StageDetails = ({
  address,
  inputAddress,
  resolvedAddress,
  instructions,
}: StageDetailsProps) => {
  const hasWrittenReference =
    !!inputAddress &&
    normalizeAddress(inputAddress) !== normalizeAddress(address);
  const hasSeparatePinAddress =
    !!resolvedAddress &&
    normalizeAddress(resolvedAddress) !== normalizeAddress(address);

  if (!hasWrittenReference && !hasSeparatePinAddress && !instructions) {
    return null;
  }

  return (
    <div className="mt-sm flex flex-col gap-xs">
      {hasWrittenReference && (
        <p className="caption break-words text-ink">
          <strong>{t.rider.providedAddress}:</strong> {inputAddress}
        </p>
      )}
      {hasSeparatePinAddress && (
        <p className="caption break-words text-ink">
          <strong>{t.rider.confirmedLocation}:</strong> {resolvedAddress}.{" "}
          {t.rider.exactPoint}
        </p>
      )}
      {instructions && (
        <p className="caption break-words text-muted">
          <strong>{t.rider.instructions}:</strong> {instructions}
        </p>
      )}
    </div>
  );
};

const StageAddress = ({
  label,
  address,
  inputAddress,
  resolvedAddress,
  instructions,
}: StageDetailsProps & { readonly label: string }) => (
  <div>
    <p className="caption text-muted">{label}</p>
    <p className="font-body text-body-md leading-relaxed break-words text-ink">
      {address}
    </p>
    <StageDetails
      address={address}
      inputAddress={inputAddress}
      resolvedAddress={resolvedAddress}
      instructions={instructions}
    />
  </div>
);

export const ActiveRiderErrandStages = ({
  errand,
}: ActiveRiderErrandStagesProps) => {
  const pickupIsActive = errand.status === "accepted";

  return (
    <div className="flex flex-col gap-md">
      {errand.description && (
        <p className="font-body text-body-md break-words text-ink">
          {errand.description}
        </p>
      )}

      <div className="flex flex-wrap gap-xs" aria-label="Resumen del mandado">
        <span className="rounded-full border border-hairline px-sm py-xxs caption text-ink">
          {translateStatus(errand.type)}
        </span>
        <span className="rounded-full border border-hairline px-sm py-xxs caption text-ink">
          {t.rider.status}: {translateStatus(errand.status)}
        </span>
        <span className="rounded-full border border-hairline px-sm py-xxs caption text-ink">
          {t.rider.earn}: ${errand.rider_earnings}
        </span>
        {errand.pin && (
          <span className="rounded-full border border-warning-200 bg-warning-50 px-sm py-xxs caption font-semibold text-warning-800">
            {t.rider.verificationPin}: {errand.pin}
          </span>
        )}
      </div>

      {errand.pin && (
        <p className="caption text-muted">{t.rider.pinInstruction}</p>
      )}

      <section
        className="border-t border-hairline pt-md first:border-t-0 first:pt-0"
        aria-current={pickupIsActive ? "step" : undefined}
        aria-labelledby={`${errand.id}-pickup-heading`}
      >
        <h3
          id={`${errand.id}-pickup-heading`}
          className="font-body text-body-md-medium text-ink"
        >
          {t.rider.pickupStage}
        </h3>
        <StageAddress
          label="Punto de recogida"
          address={errand.origin_address}
          inputAddress={errand.origin_address_input}
          resolvedAddress={errand.origin_address_resolved}
          instructions={errand.origin_instructions}
        />
      </section>

      <details
        className="border-t border-hairline pt-md"
        open={!pickupIsActive}
      >
        <summary className="cursor-pointer list-none rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          <span className="flex flex-col gap-xxs sm:flex-row sm:items-baseline sm:justify-between">
            <span
              className="font-body text-body-md-medium text-ink"
              id={`${errand.id}-delivery-heading`}
            >
              {t.rider.deliveryStage}
            </span>
            <span className="caption break-words text-muted">
              {errand.destination_address}
            </span>
          </span>
          <span className="caption mt-xxs inline-block text-link">
            {t.rider.viewDetails}
          </span>
        </summary>
        <div className="mt-sm">
          <StageDetails
            address={errand.destination_address}
            inputAddress={errand.destination_address_input}
            resolvedAddress={errand.destination_address_resolved}
            instructions={errand.destination_instructions}
          />
        </div>
      </details>
    </div>
  );
};
