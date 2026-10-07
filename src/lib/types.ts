// -- Enums --

export type PortfolioCategory = 'motion' | 'graphic' | 'web' | 'brand';
export type PortfolioMediaType = 'image' | 'video';
export type DisplaySize = 'small' | 'medium' | 'large';
export type ContentStatus = 'draft' | 'published';
export type ProductStatus = 'draft' | 'upcoming' | 'active' | 'sold_out';

// -- Table rows --

export interface PortfolioItem {
  id: string;
  title: string;
  description: string | null;
  category: PortfolioCategory;
  media_url: string;
  media_type: PortfolioMediaType;
  thumbnail_url: string | null;
  external_url: string | null;
  display_size: DisplaySize;
  sort_order: number;
  status: ContentStatus;
  slug: string | null;
  problem: string | null;
  solution: string | null;
  impact: string | null;
  body: string | null;
  is_case_study: boolean;
  created_at: string;
  updated_at: string;
}

export interface CaseStudyImage {
  id: string;
  portfolio_item_id: string;
  media_url: string;
  caption: string | null;
  sort_order: number;
  created_at: string;
}

export interface Testimonial {
  id: string;
  quote: string;
  attribution: string;
  company: string | null;
  sort_order: number;
  is_visible: boolean;
  created_at: string;
}

export interface WritingSnippet {
  id: string;
  content: string;
  attribution: string | null;
  sort_order: number;
  status: ContentStatus;
  created_at: string;
}

export interface ClientLogo {
  id: string;
  name: string;
  website_url: string | null;
  sort_order: number;
  is_visible: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  stripe_product_id: string | null;
  drop_date: string | null;
  status: ProductStatus;
  shipping_domestic: number;
  shipping_international: number;
  created_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  label: string;
  stock_count: number;
  stripe_price_id: string | null;
  sort_order: number;
}

export interface SiteContent {
  id: string;
  content_key: string;
  title: string | null;
  content: string;
  content_group: string | null;
  sort_order: number;
  updated_at: string;
}

// -- Outreach --

export type OutreachProspectStatus = 'pending' | 'approved' | 'contacted' | 'skipped' | 'declined';

export interface OutreachBatch {
  id: string;
  status: string;
  visitor_count: number;
  prospect_count: number;
  notes: string | null;
  progress: Record<string, unknown> | null;
  created_at: string;
  completed_at: string | null;
}

export interface OutreachProspect {
  id: string;
  batch_id: string;
  apollo_person_id: string | null;
  name: string;
  title: string | null;
  company: string;
  email: string | null;
  linkedin_url: string | null;
  signal: string | null;
  company_size: string | null;
  company_industry: string | null;
  company_description: string | null;
  recent_news: string | null;
  confidence_score: number | null;
  contacted_at: string | null;
  contact_notes: string | null;
  status: OutreachProspectStatus;
  created_at: string;
  updated_at: string;
}
