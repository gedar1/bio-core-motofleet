-- Keep dismissed notifications out of the inbox without releasing their deduplication keys.
ALTER TABLE notifications ADD COLUMN deleted_at TEXT;

CREATE INDEX idx_notifications_recipient_visible
  ON notifications(recipient_id, recipient_role, deleted_at, created_at DESC);
