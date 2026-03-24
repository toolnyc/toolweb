-- Reshape outreach into a lightweight CRM
-- Status pipeline: pending → approved → contacted (skipped/declined as exits)

-- Drop email-sending infrastructure (not needed)
DROP TABLE IF EXISTS outreach_messages;

-- Remove draft email columns
ALTER TABLE outreach_prospects DROP COLUMN IF EXISTS draft_subject;
ALTER TABLE outreach_prospects DROP COLUMN IF EXISTS draft_body;

-- Add contacted metadata
ALTER TABLE outreach_prospects ADD COLUMN IF NOT EXISTS contacted_at timestamptz;
ALTER TABLE outreach_prospects ADD COLUMN IF NOT EXISTS contact_notes text;

-- Add company_description if it doesn't exist (schema had it, just in case)
ALTER TABLE outreach_prospects ADD COLUMN IF NOT EXISTS company_description text;
