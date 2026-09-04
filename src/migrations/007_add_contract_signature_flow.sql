-- Contract signature flow. This migration is forward-only; runMigrations records it
-- transactionally in _migrations, so it is applied once without changing legacy data.

CREATE TABLE contract_signature_cases (
  id TEXT PRIMARY KEY,
  contract_id TEXT NOT NULL UNIQUE REFERENCES rental_contracts(id),
  rider_id TEXT NOT NULL REFERENCES riders(id),
  motorcycle_id TEXT NOT NULL REFERENCES motorcycles(id),
  document_status TEXT NOT NULL DEFAULT 'preparado'
    CHECK(document_status IN ('preparado','enviado','accedido','cargado','en_revision','aprobado','rechazado','expirado')),
  formalization_status TEXT NOT NULL DEFAULT 'pendiente_formalizacion'
    CHECK(formalization_status IN ('pendiente_formalizacion','activo','vencido','renovado','cancelado')),
  delivery_attention TEXT
    CHECK(delivery_attention IN ('pending','failed','sent')),
  original_version_id TEXT REFERENCES contract_document_versions(id),
  current_signed_version_id TEXT REFERENCES contract_document_versions(id),
  reviewed_version_id TEXT REFERENCES contract_document_versions(id),
  formalized_at TEXT,
  created_by TEXT NOT NULL REFERENCES admins(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE contract_document_versions (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES contract_signature_cases(id),
  version_number INTEGER NOT NULL CHECK(version_number >= 1),
  kind TEXT NOT NULL CHECK(kind IN ('original','signed')),
  storage_key TEXT NOT NULL UNIQUE,
  storage_status TEXT NOT NULL DEFAULT 'pending'
    CHECK(storage_status IN ('pending','ready','quarantined','inconsistent','retained','deleted')),
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK(size_bytes BETWEEN 1 AND 26214400),
  sha256 TEXT NOT NULL,
  uploaded_by_type TEXT NOT NULL CHECK(uploaded_by_type IN ('admin','rider')),
  uploaded_by_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(case_id, version_number)
);

CREATE TABLE contract_delivery_attempts (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES contract_signature_cases(id),
  document_version_id TEXT NOT NULL REFERENCES contract_document_versions(id),
  attempt_number INTEGER NOT NULL CHECK(attempt_number >= 1),
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  delivery_status TEXT NOT NULL DEFAULT 'created'
    CHECK(delivery_status IN ('created','queued','sent','failed')),
  last_error TEXT,
  created_by TEXT NOT NULL REFERENCES admins(id),
  UNIQUE(case_id, attempt_number)
);

CREATE TABLE contract_verifications (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES contract_signature_cases(id),
  document_version_id TEXT NOT NULL REFERENCES contract_document_versions(id),
  admin_id TEXT NOT NULL REFERENCES admins(id),
  result TEXT NOT NULL CHECK(result IN ('satisfactory','unsatisfactory')),
  comments TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE contract_audit_events (
  id TEXT PRIMARY KEY,
  case_id TEXT REFERENCES contract_signature_cases(id),
  event_type TEXT NOT NULL,
  occurred_at TEXT NOT NULL DEFAULT (datetime('now')),
  result TEXT NOT NULL CHECK(result IN ('success','failure')),
  actor_type TEXT NOT NULL CHECK(actor_type IN ('admin','rider','token','system','anonymous')),
  actor_id TEXT,
  document_version_id TEXT REFERENCES contract_document_versions(id),
  delivery_attempt_id TEXT REFERENCES contract_delivery_attempts(id),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  error_code TEXT,
  error_message TEXT
);

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

CREATE INDEX idx_contract_document_versions_case_kind_version
  ON contract_document_versions(case_id, kind, version_number DESC);
CREATE INDEX idx_contract_document_versions_storage_status
  ON contract_document_versions(storage_status);
CREATE INDEX idx_contract_delivery_attempts_current
  ON contract_delivery_attempts(case_id, created_at DESC)
  WHERE revoked_at IS NULL;
CREATE INDEX idx_contract_verifications_case_version_created
  ON contract_verifications(case_id, document_version_id, created_at DESC);
CREATE INDEX idx_contract_audit_events_case_occurred
  ON contract_audit_events(case_id, occurred_at DESC, id DESC);
CREATE INDEX idx_contract_email_queue_ready
  ON contract_email_queue(status, next_retry_at, created_at);
