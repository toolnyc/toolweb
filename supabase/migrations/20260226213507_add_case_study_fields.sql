-- Add case study fields to portfolio_items
ALTER TABLE portfolio_items
  ADD COLUMN slug TEXT UNIQUE,
  ADD COLUMN problem TEXT,
  ADD COLUMN solution TEXT,
  ADD COLUMN impact TEXT,
  ADD COLUMN is_case_study BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX idx_portfolio_slug ON portfolio_items(slug) WHERE slug IS NOT NULL;
CREATE INDEX idx_portfolio_case_study ON portfolio_items(is_case_study) WHERE is_case_study = true;

-- Case study image gallery (multiple images per case study)
CREATE TABLE case_study_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_item_id UUID NOT NULL REFERENCES portfolio_items(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  caption TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_case_study_images_item ON case_study_images(portfolio_item_id);

-- RLS: public read for published case study images
ALTER TABLE case_study_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read case study images"
  ON case_study_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM portfolio_items
      WHERE portfolio_items.id = case_study_images.portfolio_item_id
      AND portfolio_items.status = 'published'
    )
  );

-- Testimonials for inline client quotes
CREATE TABLE testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote TEXT NOT NULL,
  attribution TEXT NOT NULL,
  company TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read visible testimonials"
  ON testimonials FOR SELECT
  USING (is_visible = true);
