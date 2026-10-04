import type { ErrandQuoteResponse } from "@/types/api";
import { Button } from "../../../components/ui";
import type { RouteValue } from "../../../components/ui";
import { formatCop } from "@/utils";

interface QuotePriceProps {
  readonly quotePreview: ErrandQuoteResponse | null;
  readonly route: RouteValue;
  readonly error: string | null;
  readonly loading: boolean;
  readonly accepted: boolean;
  readonly onAccept: () => void;
}

export const QuotePrice = ({
  quotePreview,
  route,
  error,
  loading,
  accepted,
  onAccept,
}: QuotePriceProps) => (
  <>
    {quotePreview ? (
      <section
        aria-label="Precio estimado del favor"
        className={`rounded-md border border-primary bg-cream px-md py-sm ${
          accepted
            ? ""
            : "fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-30 rounded-none shadow-[0_-4px_16px_rgba(0,0,0,0.16)] lg:bottom-0 lg:mx-auto lg:max-w-[720px] lg:rounded-md"
        }`}
      >
        <div className="flex flex-col gap-xs sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant={accepted ? "success" : "primary"}
            className="w-full sm:w-auto"
            onClick={onAccept}
            disabled={loading || accepted}
          >
            {accepted
              ? `Precio aceptado ${formatCop.format(quotePreview.fareCop)}`
              : `Aceptar ${formatCop.format(quotePreview.fareCop)}`}
          </Button>
        </div>
        <p className="caption mt-xs">
          Esta cotización se aplicará al crear el favor y vence a las{" "}
          {new Date(quotePreview.expiresAt).toLocaleTimeString("es-CO", {
            hour: "2-digit",
            minute: "2-digit",
          })}
          .
        </p>
      </section>
    ) : (
      route.origin &&
      route.destination && (
        <p className="caption">Calculando el valor de tu favor...</p>
      )
    )}
    {error && <p className="font-body text-caption text-error">{error}</p>}
  </>
);
