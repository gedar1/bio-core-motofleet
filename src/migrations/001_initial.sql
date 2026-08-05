-- Users
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  address TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','suspended','inactive')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Riders (motorcyclists)
CREATE TABLE riders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  address TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  license_number TEXT NOT NULL,
  license_expiry TEXT NOT NULL,
  insurance_number TEXT NOT NULL,
  insurance_expiry TEXT NOT NULL,
  bond_amount REAL NOT NULL CHECK(bond_amount > 0),
  emergency_contact_name TEXT NOT NULL,
  emergency_contact_phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','suspended','inactive')),
  available INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Admins
CREATE TABLE admins (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'operator' CHECK(role IN ('superadmin','operator')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Cosigners
CREATE TABLE cosigners (
  id TEXT PRIMARY KEY,
  rider_id TEXT NOT NULL REFERENCES riders(id),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  relationship TEXT NOT NULL,
  identity_document TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(rider_id, identity_document)
);

-- Motorcycles
CREATE TABLE motorcycles (
  id TEXT PRIMARY KEY,
  plate TEXT NOT NULL UNIQUE,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL CHECK(year >= 1970),
  color TEXT NOT NULL,
  engine_cc INTEGER NOT NULL CHECK(engine_cc BETWEEN 50 AND 2000),
  soat_expiry TEXT NOT NULL,
  inspection_expiry TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available','rented','maintenance','retired')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Rental contracts
CREATE TABLE rental_contracts (
  id TEXT PRIMARY KEY,
  rider_id TEXT NOT NULL REFERENCES riders(id),
  motorcycle_id TEXT NOT NULL REFERENCES motorcycles(id),
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  monthly_amount REAL NOT NULL CHECK(monthly_amount > 0),
  payment_day INTEGER NOT NULL CHECK(payment_day BETWEEN 1 AND 28),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','expired','renewed','cancelled')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Rental payments
CREATE TABLE rental_payments (
  id TEXT PRIMARY KEY,
  contract_id TEXT NOT NULL REFERENCES rental_contracts(id),
  amount REAL NOT NULL CHECK(amount > 0),
  payment_date TEXT NOT NULL,
  payment_method TEXT NOT NULL CHECK(payment_method IN ('cash','transfer')),
  period TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(contract_id, period)
);

-- Pricing rules
CREATE TABLE pricing_rules (
  id TEXT PRIMARY KEY,
  errand_type TEXT NOT NULL CHECK(errand_type IN ('object_transport','purchase','errand')),
  base_rate REAL NOT NULL CHECK(base_rate BETWEEN 0.01 AND 999999.99),
  rate_per_km REAL NOT NULL CHECK(rate_per_km BETWEEN 0.00 AND 9999.99),
  commission_percentage REAL NOT NULL CHECK(commission_percentage BETWEEN 1.00 AND 50.00),
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Errands
CREATE TABLE errands (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  rider_id TEXT REFERENCES riders(id),
  type TEXT NOT NULL CHECK(type IN ('object_transport','purchase','errand')),
  description TEXT NOT NULL,
  origin_address TEXT NOT NULL,
  origin_lat REAL,
  origin_lng REAL,
  destination_address TEXT NOT NULL,
  destination_lat REAL,
  destination_lng REAL,
  estimated_distance REAL,
  fare REAL NOT NULL,
  platform_commission REAL NOT NULL,
  rider_earnings REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested' CHECK(status IN ('requested','accepted','picked_up','delivered','cancelled')),
  payment_method TEXT NOT NULL CHECK(payment_method IN ('cash','transfer')),
  cancellation_reason TEXT,
  requested_at TEXT NOT NULL DEFAULT (datetime('now')),
  accepted_at TEXT,
  picked_up_at TEXT,
  delivered_at TEXT,
  cancelled_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Login attempts tracking
CREATE TABLE login_attempts (
  email TEXT PRIMARY KEY,
  failed_count INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Notification queue
CREATE TABLE notification_queue (
  id TEXT PRIMARY KEY,
  errand_id TEXT NOT NULL REFERENCES errands(id),
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sent','failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_retry_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  sent_at TEXT
);

-- Indexes for performance
CREATE INDEX idx_errands_status ON errands(status);
CREATE INDEX idx_errands_user_id ON errands(user_id);
CREATE INDEX idx_errands_rider_id ON errands(rider_id);
CREATE INDEX idx_errands_requested_at ON errands(requested_at);
CREATE INDEX idx_rental_contracts_rider ON rental_contracts(rider_id);
CREATE INDEX idx_rental_contracts_motorcycle ON rental_contracts(motorcycle_id);
CREATE INDEX idx_rental_contracts_status ON rental_contracts(status);
CREATE INDEX idx_motorcycles_status ON motorcycles(status);
CREATE INDEX idx_cosigners_rider ON cosigners(rider_id);
CREATE INDEX idx_notification_queue_status ON notification_queue(status, next_retry_at);
