import type { Errand } from "../../../hooks/useErrands";

type RiderErrandLocationDetailsProps = {
  readonly errand: Errand;
};

const normalizeAddress = (address: string | null): string =>
  (address ?? "").trim().toLocaleLowerCase("es-CO");

const PinReference = ({
  address,
  inputAddress,
  resolvedAddress,
}: {
  readonly address: string;
  readonly inputAddress: string | null;
  readonly resolvedAddress: string | null;
}) => {
  const hasWrittenReference =
    !!inputAddress &&
    normalizeAddress(inputAddress) !== normalizeAddress(address);
  const hasSeparatePinAddress =
    !!resolvedAddress &&
    normalizeAddress(resolvedAddress) !== normalizeAddress(address);

  const shouldShowPinReference = hasWrittenReference || hasSeparatePinAddress;

  if (!shouldShowPinReference) return null;

  return (
    <div className="mt-xxs rounded-sm border border-primary-200 bg-primary-50 px-sm py-xxs">
      {hasWrittenReference && (
        <p className="caption text-ink">
          <strong>Dirección indicada por el usuario:</strong> {inputAddress}
        </p>
      )}
      <p className="caption text-ink">
        <strong>Ubicación confirmada en el mapa:</strong>{" "}
        {resolvedAddress ?? address}. Sigue el pin exacto en el mapa.
      </p>
    </div>
  );
};

export const RiderErrandLocationDetails = ({
  errand,
}: RiderErrandLocationDetailsProps) => (
  <>
    <p className="font-body text-body-md text-ink mt-xs">
      {errand.description}
    </p>
    <div className="font-body text-body-sm text-slate mt-xs">
      <p>
        <strong>Recogida:</strong> {errand.origin_address}
      </p>
      <PinReference
        address={errand.origin_address}
        inputAddress={errand.origin_address_input}
        resolvedAddress={errand.origin_address_resolved}
      />
      {errand.origin_instructions && (
        <p className="caption text-muted mt-xxs">
          Instrucciones: {errand.origin_instructions}
        </p>
      )}
      <p className="mt-xxs">
        <strong>Entrega:</strong> {errand.destination_address}
      </p>
      <PinReference
        address={errand.destination_address}
        inputAddress={errand.destination_address_input}
        resolvedAddress={errand.destination_address_resolved}
      />
      {errand.destination_instructions && (
        <p className="caption text-muted mt-xxs">
          Instrucciones: {errand.destination_instructions}
        </p>
      )}
    </div>
  </>
);
