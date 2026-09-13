import type { QuoteErrandRequest } from "../../../types/api";

export type CreateErrandForm = {
  type: QuoteErrandRequest["type"];
  description: string;
  payment_method: "cash" | "transfer";
};
