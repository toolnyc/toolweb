import { getSupabase } from './env';
import { logError } from './logger';
import type {
  PortfolioItem,
  CaseStudyImage,
  Testimonial,
  WritingSnippet,
  ClientLogo,
  Product,
  ProductVariant,
  SiteContent,
} from './types';

// -- Feature flags --

export async function getFeatureFlag(key: string): Promise<boolean> {
  const { data, error } = await getSupabase()
    .from('feature_flags')
    .select('enabled')
    .eq('flag_key', key)
    .single();

  if (error || !data) return false;
  return data.enabled;
}

// -- Public queries (anon client, respects RLS) --

export async function getPublishedPortfolio(): Promise<PortfolioItem[]> {
  const { data, error } = await getSupabase()
    .from('portfolio_items')
    .select('*')
    .eq('status', 'published')
    .order('sort_order');

  if (error) {
    logError('warn', 'Error fetching portfolio', { error });
    return [];
  }
  return data ?? [];
}

export async function getPublishedWriting(): Promise<WritingSnippet[]> {
  const { data, error } = await getSupabase()
    .from('writing_snippets')
    .select('*')
    .eq('status', 'published')
    .order('sort_order');

  if (error) {
    logError('warn', 'Error fetching writing', { error });
    return [];
  }
  return data ?? [];
}

export async function getVisibleClientLogos(): Promise<ClientLogo[]> {
  const { data, error } = await getSupabase()
    .from('client_logos')
    .select('*')
    .eq('is_visible', true)
    .order('sort_order');

  if (error) {
    logError('warn', 'Error fetching client logos', { error });
    return [];
  }
  return data ?? [];
}

export async function getActiveProducts(): Promise<(Product & { variants: ProductVariant[] })[]> {
  const { data, error } = await getSupabase()
    .from('products')
    .select('*, variants:product_variants(*)')
    .in('status', ['active', 'upcoming'])
    .order('created_at', { ascending: false });

  if (error) {
    logError('warn', 'Error fetching products', { error });
    return [];
  }
  return (data ?? []) as (Product & { variants: ProductVariant[] })[];
}

export async function getProductById(id: string): Promise<(Product & { variants: ProductVariant[] }) | null> {
  const { data, error } = await getSupabase()
    .from('products')
    .select('*, variants:product_variants(*)')
    .eq('id', id)
    .single();

  if (error) {
    logError('warn', 'Error fetching product', { error });
    return null;
  }
  return data as Product & { variants: ProductVariant[] };
}

export async function getSiteContent(group?: string): Promise<SiteContent[]> {
  let query = getSupabase().from('site_content').select('*').order('sort_order');
  if (group) query = query.eq('content_group', group);

  const { data, error } = await query;
  if (error) {
    logError('warn', 'Error fetching site content', { error });
    return [];
  }
  return data ?? [];
}

export async function getSiteContentByKey(key: string): Promise<SiteContent | null> {
  const { data, error } = await getSupabase()
    .from('site_content')
    .select('*')
    .eq('content_key', key)
    .single();

  if (error) return null;
  return data as SiteContent;
}

// -- Case study queries --

export async function getCaseStudyBySlug(slug: string): Promise<(PortfolioItem & { images: CaseStudyImage[] }) | null> {
  const { data, error } = await getSupabase()
    .from('portfolio_items')
    .select('*, images:case_study_images(*)')
    .eq('slug', slug)
    .eq('is_case_study', true)
    .eq('status', 'published')
    .single();

  if (error) {
    logError('warn', 'Error fetching case study by slug', { slug, error: error.message, code: error.code, details: error.details });
    return null;
  }
  if (!data) {
    logError('warn', 'No case study found for slug', { slug });
    return null;
  }

  const item = data as PortfolioItem & { images: CaseStudyImage[] };
  item.images = (item.images ?? []).sort((a, b) => a.sort_order - b.sort_order);
  return item;
}

export async function getPublishedCaseStudies(): Promise<PortfolioItem[]> {
  const { data, error } = await getSupabase()
    .from('portfolio_items')
    .select('*')
    .eq('is_case_study', true)
    .eq('status', 'published')
    .order('sort_order');

  if (error) {
    logError('warn', 'Error fetching case studies', { error });
    return [];
  }
  return data ?? [];
}

export async function getVisibleTestimonials(): Promise<Testimonial[]> {
  const { data, error } = await getSupabase()
    .from('testimonials')
    .select('*')
    .eq('is_visible', true)
    .order('sort_order');

  if (error) {
    logError('warn', 'Error fetching testimonials', { error });
    return [];
  }
  return data ?? [];
}
