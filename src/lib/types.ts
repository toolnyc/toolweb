// -- Enums --

export type PortfolioCategory = 'motion' | 'graphic' | 'web' | 'brand';
export type PortfolioMediaType = 'image' | 'video';
export type DisplaySize = 'small' | 'medium' | 'large';
export type ContentStatus = 'draft' | 'published';
export type ProductStatus = 'draft' | 'upcoming' | 'active' | 'sold_out';
export type OrderStatus = 'paid' | 'shipped' | 'delivered' | 'refunded';
export type ClientStatus = 'active' | 'inactive';
export type ProjectStatus = 'inquiry' | 'discovery' | 'proposal' | 'active' | 'review' | 'complete';
export type InquiryStatus = 'new' | 'reviewed' | 'converted' | 'declined';

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

export interface Client {
  id: string;
  name: string;
  email: string;
  company: string | null;
  auth_user_id: string | null;
  status: ClientStatus;
  created_at: string;
}

export interface Project {
  id: string;
  client_id: string;
  title: string;
  status: ProjectStatus;
  deliverables_url: string | null;
  stripe_invoice_id: string | null;
  stripe_invoice_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectInquiry {
  id: string;
  name: string;
  email: string;
  company: string | null;
  project_type: string | null;
  description: string;
  budget_range: string | null;
  timeline: string | null;
  status: InquiryStatus;
  source: string;
  ai_transcript: string | null;
  ai_extracted: Record<string, unknown> | null;
  ai_summary: string | null;
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

export interface Order {
  id: string;
  order_number: number;
  product_variant_id: string | null;
  stripe_session_id: string;
  stripe_payment_intent_id: string | null;
  customer_email: string;
  customer_name: string;
  shipping_address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  quantity: number;
  amount_paid: number;
  shipping_cost: number;
  status: OrderStatus;
  tracking_number: string | null;
  created_at: string;
}

export interface FeatureFlag {
  id: string;
  flag_key: string;
  enabled: boolean;
  description: string | null;
  updated_at: string;
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
