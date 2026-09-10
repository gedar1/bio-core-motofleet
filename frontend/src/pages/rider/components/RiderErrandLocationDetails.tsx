import type { Errand } from "../../../hooks/useErrands";

type RiderErrandLocationDetailsProps = {
  readonly errand: Errand;
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
      {errand.origin_instructions && (
        <p className="caption text-muted mt-xxs">
          Instrucciones: {errand.origin_instructions}
        </p>
      )}
      <p className="mt-xxs">
        <strong>Entrega:</strong> {errand.destination_address}
      </p>
      {errand.destination_instructions && (
        <p className="caption text-muted mt-xxs">
          Instrucciones: {errand.destination_instructions}
        </p>
      )}
    </div>
  </>
);
