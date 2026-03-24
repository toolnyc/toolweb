-- Add progress tracking to batches
ALTER TABLE outreach_batches ADD COLUMN IF NOT EXISTS progress jsonb DEFAULT '{}';
