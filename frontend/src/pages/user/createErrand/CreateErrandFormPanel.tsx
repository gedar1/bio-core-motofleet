import type { ChangeEventHandler } from "react";
import { Button, Input } from "../../../components/ui";
import { t } from "../../../i18n";
import { inputRules } from "../../../validation/inputRules";
import type { CreateErrandForm } from "./types";

type CreateErrandFormPanelProps = {
  readonly form: CreateErrandForm;
  readonly error: string | null;
  readonly loading: boolean;
  readonly onTypeChange: ChangeEventHandler<HTMLSelectElement>;
  readonly onDescriptionChange: ChangeEventHandler<HTMLInputElement>;
  readonly onPaymentMethodChange: ChangeEventHandler<HTMLSelectElement>;
};

export const CreateErrandFormPanel = ({
  form,
  error,
  loading,
  onTypeChange,
  onDescriptionChange,
  onPaymentMethodChange,
}: CreateErrandFormPanelProps) => (
  <section className="flex min-w-0 flex-col gap-sm rounded-t-xl bg-canvas pb-md md:px-xl lg:rounded-lg lg:border lg:border-hairline-soft">
    <h3 className="font-body text-heading-5 text-ink">
      Completa los datos del favor
    </h3>

    <div className="w-full">
      <label className="mb-xxs block font-body text-body-sm-medium text-ink">
        {t.user.type}
      </label>
      <select value={form.type} onChange={onTypeChange} className="input-field">
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
    />

    <div className="w-full">
      <label className="mb-xs block font-body text-body-sm-medium text-ink">
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

    {error && (
      <p role="alert" className="font-body text-caption text-error">
        {error}
      </p>
    )}

    <Button type="submit" className="w-full" disabled={loading}>
      {loading ? t.user.creatingBtn : t.user.createBtn}
    </Button>
  </section>
);
