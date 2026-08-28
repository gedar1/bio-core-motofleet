-- Add PIN column for delivery verification
-- The PIN is a 6-digit code used to verify both pickup and delivery
-- User shares the PIN with the recipient for secure handoff
ALTER TABLE errands ADD COLUMN pin TEXT;

-- Create index for PIN lookups (useful for verification endpoints)
CREATE INDEX idx_errands_pin ON errands(pin);
