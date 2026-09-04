-- Durable contract-email worker compatibility.
-- Migration 007 was already released without a claim state or a processing
-- timestamp. Rebuild only the outbox table so existing rows and all other
-- contract-signature data remain untouched.

DROP INDEX IF EXISTS idx_contract_email_queue_ready;

ALTER TABLE contract_email_queue RENAME TO contract_email_queue_legacy;

CREATE TABLE contract_email_queue (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES contract_signature_cases(id),
  delivery_attempt_id TEXT REFERENCES contract_delivery_attempts(id),
  event_type TEXT NOT NULL CHECK(event_type IN ('contract_sent','contract_resent','signed_document_available','contract_approved','contract_rejected','link_expired')),
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  template_key TEXT NOT NULL,
  payload_ciphertext TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','sent','failed')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts >= 0 AND attempts <= 3),
  next_retry_at TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  sent_at TEXT
);

INSERT INTO contract_email_queue (
  id, case_id, delivery_attempt_id, event_type, recipient_email, subject,
  template_key, payload_ciphertext, status, attempts, next_retry_at,
  last_error, created_at, updated_at, sent_at
)
SELECT id, case_id, delivery_attempt_id, event_type, recipient_email, subject,
       template_key, payload_ciphertext, status, attempts, next_retry_at,
       last_error, created_at, COALESCE(sent_at, created_at), sent_at
  FROM contract_email_queue_legacy;

DROP TABLE contract_email_queue_legacy;

CREATE INDEX idx_contract_email_queue_ready
  ON contract_email_queue(status, next_retry_at, created_at);
