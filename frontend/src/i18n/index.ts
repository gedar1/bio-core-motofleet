import { es, translateStatus } from "./es";

// For now, only Spanish. Add more languages here if needed.
export const t = es;
export {
  getInputValidationMessage,
  translateApiError,
  translateApiErrorDetails,
} from "./errors";
export { translateStatus };
