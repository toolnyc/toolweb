-- Tool.NYC initial schema

-- Enums
CREATE TYPE portfolio_category AS ENUM ('motion', 'graphic', 'web', 'brand');
CREATE TYPE portfolio_media_type AS ENUM ('image', 'video');
CREATE TYPE display_size AS ENUM ('small', 'medium', 'large');
CREATE TYPE content_status AS ENUM ('draft', 'published');
CREATE TYPE product_status AS ENUM ('draft', 'upcoming', 'active', 'sold_out');
CREATE TYPE order_status AS ENUM ('paid', 'shipped', 'delivered', 'refunded');
CREATE TYPE client_status AS ENUM ('active', 'inactive');
CREATE TYPE project_status AS ENUM ('inquiry', 'discovery', 'proposal', 'active', 'review', 'complete');
CREATE TYPE inquiry_status AS ENUM ('new', 'reviewed', 'converted', 'declined');

-- Tables

CREATE TABLE portfolio_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category portfolio_category NOT NULL,
  media_url TEXT NOT NULL,
  media_type portfolio_media_type NOT NULL DEFAULT 'image',
  thumbnail_url TEXT,
  external_url TEXT,
  display_size display_size NOT NULL DEFAULT 'medium',
  sort_order INT NOT NULL DEFAULT 0,
  status content_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_portfolio_status ON portfolio_items(status);
CREATE INDEX idx_portfolio_sort ON portfolio_items(sort_order);

CREATE TABLE writing_snippets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  attribution TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  status content_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE client_logos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  website_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  company TEXT,
  auth_user_id UUID UNIQUE REFERENCES auth.users(id),
  status client_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_auth ON clients(auth_user_id);

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status project_status NOT NULL DEFAULT 'discovery',
  deliverables_url TEXT,
  stripe_invoice_id TEXT,
  stripe_invoice_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_projects_client ON projects(client_id);
CREATE INDEX idx_projects_status ON projects(status);

CREATE TABLE project_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  project_type TEXT,
  description TEXT NOT NULL,
  budget_range TEXT,
  timeline TEXT,
  status inquiry_status NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inquiries_status ON project_inquiries(status);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  image_url TEXT,
  stripe_product_id TEXT,
  drop_date TIMESTAMPTZ,
  status product_status NOT NULL DEFAULT 'draft',
  shipping_domestic NUMERIC NOT NULL DEFAULT 5,
  shipping_international NUMERIC NOT NULL DEFAULT 15,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  stock_count INT NOT NULL DEFAULT 0,
  stripe_price_id TEXT,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX idx_variants_product ON product_variants(product_id);

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number SERIAL,
  product_variant_id UUID REFERENCES product_variants(id),
  stripe_session_id TEXT UNIQUE NOT NULL,
  stripe_payment_intent_id TEXT,
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  shipping_address JSONB NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  amount_paid NUMERIC NOT NULL,
  shipping_cost NUMERIC NOT NULL,
  status order_status NOT NULL DEFAULT 'paid',
  tracking_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_session ON orders(stripe_session_id);
CREATE INDEX idx_orders_status ON orders(status);

CREATE TABLE site_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_key TEXT UNIQUE NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  content_group TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- updated_at triggers

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_portfolio_items_updated_at
  BEFORE UPDATE ON portfolio_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_site_content_updated_at
  BEFORE UPDATE ON site_content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS

ALTER TABLE portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE writing_snippets ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_logos ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;

-- Public read policies

CREATE POLICY "Public can read published portfolio items"
  ON portfolio_items FOR SELECT
  USING (status = 'published');

CREATE POLICY "Public can read published writing snippets"
  ON writing_snippets FOR SELECT
  USING (status = 'published');

CREATE POLICY "Public can read visible client logos"
  ON client_logos FOR SELECT
  USING (is_visible = true);

CREATE POLICY "Public can read active/upcoming products"
  ON products FOR SELECT
  USING (status IN ('active', 'upcoming'));

CREATE POLICY "Public can read variants of active products"
  ON product_variants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_variants.product_id
      AND products.status = 'active'
    )
  );

CREATE POLICY "Public can read site content"
  ON site_content FOR SELECT
  USING (true);

-- Client portal policies

CREATE POLICY "Clients can read own record"
  ON clients FOR SELECT
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Clients can read own projects"
  ON projects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = projects.client_id
      AND clients.auth_user_id = auth.uid()
    )
  );

-- Service role has full access by default (bypasses RLS)
-- No explicit policies needed for admin/service role
