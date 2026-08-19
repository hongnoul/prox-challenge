CREATE TABLE IF NOT EXISTS omnipro_rate_limits (
  key TEXT PRIMARY KEY,
  count BIGINT NOT NULL CHECK (count > 0),
  reset_at TIMESTAMPTZ NOT NULL
);

-- statement-breakpoint
CREATE INDEX IF NOT EXISTS omnipro_rate_limits_reset_at_idx
ON omnipro_rate_limits (reset_at);
