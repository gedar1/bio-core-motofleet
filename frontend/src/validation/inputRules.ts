import type { InputHTMLAttributes } from "react";

export type InputValueNormalizer = (value: string) => string;

export type InputRule = InputHTMLAttributes<HTMLInputElement> & {
  readonly normalize?: InputValueNormalizer;
};

export const normalizePhone: InputValueNormalizer = (value) =>
  value.trim().replace(/\s+/g, "");

const pad = (value: number): string => String(value).padStart(2, "0");

const toInputDate = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const getTodayInputDate = (): string => toInputDate(new Date());

export const getTomorrowInputDate = (): string => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return toInputDate(tomorrow);
};

/**
 * Shared constraints that mirror the backend schemas and local Colombian
 * motorcycle fleet conventions.
 */
export const inputRules = {
  colombianMotorcyclePlate: {
    minLength: 5,
    maxLength: 6,
    pattern: "[A-Za-z]{3}[0-9]{2}[A-Za-z]?",
    autoCapitalize: "characters",
    inputMode: "text",
  } satisfies InputHTMLAttributes<HTMLInputElement>,
  name: {
    minLength: 2,
    maxLength: 100,
  } satisfies InputHTMLAttributes<HTMLInputElement>,
  email: {
    maxLength: 200,
  } satisfies InputHTMLAttributes<HTMLInputElement>,
  phone: {
    minLength: 7,
    maxLength: 15,
    pattern: "[0-9]{7,15}",
    inputMode: "numeric",
    normalize: normalizePhone,
  } satisfies InputRule,
  address: {
    minLength: 5,
    maxLength: 200,
  } satisfies InputHTMLAttributes<HTMLInputElement>,
  password: {
    minLength: 8,
    maxLength: 72,
    pattern: "(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9]).{8,72}",
  } satisfies InputHTMLAttributes<HTMLInputElement>,
  documentNumber: {
    minLength: 5,
    maxLength: 30,
    pattern: "[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*",
    autoCapitalize: "characters",
  } satisfies InputHTMLAttributes<HTMLInputElement>,
  licenseNumber: {
    minLength: 1,
  } satisfies InputHTMLAttributes<HTMLInputElement>,
  identityDocument: {
    maxLength: 20,
  } satisfies InputHTMLAttributes<HTMLInputElement>,
  relationship: {
    maxLength: 50,
  } satisfies InputHTMLAttributes<HTMLInputElement>,
  shortText: {
    minLength: 1,
    maxLength: 100,
  } satisfies InputHTMLAttributes<HTMLInputElement>,
  color: {
    minLength: 1,
    maxLength: 50,
  } satisfies InputHTMLAttributes<HTMLInputElement>,
  motorcycleYear: {
    min: 1970,
    max: new Date().getFullYear() + 1,
    step: 1,
    inputMode: "numeric",
  } satisfies InputHTMLAttributes<HTMLInputElement>,
  engineCc: {
    min: 50,
    max: 2000,
    step: 1,
    inputMode: "numeric",
  } satisfies InputHTMLAttributes<HTMLInputElement>,
  positiveInteger: {
    min: 1,
    step: 1,
    inputMode: "numeric",
  } satisfies InputHTMLAttributes<HTMLInputElement>,
  nonNegativeInteger: {
    min: 0,
    step: 1,
    inputMode: "numeric",
  } satisfies InputHTMLAttributes<HTMLInputElement>,
  paymentDay: {
    min: 1,
    max: 28,
    step: 1,
    inputMode: "numeric",
  } satisfies InputHTMLAttributes<HTMLInputElement>,
  commissionPercentage: {
    min: 1,
    max: 50,
    step: 1,
    inputMode: "numeric",
  } satisfies InputHTMLAttributes<HTMLInputElement>,
  description: {
    minLength: 10,
    maxLength: 500,
  } satisfies InputHTMLAttributes<HTMLInputElement>,
  period: {
    pattern: "[0-9]{4}-(0[1-9]|1[0-2])",
    maxLength: 7,
    inputMode: "numeric",
  } satisfies InputHTMLAttributes<HTMLInputElement>,
  uuid: {
    pattern:
      "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}",
  } satisfies InputHTMLAttributes<HTMLInputElement>,
  futureDate: (): InputHTMLAttributes<HTMLInputElement> => ({
    min: getTomorrowInputDate(),
  }),
  todayOrPastDate: (): InputHTMLAttributes<HTMLInputElement> => ({
    max: getTodayInputDate(),
  }),
};
