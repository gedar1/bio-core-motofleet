import type { ChangeEventHandler } from "react";
import { Button, Input } from "../../../components/ui";
import type { RouteValue } from "../../../components/ui";
import { t } from "../../../i18n";
import type { ErrandQuoteResponse } from "../../../types/api";
import { inputRules } from "../../../validation/inputRules";
import type { CreateErrandForm } from "./types";

const formatCop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

type CreateErrandFormPanelProps = {
  readonly form: CreateErrandForm;
  readonly route: RouteValue;
  readonly quotePreview: ErrandQuoteResponse | null;
  readonly error: string | null;
  readonly loading: boolean;
  readonly submitLabel: string;
  readonly onTypeChange: ChangeEventHandler<HTMLSelectElement>;
  readonly onDescriptionChange: ChangeEventHandler<HTMLInputElement>;
  readonly onPaymentMethodChange: ChangeEventHandler<HTMLSelectElement>;
};

export const CreateErrandFormPanel = ({
  form,
  route,
  quotePreview,
  error,
  loading,
  submitLabel,
  onTypeChange,
  onDescriptionChange,
  onPaymentMethodChange,
}: CreateErrandFormPanelProps) => (
  <section className="order-2 z-10 mt-md flex min-w-0 flex-col gap-lg rounded-t-xl bg-canvas md:px-xl py-2xl lg:order-1 lg:mt-0 lg:rounded-lg lg:border lg:border-hairline-soft">
    <div className="w-full">
      <label className="block mb-xs font-body text-body-sm-medium text-ink">
        {t.user.type}
      </label>
      <select
        value={form.type}
        onChange={onTypeChange}
        className="input-field"
      >
        <option value="object_transport">{t.user.objectTransport}</option>
        <option value="purchase">{t.user.purchase}</option>
        <option value="errand">{t.user.errand}</option>
      </select>
    </div>

    <Input
      {...inputRules.description}
      label={t.user.description}
      name="description"
      value={form.description}
      onChange={onDescriptionChange}
      placeholder={t.user.descPlaceholder}
      required
    />

    <div className="w-full">
      <label className="block mb-xs font-body text-body-sm-medium text-ink">
        {t.user.paymentMethod}
      </label>
      <select
        value={form.payment_method}
        onChange={onPaymentMethodChange}
        className="input-field"
      >
        <option value="cash">{t.user.cash}</option>
        <option value="transfer">{t.user.transfer}</option>
      </select>
    </div>

    {quotePreview ? (
      <div className="rounded-md border border-primary bg-cream px-md py-md">
        <p className="font-body text-body-sm-medium text-ink">
          Valor total del favor
        </p>
        <p className="font-body text-heading-3 text-primary">
          {formatCop.format(quotePreview.fareCop)}
        </p>
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
    <Button
      type="submit"
      className="w-full"
      disabled={loading || !quotePreview}
    >
      {submitLabel}
    </Button>
  </section>
);
