import type Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import type { ILogger } from "../infrastructure/logger.js";
import type { IMolecule } from "./IMolecule.js";
import { AppError } from "../middleware/errorHandler.middleware.js";

export type ErrandType = "object_transport" | "purchase" | "errand";

export interface CreatePricingRuleInput {
  errand_type: ErrandType;
  base_rate: number;
  rate_per_km: number;
  commission_percentage: number;
}

export interface PricingRule {
  id: string;
  errand_type: ErrandType;
  base_rate: number;
  rate_per_km: number;
  commission_percentage: number;
  active: number;
  created_at: string;
  updated_at: string;
}

/**
 * Molecule responsible for pricing rule management.
 * Maintains exactly one active rule per errand type.
 */
export class PricingMolecule implements IMolecule {
  readonly name = "pricing";
  readonly version = "1.0.0";

  constructor(
    private readonly db: Database.Database,
    private readonly logger: ILogger,
  ) {}

  /**
   * Creates a new pricing rule.
   * Auto-deactivates existing active rule for the same errand_type.
   * Inserts the new rule as active.
   */
  create(data: CreatePricingRuleInput): PricingRule {
    // Legacy REAL columns remain for compatibility, but all new values are
    // logical integer COP amounts and whole commission percentages.
    if (
      !Number.isSafeInteger(data.base_rate) ||
      data.base_rate < 1 ||
      data.base_rate > 999_999
    ) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "Base rate must be an integer COP amount between 1 and 999,999",
      );
    }

    if (
      !Number.isSafeInteger(data.rate_per_km) ||
      data.rate_per_km < 0 ||
      data.rate_per_km > 9_999
    ) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "Rate per km must be an integer COP amount between 0 and 9,999",
      );
    }

    if (
      !Number.isSafeInteger(data.commission_percentage) ||
      data.commission_percentage < 1 ||
      data.commission_percentage > 50
    ) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "Commission must be a whole percentage between 1% and 50%",
      );
    }

    const validTypes: ErrandType[] = ["object_transport", "purchase", "errand"];
    if (!validTypes.includes(data.errand_type)) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "Errand type must be object_transport, purchase or errand",
      );
    }

    const id = uuidv4();
    const now = new Date().toISOString().replace("T", " ").substring(0, 19);

    // Deactivate existing active rule for same type, then insert new
    const createRule = this.db.transaction(() => {
      this.db
        .prepare(
          "UPDATE pricing_rules SET active = 0, updated_at = ? WHERE errand_type = ? AND active = 1",
        )
        .run(now, data.errand_type);

      this.db
        .prepare(
          `
        INSERT INTO pricing_rules (id, errand_type, base_rate, rate_per_km, commission_percentage, active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 1, ?, ?)
      `,
        )
        .run(
          id,
          data.errand_type,
          data.base_rate,
          data.rate_per_km,
          data.commission_percentage,
          now,
          now,
        );
    });

    createRule();

    this.logger.info("Pricing rule created", {
      ruleId: id,
      type: data.errand_type,
    });

    return this.db
      .prepare("SELECT * FROM pricing_rules WHERE id = ?")
      .get(id) as PricingRule;
  }

  /**
   * Deactivates a pricing rule by marking it inactive.
   */
  deactivate(ruleId: string): PricingRule {
    const rule = this.db
      .prepare("SELECT * FROM pricing_rules WHERE id = ?")
      .get(ruleId) as PricingRule | undefined;

    if (!rule) {
      throw new AppError(404, "NOT_FOUND", "Pricing rule not found");
    }

    const now = new Date().toISOString().replace("T", " ").substring(0, 19);

    this.db
      .prepare(
        "UPDATE pricing_rules SET active = 0, updated_at = ? WHERE id = ?",
      )
      .run(now, ruleId);

    this.logger.info("Pricing rule deactivated", { ruleId });

    return this.db
      .prepare("SELECT * FROM pricing_rules WHERE id = ?")
      .get(ruleId) as PricingRule;
  }

  /**
   * Returns the current active pricing rule for a given errand type, or null if none.
   */
  getActiveByType(errandType: ErrandType): PricingRule | null {
    const rule = this.db
      .prepare(
        "SELECT * FROM pricing_rules WHERE errand_type = ? AND active = 1",
      )
      .get(errandType) as PricingRule | undefined;

    return rule ?? null;
  }

  /**
   * Lists all pricing rules (active and inactive).
   */
  list(): PricingRule[] {
    return this.db
      .prepare("SELECT * FROM pricing_rules ORDER BY created_at DESC")
      .all() as PricingRule[];
  }
}
