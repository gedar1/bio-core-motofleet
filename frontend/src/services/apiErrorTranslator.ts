import { es } from "../i18n/es";
import { translateValidationMessage } from "../validation/validationMessages";

export type ApiErrorDetails = Record<string, string[]>;

export interface ApiErrorPayload {
  readonly code?: unknown;
  readonly message?: unknown;
  readonly details?: unknown;
}

const englishErrorWords =
  /\b(?:must|invalid|cannot|can't|not|already|failed|required|expected|received|should|between|greater|less|future|expired|registered|available|access|unauthorized|forbidden|unexpected|is|are|does|has|have|configured|inactive)\b/i;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const codeFallbacks: Readonly<Record<string, string>> = {
  UNAUTHORIZED: es.errors.api.unauthorized,
  FORBIDDEN: es.errors.api.forbidden,
  NOT_FOUND: es.errors.api.notFound,
  VALIDATION_ERROR: es.errors.api.validation,
  BUSINESS_RULE_VIOLATION: es.errors.api.businessRule,
  INVALID_STATE_TRANSITION: es.errors.api.invalidState,
  CONFLICT: es.errors.api.conflict,
  INTERNAL_ERROR: es.errors.api.internal,
};

const getCodeFallback = (code: string): string =>
  codeFallbacks[code.toUpperCase()] ?? es.errors.api.unknown;

type BackendMessageRule = {
  readonly pattern: RegExp;
  readonly message: string;
};

const backendMessageRules: readonly BackendMessageRule[] = [
  {
    pattern: /^(invalid credentials|credenciales inválidas)$/i,
    message: es.errors.api.unauthorized,
  },
  {
    pattern: /^access denied$/i,
    message: es.errors.api.forbidden,
  },
  {
    pattern: /email is already in use/i,
    message: es.errors.business.emailInUse,
  },
  {
    pattern: /phone is already in use/i,
    message: es.errors.business.phoneInUse,
  },
  {
    pattern: /identity document is already registered/i,
    message: es.errors.business.identityDocumentInUse,
  },
  {
    pattern: /plate is already registered/i,
    message: es.errors.business.plateInUse,
  },
  {
    pattern: /license is expired or expires today/i,
    message: es.errors.business.licenseExpired,
  },
  {
    pattern: /insurance is expired or expires today/i,
    message: es.errors.business.insuranceExpired,
  },
  {
    pattern: /amount must be greater than zero/i,
    message: es.errors.validation.amountPositive,
  },
  {
    pattern: /invalid payment date/i,
    message: es.errors.validation.paymentDate,
  },
  {
    pattern: /payment date cannot be a future date/i,
    message: es.errors.validation.paymentDatePast,
  },
  {
    pattern: /payment method must be cash or transfer/i,
    message: es.errors.validation.paymentMethod,
  },
  {
    pattern: /base rate must be an integer cop amount/i,
    message: es.errors.validation.baseRate,
  },
  {
    pattern: /rate per km must be an integer cop amount/i,
    message: es.errors.validation.ratePerKm,
  },
  {
    pattern: /commission must be a whole percentage/i,
    message: es.errors.validation.commission,
  },
  {
    pattern: /errand type must be object_transport, purchase or errand/i,
    message: es.errors.validation.errandType,
  },
  {
    pattern: /field ['"]available['"] must be boolean/i,
    message: es.errors.validation.available,
  },
  {
    pattern: /quote.*not found/i,
    message: es.errors.business.quoteNotFound,
  },
  {
    pattern: /quote.*already been used/i,
    message: es.errors.business.quoteUsed,
  },
  {
    pattern: /quote.*expired/i,
    message: es.errors.business.quoteExpired,
  },
  {
    pattern: /routing|route.*unavailable/i,
    message: es.errors.business.routingUnavailable,
  },
  {
    pattern: /not authenticated/i,
    message: es.errors.api.unauthorized,
  },
  {
    pattern: /not found/i,
    message: es.errors.api.notFound,
  },
  {
    pattern: /already (?:exists|registered|in use)/i,
    message: es.errors.api.conflict,
  },
];

const translateBackendMessage = (code: string, message: string): string => {
  const normalizedMessage = message.trim();
  const fallback = code ? getCodeFallback(code) : es.errors.api.unknown;
  const translatedMessage = backendMessageRules.find(({ pattern }) =>
    pattern.test(normalizedMessage),
  )?.message;

  return (
    translatedMessage ??
    (normalizedMessage && englishErrorWords.test(normalizedMessage)
      ? fallback
      : normalizedMessage || fallback)
  );
};

export const translateApiErrorDetails = (
  details: unknown,
): ApiErrorDetails | undefined => {
  if (!isRecord(details)) {
    return undefined;
  }

  const translatedDetails = Object.fromEntries(
    Object.entries(details)
      .map(([field, value]) => {
        const messages = Array.isArray(value) ? value : [value];
        const translatedMessages = messages
          .filter((message): message is string => typeof message === "string")
          .map((message) => translateValidationMessage(message, field));

        return [field, translatedMessages] as const;
      })
      .filter(([, messages]) => messages.length > 0),
  );

  return Object.keys(translatedDetails).length > 0
    ? translatedDetails
    : undefined;
};

export const translateApiError = (payload: ApiErrorPayload): {
  readonly message: string;
  readonly details?: ApiErrorDetails;
} => {
  const code = typeof payload.code === "string" ? payload.code : "";
  const rawMessage = typeof payload.message === "string" ? payload.message : "";
  const details = translateApiErrorDetails(payload.details);
  const detailMessages = details
    ? Array.from(new Set(Object.values(details).flat()))
    : [];
  const hasValidationDetails =
    code.toUpperCase() === "VALIDATION_ERROR" && detailMessages.length > 0;

  return hasValidationDetails
    ? {
        message: `${es.errors.api.validation} ${detailMessages.join(" ")}`,
        details,
      }
    : {
        message: translateBackendMessage(code, rawMessage),
        details,
      };
};
