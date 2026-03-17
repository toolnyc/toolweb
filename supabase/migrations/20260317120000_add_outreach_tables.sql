-- Outreach pipeline: batches, prospects, sent messages

CREATE TABLE outreach_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'running',
  visitor_count int NOT NULL DEFAULT 0,
  prospect_count int NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE outreach_prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES outreach_batches(id) ON DELETE CASCADE,
  apollo_person_id text,
  name text NOT NULL,
  title text,
  company text NOT NULL,
  email text,
  linkedin_url text,
  signal text,
  company_size text,
  company_industry text,
  recent_news text,
  confidence_score int CHECK (confidence_score >= 0 AND confidence_score <= 100),
  draft_subject text,
  draft_body text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE outreach_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES outreach_prospects(id) ON DELETE CASCADE,
  subject text NOT NULL,
  body text NOT NULL,
  resend_message_id text,
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION update_outreach_prospect_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER outreach_prospects_updated_at
  BEFORE UPDATE ON outreach_prospects
  FOR EACH ROW EXECUTE FUNCTION update_outreach_prospect_updated_at();
