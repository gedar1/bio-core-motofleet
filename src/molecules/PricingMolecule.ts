import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import type { ILogger } from "../infrastructure/logger.js";
import type { IMolecule } from "./IMolecule.js";
import { ValidationError, NotFoundError } from "../domains/errors.js";
import { getCurrentUtcTimestamp } from "../atoms/dateUtils.js";

export type ErrandType = "object_transport" | "purchase" | "errand";

export interface CreatePricingRuleInput {
  errand_type: ErrandType;
  base_rate: number;
  rate_per_km: number;
  inside_bello_flat_fare_cop: number;
  outside_minimum_fare_cop: number;
  commission_percentage: number;
}

export interface PricingRule {
  id: string;
  errand_type: ErrandType;
  base_rate: number;
  rate_per_km: number;
  inside_bello_flat_fare_cop: number;
  outside_minimum_fare_cop: number;
  commission_percentage: number;
  active: number;
  created_at: string;
  updated_at: string;
}

type PricingValues = Omit<CreatePricingRuleInput, "errand_type">;

const assertIntegerAmount = (
  value: number,
  label: string,
  minimum: number,
  maximum: number,
): void => {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new ValidationError(
      `${label} must be an integer COP amount between ${minimum.toLocaleString("en-US")} and ${maximum.toLocaleString("en-US")}`,
    );
  }
};

const assertPricingValues = (values: PricingValues): void => {
  assertIntegerAmount(values.base_rate, "Base rate", 1, 999_999);
  assertIntegerAmount(values.rate_per_km, "Rate per km", 0, 9_999);
  assertIntegerAmount(
    values.inside_bello_flat_fare_cop,
    "Bello local flat fare",
    1,
    999_999,
  );
  assertIntegerAmount(
    values.outside_minimum_fare_cop,
    "Outside Bello minimum fare",
    1,
    999_999,
  );
  if (values.outside_minimum_fare_cop <= values.inside_bello_flat_fare_cop) {
    throw new ValidationError(
      "Outside Bello minimum fare must be higher than the Bello local fare",
    );
  }
  if (
    !Number.isSafeInteger(values.commission_percentage) ||
    values.commission_percentage < 1 ||
    values.commission_percentage > 50
  ) {
    throw new ValidationError(
      "Commission must be a whole percentage between 1% and 50%",
    );
  }
};

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
    const validTypes: ErrandType[] = ["object_transport", "purchase", "errand"];
    if (!validTypes.includes(data.errand_type)) {
      throw new ValidationError(
        "Errand type must be object_transport, purchase or errand",
      );
    }

    assertPricingValues({
      base_rate: data.base_rate,
      rate_per_km: data.rate_per_km,
      inside_bello_flat_fare_cop: data.inside_bello_flat_fare_cop,
      outside_minimum_fare_cop: data.outside_minimum_fare_cop,
      commission_percentage: data.commission_percentage,
    });

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
          `INSERT INTO pricing_rules (
             id, errand_type, base_rate, rate_per_km,
             inside_bello_flat_fare_cop, outside_minimum_fare_cop,
             commission_percentage, active, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        )
        .run(
          id,
          data.errand_type,
          data.base_rate,
          data.rate_per_km,
          data.inside_bello_flat_fare_cop,
          data.outside_minimum_fare_cop,
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

  update(ruleId: string, data: Partial<PricingValues>): PricingRule {
    const rule = this.db
      .prepare("SELECT * FROM pricing_rules WHERE id = ?")
      .get(ruleId) as PricingRule | undefined;
    if (!rule) throw new NotFoundError("Pricing rule", ruleId);

    const nextValues: PricingValues = {
      base_rate: data.base_rate ?? rule.base_rate,
      rate_per_km: data.rate_per_km ?? rule.rate_per_km,
      inside_bello_flat_fare_cop:
        data.inside_bello_flat_fare_cop ?? rule.inside_bello_flat_fare_cop,
      outside_minimum_fare_cop:
        data.outside_minimum_fare_cop ?? rule.outside_minimum_fare_cop,
      commission_percentage:
        data.commission_percentage ?? rule.commission_percentage,
    };
    assertPricingValues(nextValues);

    const fields: string[] = [];
    const values: unknown[] = [];
    for (const field of [
      "base_rate",
      "rate_per_km",
      "inside_bello_flat_fare_cop",
      "outside_minimum_fare_cop",
      "commission_percentage",
    ] as const) {
      const value = data[field];
      if (value !== undefined) {
        fields.push(`${field} = ?`);
        values.push(value);
      }
    }
    if (fields.length === 0) return rule;

    fields.push("updated_at = ?");
    values.push(getCurrentUtcTimestamp(), ruleId);
    this.db
      .prepare(`UPDATE pricing_rules SET ${fields.join(", ")} WHERE id = ?`)
      .run(...values);

    this.logger.info("Pricing rule updated", { ruleId });
    return this.db
      .prepare("SELECT * FROM pricing_rules WHERE id = ?")
      .get(ruleId) as PricingRule;
  }

  deactivate(ruleId: string): PricingRule {
    const rule = this.db
      .prepare("SELECT * FROM pricing_rules WHERE id = ?")
      .get(ruleId) as PricingRule | undefined;
    if (!rule) throw new NotFoundError("Pricing rule", ruleId);

    this.db
      .prepare(
        "UPDATE pricing_rules SET active = 0, updated_at = ? WHERE id = ?",
      )
      .run(getCurrentUtcTimestamp(), ruleId);

    this.logger.info("Pricing rule deactivated", { ruleId });
    return this.db
      .prepare("SELECT * FROM pricing_rules WHERE id = ?")
      .get(ruleId) as PricingRule;
  }

  getActiveByType(errandType: ErrandType): PricingRule | null {
    const rule = this.db
      .prepare(
        "SELECT * FROM pricing_rules WHERE errand_type = ? AND active = 1 ORDER BY updated_at DESC, id DESC LIMIT 1",
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
