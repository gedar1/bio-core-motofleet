/**
 * Compatibility facade for error and input validation helpers.
 *
 * Keep importing from this module in existing consumers while the
 * implementation remains separated by responsibility.
 */
export {
  translateApiError,
  translateApiErrorDetails,
} from "../services/apiErrorTranslator";
export type {
  ApiErrorDetails,
  ApiErrorPayload,
} from "../services/apiErrorTranslator";
export { getInputValidationMessage } from "../validation/inputValidation";
export {
  fieldLabels,
  getFieldLabel,
  translateValidationMessage,
} from "../validation/validationMessages";
