-- Drop tables that only existed for Apollo outreach, the client portal,
-- and admin project tracking (#33).
--
-- Kept (still used by the public site): portfolio_items, case_study_images,
-- writing_snippets, client_logos, testimonials, products, product_variants,
-- orders, project_inquiries, site_content, feature_flags, rate_limits,
-- error_logs, analytics_events.
--
-- Indexes, triggers, and RLS policies on the dropped tables go away with the
-- tables themselves. clients.auth_user_id was the only FK to auth.users.
-- update_updated_at() stays: it still backs triggers on portfolio_items,
-- site_content, and feature_flags.

-- Apollo outreach pipeline
DROP TABLE IF EXISTS outreach_messages;
DROP TABLE IF EXISTS outreach_prospects;
DROP TABLE IF EXISTS outreach_batches;
DROP FUNCTION IF EXISTS update_outreach_prospect_updated_at();

-- Client portal + admin project tracking
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS clients;

-- Enum types used only by the dropped tables
DROP TYPE IF EXISTS project_status;
DROP TYPE IF EXISTS client_status;
