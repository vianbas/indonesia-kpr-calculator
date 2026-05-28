CREATE TABLE IF NOT EXISTS shared_scenarios (
  id         TEXT    PRIMARY KEY,
  payload    TEXT    NOT NULL,
  created_at INTEGER NOT NULL,
  ip_hash    TEXT    NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_expires_at        ON shared_scenarios (expires_at);
CREATE INDEX IF NOT EXISTS idx_ip_hash_created   ON shared_scenarios (ip_hash, created_at);
