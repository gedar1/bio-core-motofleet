-- Forward-only route snapshot and COP values for errands.
-- Existing databases are safe because runMigrations records this file atomically in
-- _migrations. Do not run this SQL manually after it has been recorded.
ALTER TABLE errands ADD COLUMN estimated_distance_km REAL
  CHECK(estimated_distance_km IS NULL OR estimated_distance_km >= 0);
ALTER TABLE errands ADD COLUMN estimated_duration_minutes REAL
  CHECK(estimated_duration_minutes IS NULL OR estimated_duration_minutes >= 0);
ALTER TABLE errands ADD COLUMN routing_provider TEXT
  CHECK(routing_provider IS NULL OR routing_provider IN ('mapbox', 'osrm', 'haversine', 'legacy'));
ALTER TABLE errands ADD COLUMN routing_profile TEXT
  CHECK(routing_profile IS NULL OR routing_profile IN ('driving', 'driving-traffic', 'legacy'));
ALTER TABLE errands ADD COLUMN route_calculated_at TEXT;

-- Parallel nullable columns allow legacy REAL amounts to coexist until task 14.8
-- changes the pricing writer. Amounts are integral Colombian pesos (COP).
ALTER TABLE errands ADD COLUMN fare_cop INTEGER
  CHECK(fare_cop IS NULL OR fare_cop >= 0);
ALTER TABLE errands ADD COLUMN platform_commission_cop INTEGER
  CHECK(platform_commission_cop IS NULL OR platform_commission_cop >= 0);
ALTER TABLE errands ADD COLUMN rider_earnings_cop INTEGER
  CHECK(rider_earnings_cop IS NULL OR rider_earnings_cop >= 0);

-- Backfill strategy:
-- * Convert every legacy REAL amount deterministically with SQLite ROUND(value, 0)
--   (half values round away from zero) and store the resulting integer COP.
-- * COALESCE never replaces a value already written by a prior/manual backfill.
-- * Legacy routes are labelled honestly as legacy; duration remains NULL because it
--   cannot be reconstructed safely. The original estimated distance and request
--   timestamp are copied only when the new snapshot value is absent.
UPDATE errands
SET
  estimated_distance_km = COALESCE(estimated_distance_km, estimated_distance),
  routing_provider = COALESCE(routing_provider, 'legacy'),
  routing_profile = COALESCE(routing_profile, 'legacy'),
  route_calculated_at = COALESCE(route_calculated_at, requested_at, created_at),
  fare_cop = COALESCE(fare_cop, CAST(ROUND(fare, 0) AS INTEGER)),
  platform_commission_cop = COALESCE(
    platform_commission_cop,
    CAST(ROUND(platform_commission, 0) AS INTEGER)
  ),
  rider_earnings_cop = COALESCE(
    rider_earnings_cop,
    CAST(ROUND(rider_earnings, 0) AS INTEGER)
  );

-- Verification after migration (all three missing_* values should be zero):
-- SELECT COUNT(*) AS total,
--   COALESCE(SUM(fare_cop IS NULL), 0) AS missing_fare_cop,
--   COALESCE(SUM(platform_commission_cop IS NULL), 0) AS missing_platform_commission_cop,
--   COALESCE(SUM(rider_earnings_cop IS NULL), 0) AS missing_rider_earnings_cop,
--   COALESCE(SUM(estimated_distance IS NOT NULL AND estimated_distance_km IS NULL), 0)
--     AS missing_distance_snapshot
-- FROM errands;
--
-- Audit deterministic conversion without changing data:
-- SELECT id, fare, fare_cop, platform_commission, platform_commission_cop,
--   rider_earnings, rider_earnings_cop
-- FROM errands
-- WHERE fare_cop != CAST(ROUND(fare, 0) AS INTEGER)
--    OR platform_commission_cop != CAST(ROUND(platform_commission, 0) AS INTEGER)
--    OR rider_earnings_cop != CAST(ROUND(rider_earnings, 0) AS INTEGER);