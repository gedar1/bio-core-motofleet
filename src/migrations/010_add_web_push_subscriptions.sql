CREATE TABLE web_push_subscriptions (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  owner_role TEXT NOT NULL CHECK (owner_role IN ('user', 'rider', 'admin')),
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  expiration_time_ms INTEGER NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_web_push_subscriptions_owner
  ON web_push_subscriptions(owner_id, owner_role, updated_at DESC);
