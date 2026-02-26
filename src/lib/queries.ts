import { getSupabase } from './env';
import type {
  PortfolioItem,
  WritingSnippet,
  ClientLogo,
  Product,
  ProductVariant,
  Client,
  Project,
  ProjectInquiry,
  Order,
  SiteContent,
} from './types';

// -- Public queries (anon client, respects RLS) --

export async function getPublishedPortfolio(): Promise<PortfolioItem[]> {
  const { data, error } = await getSupabase()
    .from('portfolio_items')
    .select('*')
    .eq('status', 'published')
    .order('sort_order');

  if (error) {
    console.error('Error fetching portfolio:', error);
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
    console.error('Error fetching writing:', error);
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
    console.error('Error fetching client logos:', error);
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
    console.error('Error fetching products:', error);
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
    console.error('Error fetching product:', error);
    return null;
  }
  return data as Product & { variants: ProductVariant[] };
}

export async function getSiteContent(group?: string): Promise<SiteContent[]> {
  let query = getSupabase().from('site_content').select('*').order('sort_order');
  if (group) query = query.eq('content_group', group);

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching site content:', error);
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

// -- Client portal queries (still anon client — RLS handles scoping) --

export async function getClientByAuthId(authUserId: string): Promise<Client | null> {
  const { data, error } = await getSupabase()
    .from('clients')
    .select('*')
    .eq('auth_user_id', authUserId)
    .single();

  if (error) return null;
  return data as Client;
}

export async function getProjectsByClientId(clientId: string): Promise<Project[]> {
  const { data, error } = await getSupabase()
    .from('projects')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching projects:', error);
    return [];
  }
  return data ?? [];
}

// -- Admin queries (use supabaseAdmin in the caller, these use anon for type safety) --
// Admin pages should import supabaseAdmin directly for full access

export async function getNewInquiries(): Promise<ProjectInquiry[]> {
  const { data, error } = await getSupabase()
    .from('project_inquiries')
    .select('*')
    .eq('status', 'new')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching inquiries:', error);
    return [];
  }
  return data ?? [];
}

export async function getRecentOrders(limit = 20): Promise<Order[]> {
  const { data, error } = await getSupabase()
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching orders:', error);
    return [];
  }
  return data ?? [];
}
