-- Bello local pricing policy and exact-pin quote snapshots.
-- Uses the official DANE MGN 2025 municipality boundary at runtime.

ALTER TABLE pricing_rules ADD COLUMN inside_bello_flat_fare_cop INTEGER NOT NULL DEFAULT 10000
  CHECK(inside_bello_flat_fare_cop >= 1);
ALTER TABLE pricing_rules ADD COLUMN outside_minimum_fare_cop INTEGER NOT NULL DEFAULT 12000
  CHECK(outside_minimum_fare_cop >= 1);

-- A legacy database may have duplicate active rows from seeds or direct SQL.
-- Retain the most recently updated row deterministically, then enforce the invariant.
UPDATE pricing_rules
SET active = 0,
    updated_at = datetime('now')
WHERE active = 1
  AND EXISTS (
    SELECT 1
    FROM pricing_rules AS preferred
    WHERE preferred.errand_type = pricing_rules.errand_type
      AND preferred.active = 1
      AND (
        preferred.updated_at > pricing_rules.updated_at
        OR (
          preferred.updated_at = pricing_rules.updated_at
          AND preferred.created_at > pricing_rules.created_at
        )
        OR (
          preferred.updated_at = pricing_rules.updated_at
          AND preferred.created_at = pricing_rules.created_at
          AND preferred.id > pricing_rules.id
        )
      )
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_pricing_rules_one_active_per_type
  ON pricing_rules(errand_type)
  WHERE active = 1;

-- Normalize the active operational rules selected for the Bello pricing trial.
UPDATE pricing_rules
SET base_rate = 5000,
    rate_per_km = 1500,
    commission_percentage = 15,
    inside_bello_flat_fare_cop = 10000,
    outside_minimum_fare_cop = 12000,
    updated_at = datetime('now')
WHERE active = 1;

ALTER TABLE errand_quotes ADD COLUMN origin_exact_lat REAL
  CHECK(origin_exact_lat IS NULL OR origin_exact_lat BETWEEN -90 AND 90);
ALTER TABLE errand_quotes ADD COLUMN origin_exact_lng REAL
  CHECK(origin_exact_lng IS NULL OR origin_exact_lng BETWEEN -180 AND 180);
ALTER TABLE errand_quotes ADD COLUMN destination_exact_lat REAL
  CHECK(destination_exact_lat IS NULL OR destination_exact_lat BETWEEN -90 AND 90);
ALTER TABLE errand_quotes ADD COLUMN destination_exact_lng REAL
  CHECK(destination_exact_lng IS NULL OR destination_exact_lng BETWEEN -180 AND 180);

-- Existing quotes predate exact-pin policy. Expire them before comparing exact pins
-- at creation, while preserving rows for audit.
UPDATE errand_quotes
SET origin_exact_lat = origin_lat,
    origin_exact_lng = origin_lng,
    destination_exact_lat = destination_lat,
    destination_exact_lng = destination_lng,
    expires_at = CASE
      WHEN consumed_at IS NULL THEN datetime('now')
      ELSE expires_at
    END;
