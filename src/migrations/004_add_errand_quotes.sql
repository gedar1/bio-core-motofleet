-- Forward-only, server-authoritative quotes approved by users before errand creation.
CREATE TABLE errand_quotes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  errand_type TEXT NOT NULL CHECK(errand_type IN ('object_transport', 'purchase', 'errand')),
  origin_lat REAL NOT NULL CHECK(origin_lat BETWEEN -90 AND 90),
  origin_lng REAL NOT NULL CHECK(origin_lng BETWEEN -180 AND 180),
  destination_lat REAL NOT NULL CHECK(destination_lat BETWEEN -90 AND 90),
  destination_lng REAL NOT NULL CHECK(destination_lng BETWEEN -180 AND 180),
  estimated_distance_km REAL NOT NULL CHECK(estimated_distance_km >= 0.5),
  estimated_duration_minutes REAL NOT NULL CHECK(estimated_duration_minutes >= 0),
  routing_provider TEXT NOT NULL CHECK(routing_provider IN ('mapbox', 'osrm', 'haversine')),
  routing_profile TEXT NOT NULL CHECK(routing_profile IN ('driving', 'driving-traffic')),
  fare_cop INTEGER NOT NULL CHECK(fare_cop >= 0),
  platform_commission_cop INTEGER NOT NULL CHECK(platform_commission_cop >= 0),
  rider_earnings_cop INTEGER NOT NULL CHECK(rider_earnings_cop >= 0),
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_errand_quotes_user_expiry
  ON errand_quotes(user_id, expires_at);
