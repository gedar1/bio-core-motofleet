-- Rider identity documents. Nullable columns preserve pre-existing rider records.
ALTER TABLE riders ADD COLUMN document_type TEXT
  CHECK(document_type IS NULL OR document_type IN ('CC', 'CE', 'PPT', 'PASAPORTE'));
ALTER TABLE riders ADD COLUMN document_number TEXT;

-- New registrations enforce a unique canonical document pair in application code;
-- this partial unique index also protects database integrity while allowing legacy NULLs.
CREATE UNIQUE INDEX idx_riders_document_identity
  ON riders(document_type, document_number)
  WHERE document_type IS NOT NULL AND document_number IS NOT NULL;
