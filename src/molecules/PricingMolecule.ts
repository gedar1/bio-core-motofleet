import type Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import type { ILogger } from "../infrastructure/logger.js";
import type { IMolecule } from "./IMolecule.js";
import { getCurrentUtcTimestamp } from "../atoms/dateUtils.js";
import { NotFoundError, ValidationError } from "../domains/errors.js";

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

export class PricingMolecule implements IMolecule {
  readonly name = "pricing";
  readonly version = "1.0.0";
  readonly description =
    "Pricing rule management: one active rule per errand type.";

  constructor(
    private readonly db: Database.Database,
    private readonly logger: ILogger,
  ) {}

  create(data: CreatePricingRuleInput): PricingRule {
    if (
      !Number.isSafeInteger(data.base_rate) ||
      data.base_rate < 1 ||
      data.base_rate > 999_999
    ) {
      throw new ValidationError(
        "Base rate must be an integer COP amount between 1 and 999,999",
      );
    }

    if (
      !Number.isSafeInteger(data.rate_per_km) ||
      data.rate_per_km < 0 ||
      data.rate_per_km > 9_999
    ) {
      throw new ValidationError(
        "Rate per km must be an integer COP amount between 0 and 9,999",
      );
    }

    if (
      !Number.isSafeInteger(data.commission_percentage) ||
      data.commission_percentage < 1 ||
      data.commission_percentage > 50
    ) {
      throw new ValidationError(
        "Commission must be a whole percentage between 1% and 50%",
      );
    }

    const validTypes: ErrandType[] = ["object_transport", "purchase", "errand"];
    if (!validTypes.includes(data.errand_type)) {
      throw new ValidationError(
        "Errand type must be object_transport, purchase or errand",
      );
    }

    const id = uuidv4();
    const now = getCurrentUtcTimestamp();

    const createRule = this.db.transaction(() => {
      this.db
        .prepare(
          "UPDATE pricing_rules SET active = 0, updated_at = ? WHERE errand_type = ? AND active = 1",
        )
        .run(now, data.errand_type);

      this.db
        .prepare(
          `INSERT INTO pricing_rules (id, errand_type, base_rate, rate_per_km, commission_percentage, active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
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

  deactivate(ruleId: string): PricingRule {
    const rule = this.db
      .prepare("SELECT * FROM pricing_rules WHERE id = ?")
      .get(ruleId) as PricingRule | undefined;

    if (!rule) {
      throw new NotFoundError("Pricing rule", ruleId);
    }

    const now = getCurrentUtcTimestamp();

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

  getActiveByType(errandType: ErrandType): PricingRule | null {
    const rule = this.db
      .prepare(
        "SELECT * FROM pricing_rules WHERE errand_type = ? AND active = 1",
      )
      .get(errandType) as PricingRule | undefined;

    return rule ?? null;
  }

  list(): PricingRule[] {
    return this.db
      .prepare("SELECT * FROM pricing_rules ORDER BY created_at DESC")
      .all() as PricingRule[];
  }
}
