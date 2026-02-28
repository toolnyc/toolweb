ALTER TABLE project_inquiries
  ADD COLUMN source TEXT NOT NULL DEFAULT 'form',
  ADD COLUMN ai_transcript TEXT,
  ADD COLUMN ai_extracted JSONB,
  ADD COLUMN ai_summary TEXT;
