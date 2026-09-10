-- Preserve the user's address intent and the operational pickup/dropoff points.
-- Existing rows are backfilled from the legacy address and route coordinates.
ALTER TABLE errands ADD COLUMN origin_address_input TEXT;
ALTER TABLE errands ADD COLUMN origin_address_resolved TEXT;
ALTER TABLE errands ADD COLUMN origin_exact_lat REAL
  CHECK(origin_exact_lat IS NULL OR origin_exact_lat BETWEEN -90 AND 90);
ALTER TABLE errands ADD COLUMN origin_exact_lng REAL
  CHECK(origin_exact_lng IS NULL OR origin_exact_lng BETWEEN -180 AND 180);
ALTER TABLE errands ADD COLUMN origin_routable_lat REAL
  CHECK(origin_routable_lat IS NULL OR origin_routable_lat BETWEEN -90 AND 90);
ALTER TABLE errands ADD COLUMN origin_routable_lng REAL
  CHECK(origin_routable_lng IS NULL OR origin_routable_lng BETWEEN -180 AND 180);
ALTER TABLE errands ADD COLUMN origin_instructions TEXT;
ALTER TABLE errands ADD COLUMN origin_confirmed INTEGER NOT NULL DEFAULT 0
  CHECK(origin_confirmed IN (0, 1));

ALTER TABLE errands ADD COLUMN destination_address_input TEXT;
ALTER TABLE errands ADD COLUMN destination_address_resolved TEXT;
ALTER TABLE errands ADD COLUMN destination_exact_lat REAL
  CHECK(destination_exact_lat IS NULL OR destination_exact_lat BETWEEN -90 AND 90);
ALTER TABLE errands ADD COLUMN destination_exact_lng REAL
  CHECK(destination_exact_lng IS NULL OR destination_exact_lng BETWEEN -180 AND 180);
ALTER TABLE errands ADD COLUMN destination_routable_lat REAL
  CHECK(destination_routable_lat IS NULL OR destination_routable_lat BETWEEN -90 AND 90);
ALTER TABLE errands ADD COLUMN destination_routable_lng REAL
  CHECK(destination_routable_lng IS NULL OR destination_routable_lng BETWEEN -180 AND 180);
ALTER TABLE errands ADD COLUMN destination_instructions TEXT;
ALTER TABLE errands ADD COLUMN destination_confirmed INTEGER NOT NULL DEFAULT 0
  CHECK(destination_confirmed IN (0, 1));

UPDATE errands
SET
  origin_address_input = COALESCE(origin_address_input, origin_address),
  origin_address_resolved = COALESCE(origin_address_resolved, origin_address),
  origin_exact_lat = COALESCE(origin_exact_lat, origin_lat),
  origin_exact_lng = COALESCE(origin_exact_lng, origin_lng),
  origin_routable_lat = COALESCE(origin_routable_lat, origin_lat),
  origin_routable_lng = COALESCE(origin_routable_lng, origin_lng),
  origin_confirmed = 1,
  destination_address_input = COALESCE(destination_address_input, destination_address),
  destination_address_resolved = COALESCE(destination_address_resolved, destination_address),
  destination_exact_lat = COALESCE(destination_exact_lat, destination_lat),
  destination_exact_lng = COALESCE(destination_exact_lng, destination_lng),
  destination_routable_lat = COALESCE(destination_routable_lat, destination_lat),
  destination_routable_lng = COALESCE(destination_routable_lng, destination_lng),
  destination_confirmed = 1;
