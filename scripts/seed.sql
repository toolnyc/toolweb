-- seed.sql
-- Populates the Supabase database with realistic placeholder content.
-- Run via: psql <connection_string> -f scripts/seed.sql
-- Or paste into the Supabase SQL editor.
--
-- All copy here is placeholder. Swap in real text when ready.
-- Voice follows docs/style-guide.md: direct, first-person singular,
-- no marketing speak, no superlatives.

BEGIN;

-- ============================================================
-- 1. site_content — editable CMS-style blocks
-- ============================================================

INSERT INTO site_content (content_key, title, content, content_group, sort_order) VALUES
  (
    'hero_tagline',
    NULL,
    'Design, motion, and web — for people who make things.',
    'homepage',
    0
  ),
  (
    'about_blurb',
    'About',
    'I run a one-person design practice out of New York. I work across brand identity, motion, and web — usually for small companies that care about how things look and feel but don''t have a creative department. Most of my clients find me through someone they trust. That''s the best way this works.',
    'homepage',
    1
  ),
  (
    'process_blurb',
    'How it works',
    'Start with a conversation. I learn what you need; you learn how I work. If it''s a fit, I send a scope and timeline within a few days. Projects run in short cycles — you see work early and often, not after six weeks of silence. Clear deliverables, no ambiguity on cost.',
    'homepage',
    2
  );

-- ============================================================
-- 2. portfolio_items — 6 pieces, mixed categories and sizes
-- ============================================================

-- Large: motion piece
INSERT INTO portfolio_items (
  title, description, category, media_url, media_type, thumbnail_url,
  display_size, sort_order, status,
  slug, is_case_study, problem, solution, impact
) VALUES (
  'Sable Studio Brand Reel',
  'A 60-second brand anthem for a ceramics studio in Red Hook. Shot on location, edited and graded in-house.',
  'motion',
  'https://media.tool.nyc/portfolio/placeholder-1.mp4',
  'video',
  'https://media.tool.nyc/portfolio/placeholder-1-thumb.jpg',
  'large', 0, 'published',
  'sable-studio-brand-reel',
  true,
  'Sable had a loyal local following but no visual presence online. Their Instagram was phone photos of finished pieces — no sense of the space, the process, or the people.',
  'A single 60-second reel that could live on their site, social, and wholesale pitch decks. We shot over two mornings in natural light, focusing on hands and material. I handled direction, edit, grade, and sound design.',
  'The reel became their most-shared piece of content. Three wholesale accounts cited it in their first outreach. Sable now leads with video in every new conversation.'
);

-- Large: brand identity
INSERT INTO portfolio_items (
  title, description, category, media_url, media_type,
  display_size, sort_order, status,
  slug, is_case_study
) VALUES (
  'Morrow & Co. Identity',
  'Full identity system for a financial advisory practice. Wordmark, color palette, stationery, and a simple site.',
  'brand',
  'https://media.tool.nyc/portfolio/placeholder-2.jpg',
  'image',
  'large', 1, 'published',
  NULL, false
);

-- Medium: web project
INSERT INTO portfolio_items (
  title, description, category, media_url, media_type,
  display_size, sort_order, status,
  slug, is_case_study
) VALUES (
  'Nightjar Menu Platform',
  'A web app for a natural wine bar. Rotating menu, QR table ordering, and a small shop for bottle pre-orders.',
  'web',
  'https://media.tool.nyc/portfolio/placeholder-3.jpg',
  'image',
  'medium', 2, 'published',
  NULL, false
);

-- Medium: graphic design
INSERT INTO portfolio_items (
  title, description, category, media_url, media_type,
  display_size, sort_order, status,
  slug, is_case_study
) VALUES (
  'Open Hours Poster Series',
  'Quarterly event posters for a community print shop in Greenpoint. Risograph, two-color, edition of 200.',
  'graphic',
  'https://media.tool.nyc/portfolio/placeholder-4.jpg',
  'image',
  'medium', 3, 'published',
  NULL, false
);

