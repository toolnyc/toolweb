-- Feature flags table
CREATE TABLE feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key TEXT UNIQUE NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Reuse existing updated_at trigger
CREATE TRIGGER trg_feature_flags_updated_at
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS: public read, admin write
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read feature flags"
  ON feature_flags FOR SELECT
  USING (true);

-- Seed initial flag
INSERT INTO feature_flags (flag_key, enabled, description)
VALUES ('shop_enabled', false, 'Show the shop section to public visitors');
