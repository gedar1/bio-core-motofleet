import { es } from "../i18n/es";

const replaceTemplate = (
  template: string,
  replacements: Record<string, string>,
): string =>
  Object.entries(replacements).reduce(
    (result, [key, value]) => result.replace(`{${key}}`, value),
    template,
  );

const patternValidationMessages: Readonly<Record<string, string>> = {
  password: es.errors.validation.passwordPattern,
  plate: es.errors.validation.plate,
  phone: es.errors.validation.phone,
  emergency_contact_phone: es.errors.validation.phone,
  document_number: es.errors.validation.documentNumber,
  period: es.errors.validation.period,
};

type InputValidationRule = (
  input: HTMLInputElement,
  field: string,
) => string | null;

const inputValidationRules = {
  valueMissing: (input: HTMLInputElement, field: string) =>
    input.validity.valueMissing
      ? replaceTemplate(es.errors.input.required, { field })
      : null,
  email: (input: HTMLInputElement) =>
    input.validity.typeMismatch && input.type === "email"
      ? es.errors.input.email
      : null,
  number: (input: HTMLInputElement) =>
    input.validity.badInput || input.validity.stepMismatch
      ? es.errors.input.number
      : null,
  tooShort: (input: HTMLInputElement, field: string) =>
    input.validity.tooShort
      ? replaceTemplate(es.errors.input.minLength, {
          field,
          value: String(input.minLength),
        })
      : null,
  tooLong: (input: HTMLInputElement, field: string) =>
    input.validity.tooLong
      ? replaceTemplate(es.errors.input.maxLength, {
          field,
          value: String(input.maxLength),
        })
      : null,
  rangeUnderflow: (input: HTMLInputElement, field: string) =>
    input.validity.rangeUnderflow
      ? replaceTemplate(es.errors.input.min, { field, value: input.min })
      : null,
  rangeOverflow: (input: HTMLInputElement, field: string) =>
    input.validity.rangeOverflow
      ? replaceTemplate(es.errors.input.max, { field, value: input.max })
      : null,
  patternMismatch: (input: HTMLInputElement, field: string) =>
    input.validity.patternMismatch
      ? patternValidationMessages[input.name] ??
        replaceTemplate(es.errors.input.pattern, { field })
      : null,
  typeMismatch: (input: HTMLInputElement) =>
    input.validity.typeMismatch ? es.errors.input.invalid : null,
} satisfies Record<string, InputValidationRule>;

type InputValidationRuleName = keyof typeof inputValidationRules;

const inputValidationOrder: readonly InputValidationRuleName[] = [
  "valueMissing",
  "email",
  "number",
  "tooShort",
  "tooLong",
  "rangeUnderflow",
  "rangeOverflow",
  "patternMismatch",
  "typeMismatch",
];

export const getInputValidationMessage = (
  input: HTMLInputElement,
  label?: string,
): string | null => {
  const field = label?.trim() || "Este campo";

  return (
    inputValidationOrder
      .map((ruleName) => inputValidationRules[ruleName](input, field))
      .find((message): message is string => Boolean(message)) ?? null
  );
};