-- Small: motion
INSERT INTO portfolio_items (
  title, description, category, media_url, media_type, thumbnail_url,
  display_size, sort_order, status,
  slug, is_case_study
) VALUES (
  'Ferment Titles',
  'Opening title sequence for a short documentary about fermentation and patience.',
  'motion',
  'https://media.tool.nyc/portfolio/placeholder-5.mp4',
  'video',
  'https://media.tool.nyc/portfolio/placeholder-5-thumb.jpg',
  'small', 4, 'published',
  NULL, false
);

-- Small: web
INSERT INTO portfolio_items (
  title, description, category, media_url, media_type,
  display_size, sort_order, status,
  slug, is_case_study
) VALUES (
  'Ellsworth Landing Page',
  'Single-page site for a furniture maker. Three sections, an inquiry form, and nothing else.',
  'web',
  'https://media.tool.nyc/portfolio/placeholder-6.jpg',
  'image',
  'small', 5, 'published',
  NULL, false
);

-- ============================================================
-- 3. case_study_images — gallery for the Sable case study
-- ============================================================

INSERT INTO case_study_images (portfolio_item_id, media_url, caption, sort_order)
SELECT
  id,
  unnest(ARRAY[
    'https://media.tool.nyc/portfolio/sable-gallery-1.jpg',
    'https://media.tool.nyc/portfolio/sable-gallery-2.jpg',
    'https://media.tool.nyc/portfolio/sable-gallery-3.jpg'
  ]),
  unnest(ARRAY[
    'On set — morning light through the studio windows.',
    'Close-up of the throwing process, pulled from the final edit.',
    'Finished reel frame: the Sable wordmark over wet clay.'
  ]),
  unnest(ARRAY[0, 1, 2])
FROM portfolio_items
WHERE slug = 'sable-studio-brand-reel';

-- ============================================================
-- 4. writing_snippets — short observations, punchy, on-voice
-- ============================================================

INSERT INTO writing_snippets (content, attribution, sort_order, status) VALUES
  (
    'Most design problems are communication problems wearing a visual hat. Solve the communication first; the design gets easier.',
    NULL,
    0,
    'published'
  ),
  (
    'A brand identity is not a logo. It is every decision you make when no one is watching — the email signature, the hold music, the return label. The logo is just the part people can point to.',
    NULL,
    1,
    'published'
  ),
  (
    'The best client relationships start with "I don''t know what I need." The worst start with a spec sheet and a deadline.',
    NULL,
    2,
    'published'
  );

-- ============================================================
-- 5. client_logos — names only, no URLs needed
-- ============================================================

INSERT INTO client_logos (name, sort_order, is_visible) VALUES
  ('Sable Studio',      0, true),
  ('Morrow & Co.',      1, true),
  ('Nightjar',          2, true),
  ('Ellsworth Furniture', 3, true),
  ('Tenth Ave Press',   4, true);

-- ============================================================
-- 6. testimonials — realistic quotes with attribution
-- ============================================================

INSERT INTO testimonials (quote, attribution, company, sort_order, is_visible) VALUES
  (
    'Pete got what we were going for before we could articulate it. The whole process was fast, clear, and surprisingly low-stress for something this important to us.',
    'Laura Chen',
    'Sable Studio',
    0,
    true
  ),
  (
    'We had been through two agencies before this. The difference was obvious within the first week — no jargon, no runaround, just good work on time.',
    'David Morrow',
    'Morrow & Co.',
    1,
    true
  );

-- ============================================================
-- 7. product + 2 variants — shop test item
-- ============================================================

-- Insert the product
INSERT INTO products (
  name, description, price, image_url, status,
  shipping_domestic, shipping_international
) VALUES (
  'Meserole Street Risograph Print',
  'Two-color risograph on French Paper Co. kraft cover stock. Edition of 50, signed and numbered. 11x17 inches.',
  35,
  'https://media.tool.nyc/shop/meserole-print.jpg',
  'active',
  5,
  15
);

-- Insert two size variants for the product
INSERT INTO product_variants (product_id, label, stock_count, stripe_price_id, sort_order)
SELECT
  id,
  '11x17',
  25,
  NULL,
  0
FROM products WHERE name = 'Meserole Street Risograph Print';

INSERT INTO product_variants (product_id, label, stock_count, stripe_price_id, sort_order)
SELECT
  id,
  '18x24',
  10,
  NULL,
  1
FROM products WHERE name = 'Meserole Street Risograph Print';

COMMIT;
