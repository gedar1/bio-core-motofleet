import { ErrandQuoteResponse } from "@/types/api";
import { Button, RouteValue } from "../../../components/ui";

import { formatCop } from "@/utils";
import { SvgSpinnersPulse3 } from "@/assets/icons";

interface QuotePriceProps {
  readonly quotePreview: ErrandQuoteResponse | null;
  readonly route: RouteValue;
  readonly error: string | null;
  readonly loading: boolean;
  readonly submitLabel: string;
}

export const QuotePrice = ({
  quotePreview,
  route,
  error,
  loading,
  submitLabel,
}: QuotePriceProps) => (
  <>
    {quotePreview ? (
      <div className="rounded-md border border-primary bg-cream px-md py-sm">
        <div className="flex flex-row items-center gap-sm">
          {/* <p className="font-body text-body-sm-medium text-ink">
            Valor total del favor
          </p> */}
          {/* <p className="font-body text-heading-5 text-primary">
            {formatCop.format(quotePreview.fareCop)}
          </p> */}
          <Button
            type="submit"
            className="w-full "
            disabled={loading || !quotePreview}
          >
            {loading || !quotePreview ? (
              <span>
                <div className=" text-primary">
                  <SvgSpinnersPulse3 />
                </div>
                {submitLabel}
              </span>
            ) : (
              <p className="font-body text-body-sm-medium text-on-dark ">
                Valor del favor {formatCop.format(quotePreview.fareCop)}
              </p>
            )}
          </Button>
        </div>
        <p className="caption">
          Esta cotización se aplicará al crear el favor y vence a las{" "}
          {new Date(quotePreview.expiresAt).toLocaleTimeString("es-CO", {
            hour: "2-digit",
            minute: "2-digit",
          })}
          .
        </p>
      </div>
    ) : (
      route.origin &&
      route.destination && (
        <p className="caption">Calculando el valor de tu favor...</p>
      )
    )}
    {error && <p className="font-body text-caption text-error">{error}</p>}
    {/* <Button
      type="submit"
      className="w-full"
      disabled={loading || !quotePreview}
    >
      <div className=" text-primary">
        <SvgSpinnersPulse3 />
      </div>
      {submitLabel}
    </Button> */}
  </>
);
