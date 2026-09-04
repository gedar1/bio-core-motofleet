import { es } from "../i18n/es";

export const fieldLabels: Readonly<Record<string, string>> = {
  name: "el nombre",
  email: "el correo electrónico",
  phone: "el teléfono",
  address: "la dirección",
  password: "la contraseña",
  document_type: "el tipo de documento",
  document_number: "el número de documento",
  license_number: "el número de licencia",
  license_expiry: "la fecha de vencimiento de la licencia",
  insurance_number: "el número de seguro",
  insurance_expiry: "la fecha de vencimiento del seguro",
  bond_amount: "el monto de fianza",
  emergency_contact_name: "el nombre del contacto de emergencia",
  emergency_contact_phone: "el teléfono del contacto de emergencia",
  plate: "la placa",
  brand: "la marca",
  model: "el modelo",
  year: "el año",
  engine_cc: "el cilindraje",
  soat_expiry: "la fecha de vencimiento del SOAT",
  inspection_expiry: "la fecha de vencimiento de la revisión técnica",
  rider_id: "el motociclista",
  motorcycle_id: "la motocicleta",
  start_date: "la fecha de inicio",
  end_date: "la fecha de finalización",
  monthly_amount: "el monto mensual",
  payment_day: "el día de pago",
  relationship: "el parentesco",
  identity_document: "el documento de identidad",
  errand_type: "el tipo de favor",
  description: "la descripción",
  origin_address: "la dirección de recogida",
  destination_address: "la dirección de entrega",
  payment_method: "el método de pago",
  quote_id: "la cotización",
  amount: "el monto",
  payment_date: "la fecha de pago",
  period: "el período",
  base_rate: "la tarifa base",
  rate_per_km: "la tarifa por kilómetro",
  commission_percentage: "el porcentaje de comisión",
};

export const getFieldLabel = (field?: string): string =>
  field
    ? (fieldLabels[field] ?? `el campo ${field.replace(/_/g, " ")}`)
    : "este campo";

const englishErrorWords =
  /\b(?:must|invalid|cannot|can't|not|already|failed|required|expected|received|should|between|greater|less|future|expired|registered|available|access|unauthorized|forbidden|unexpected|is|are|does|has|have|configured|inactive)\b/i;

type ValidationMessageRule = {
  readonly pattern: RegExp;
  readonly translate: (
    match: RegExpMatchArray,
    field?: string,
  ) => string;
};

const phoneLengthPattern = /only digits with length between (\d+) and (\d+)/i;
const minLengthPattern = /at least (\d+) characters?(?:\(s\))?/i;
const maxLengthPattern = /at most (\d+) characters?(?:\(s\))?/i;
const minNumberPattern = /must be at least (-?\d+)/i;
const maxNumberPattern = /must be at most (-?\d+)/i;
const betweenLengthPattern = /between (\d+) and (\d+) characters?/i;

const validationMessageRules: readonly ValidationMessageRule[] = [
  {
    pattern: /email.*(?:valid format|must contain @)/i,
    translate: () => es.errors.validation.email,
  },
  {
    pattern: phoneLengthPattern,
    translate: (match) =>
      `El teléfono debe contener solo números y tener entre ${match[1]} y ${match[2]} dígitos.`,
  },
  {
    pattern: /password.*(?:at least|at most|between).*characters?/i,
    translate: () => es.errors.validation.passwordLength,
  },
  {
    pattern: /password.*uppercase letter/i,
    translate: () => es.errors.validation.passwordUppercase,
  },
  {
    pattern: /password.*lowercase letter/i,
    translate: () => es.errors.validation.passwordLowercase,
  },
  {
    pattern: /password.*at least one digit/i,
    translate: () => es.errors.validation.passwordDigit,
  },
  {
    pattern: /future date/i,
    translate: () => es.errors.validation.futureDate,
  },
  {
    pattern: /valid uuid/i,
    translate: () => es.errors.validation.uuid,
  },
  {
    pattern: /required|cannot be empty|received undefined/i,
    translate: (_match, field) =>
      es.errors.input.required.replace("{field}", getFieldLabel(field)),
  },
  {
    pattern: betweenLengthPattern,
    translate: (match, field) =>
      `${getFieldLabel(field)} debe tener entre ${match[1]} y ${match[2]} caracteres.`,
  },
  {
    pattern: minLengthPattern,
    translate: (match, field) =>
      `${getFieldLabel(field)} debe tener al menos ${match[1]} caracteres.`,
  },
  {
    pattern: maxLengthPattern,
    translate: (match, field) =>
      `${getFieldLabel(field)} debe tener máximo ${match[1]} caracteres.`,
  },
  {
    pattern: minNumberPattern,
    translate: (match, field) =>
      `${getFieldLabel(field)} debe ser mayor o igual a ${match[1]}.`,
  },
  {
    pattern: maxNumberPattern,
    translate: (match, field) =>
      `${getFieldLabel(field)} debe ser menor o igual a ${match[1]}.`,
  },
  {
    pattern: /greater than zero|positive/i,
    translate: (_match, field) =>
      `${getFieldLabel(field)} debe ser mayor que cero.`,
  },
  {
    pattern: /valid date/i,
    translate: (_match, field) =>
      `${getFieldLabel(field)} debe ser una fecha válida.`,
  },
  {
    pattern: /after start_date/i,
    translate: () =>
      "La fecha de finalización debe ser posterior a la de inicio.",
  },
  {
    pattern: /alphanumeric/i,
    translate: (_match, field) =>
      `El formato de ${getFieldLabel(field)} solo puede contener letras y números.`,
  },
];

export const translateValidationMessage = (
  message: string,
  field?: string,
): string => {
  const normalizedMessage = message.trim();
  const matchedRule = validationMessageRules
    .map((rule) => ({
      rule,
      match: normalizedMessage.match(rule.pattern),
    }))
    .find(({ match }) => match !== null);

  return matchedRule && matchedRule.match
    ? matchedRule.rule.translate(matchedRule.match, field)
    : normalizedMessage && englishErrorWords.test(normalizedMessage)
      ? es.errors.validation.invalid.replace("{field}", getFieldLabel(field))
      : normalizedMessage || es.errors.validation.invalid.replace("{field}", getFieldLabel(field));
};
