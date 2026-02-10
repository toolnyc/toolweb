-- Seed data for Tool.NYC

-- Portfolio items
INSERT INTO portfolio_items (title, description, category, media_url, media_type, display_size, sort_order, status) VALUES
  ('Brand Identity — Meridian', 'Complete visual identity for a fintech startup', 'brand', 'https://placehold.co/1200x800/111/fff?text=Meridian', 'image', 'large', 1, 'published'),
  ('Motion Reel 2025', 'Selected motion work from recent projects', 'motion', 'https://placehold.co/800x800/222/fff?text=Motion', 'image', 'medium', 2, 'published'),
  ('Tidal — Web Platform', 'Full-stack web application for ocean data', 'web', 'https://placehold.co/600x600/333/fff?text=Tidal', 'image', 'small', 3, 'published'),
  ('Poster Series — SYNC', 'Event poster design for SYNC conference', 'graphic', 'https://placehold.co/800x1200/444/fff?text=SYNC', 'image', 'medium', 4, 'published'),
  ('Waypoint — Brand + Web', 'Branding and website for a logistics company', 'brand', 'https://placehold.co/600x400/555/fff?text=Waypoint', 'image', 'small', 5, 'published');

-- Writing snippets
INSERT INTO writing_snippets (content, attribution, sort_order, status) VALUES
  ('Design is how it works.', NULL, 1, 'published'),
  ('We build tools that work.', NULL, 2, 'published'),
  ('The details are not the details. They make the design.', 'Charles Eames', 3, 'published');

-- Client logos
INSERT INTO client_logos (name, website_url, sort_order) VALUES
  ('Meridian', 'https://meridian.example.com', 1),
  ('Tidal', 'https://tidal.example.com', 2),
  ('SYNC', 'https://sync.example.com', 3),
  ('Waypoint', 'https://waypoint.example.com', 4),
  ('Basecamp Studios', NULL, 5);

-- Sample product with variants
INSERT INTO products (name, description, price, image_url, status, shipping_domestic, shipping_international) VALUES
  ('Tool Tee — Black', 'Heavyweight cotton tee with Tool wordmark. Runs true to size.', 45, 'https://placehold.co/800x800/000/fff?text=Tee', 'draft', 5, 15);

INSERT INTO product_variants (product_id, label, stock_count, sort_order)
SELECT id, unnest(ARRAY['S', 'M', 'L', 'XL']), unnest(ARRAY[10, 15, 15, 10]), unnest(ARRAY[1, 2, 3, 4])
FROM products WHERE name = 'Tool Tee — Black';

-- Site content
INSERT INTO site_content (content_key, title, content, content_group, sort_order) VALUES
  ('hero_tagline', NULL, 'Full-service creative technical consultancy', 'homepage', 1),
  ('about_blurb', 'About', 'Tool is a creative technical consultancy specializing in brand identity, motion design, and software development. We build things that look good and work well.', 'homepage', 2),
  ('footer_text', NULL, '© 2026 Tool', 'footer', 1);
