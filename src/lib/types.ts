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
