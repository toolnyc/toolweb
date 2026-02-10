import { supabaseAdmin } from './supabase';
import type {
  PortfolioItem,
  WritingSnippet,
  ClientLogo,
  Client,
  Project,
  ProjectInquiry,
  Product,
  ProductVariant,
  Order,
  SiteContent,
  InquiryStatus,
  OrderStatus,
  ProjectStatus,
} from './types';

function admin() {
  if (!supabaseAdmin) throw new Error('supabaseAdmin not configured (missing SUPABASE_SERVICE_KEY)');
  return supabaseAdmin;
}

// -- Portfolio --

export async function createPortfolioItem(
  item: Omit<PortfolioItem, 'id' | 'created_at' | 'updated_at'>,
) {
  const { data, error } = await admin()
    .from('portfolio_items')
    .insert(item)
    .select()
    .single();
  if (error) throw error;
  return data as PortfolioItem;
}

export async function updatePortfolioItem(id: string, updates: Partial<PortfolioItem>) {
  const { data, error } = await admin()
    .from('portfolio_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as PortfolioItem;
}

export async function deletePortfolioItem(id: string) {
  const { error } = await admin().from('portfolio_items').delete().eq('id', id);
  if (error) throw error;
}

// -- Writing Snippets --

export async function createWritingSnippet(
  snippet: Omit<WritingSnippet, 'id' | 'created_at'>,
) {
  const { data, error } = await admin()
    .from('writing_snippets')
    .insert(snippet)
    .select()
    .single();
  if (error) throw error;
  return data as WritingSnippet;
}

export async function updateWritingSnippet(id: string, updates: Partial<WritingSnippet>) {
  const { data, error } = await admin()
    .from('writing_snippets')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as WritingSnippet;
}

export async function deleteWritingSnippet(id: string) {
  const { error } = await admin().from('writing_snippets').delete().eq('id', id);
  if (error) throw error;
}

// -- Client Logos --

export async function createClientLogo(
  logo: Omit<ClientLogo, 'id' | 'created_at'>,
) {
  const { data, error } = await admin()
    .from('client_logos')
    .insert(logo)
    .select()
    .single();
  if (error) throw error;
  return data as ClientLogo;
}

export async function updateClientLogo(id: string, updates: Partial<ClientLogo>) {
  const { data, error } = await admin()
    .from('client_logos')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as ClientLogo;
}

export async function deleteClientLogo(id: string) {
  const { error } = await admin().from('client_logos').delete().eq('id', id);
  if (error) throw error;
}

// -- Clients --

export async function createClient(
  client: Omit<Client, 'id' | 'created_at' | 'auth_user_id'>,
) {
  const { data, error } = await admin()
    .from('clients')
    .insert(client)
    .select()
    .single();
  if (error) throw error;
  return data as Client;
}

export async function updateClient(id: string, updates: Partial<Client>) {
  const { data, error } = await admin()
    .from('clients')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Client;
}

export async function linkClientAuthUser(clientId: string, authUserId: string) {
  return updateClient(clientId, { auth_user_id: authUserId } as Partial<Client>);
}

// -- Projects --

export async function createProject(
  project: Omit<Project, 'id' | 'created_at' | 'updated_at'>,
) {
  const { data, error } = await admin()
    .from('projects')
    .insert(project)
    .select()
    .single();
  if (error) throw error;
  return data as Project;
}

export async function updateProject(id: string, updates: Partial<Project>) {
  const { data, error } = await admin()
    .from('projects')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Project;
}

export async function updateProjectStatus(id: string, status: ProjectStatus) {
  return updateProject(id, { status });
}

// -- Inquiries --

export async function createInquiry(
  inquiry: Omit<ProjectInquiry, 'id' | 'created_at' | 'status'>,
) {
  const { data, error } = await admin()
    .from('project_inquiries')
    .insert(inquiry)
    .select()
    .single();
  if (error) throw error;
  return data as ProjectInquiry;
}

export async function updateInquiryStatus(id: string, status: InquiryStatus) {
  const { data, error } = await admin()
    .from('project_inquiries')
    .update({ status })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as ProjectInquiry;
}

// -- Products --

export async function createProduct(
  product: Omit<Product, 'id' | 'created_at'>,
) {
  const { data, error } = await admin()
    .from('products')
    .insert(product)
    .select()
    .single();
  if (error) throw error;
  return data as Product;
}

export async function updateProduct(id: string, updates: Partial<Product>) {
  const { data, error } = await admin()
    .from('products')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Product;
}

export async function deleteProduct(id: string) {
  const { error } = await admin().from('products').delete().eq('id', id);
  if (error) throw error;
}

// -- Product Variants --

export async function createProductVariant(
  variant: Omit<ProductVariant, 'id'>,
) {
  const { data, error } = await admin()
    .from('product_variants')
    .insert(variant)
    .select()
    .single();
  if (error) throw error;
  return data as ProductVariant;
}

export async function updateProductVariant(id: string, updates: Partial<ProductVariant>) {
  const { data, error } = await admin()
    .from('product_variants')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as ProductVariant;
}

export async function decrementVariantStock(id: string, quantity: number) {
  // Use RPC or manual decrement
  const { data: variant, error: fetchError } = await admin()
    .from('product_variants')
    .select('stock_count')
    .eq('id', id)
    .single();

  if (fetchError || !variant) throw fetchError || new Error('Variant not found');

  const newCount = Math.max(0, variant.stock_count - quantity);
  const { error } = await admin()
    .from('product_variants')
    .update({ stock_count: newCount })
    .eq('id', id);

  if (error) throw error;
}

export async function deleteProductVariant(id: string) {
  const { error } = await admin().from('product_variants').delete().eq('id', id);
  if (error) throw error;
}

// -- Orders --

export async function createOrder(
  order: Omit<Order, 'id' | 'order_number' | 'created_at'>,
) {
  const { data, error } = await admin()
    .from('orders')
    .insert(order)
    .select()
    .single();
  if (error) throw error;
  return data as Order;
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
  trackingNumber?: string,
) {
  const updates: Partial<Order> = { status };
  if (trackingNumber) updates.tracking_number = trackingNumber;

  const { data, error } = await admin()
    .from('orders')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Order;
}

// -- Site Content --

export async function upsertSiteContent(
  content: Omit<SiteContent, 'id' | 'updated_at'>,
) {
  const { data, error } = await admin()
    .from('site_content')
    .upsert(content, { onConflict: 'content_key' })
    .select()
    .single();
  if (error) throw error;
  return data as SiteContent;
}

export async function updateSiteContent(id: string, updates: Partial<SiteContent>) {
  const { data, error } = await admin()
    .from('site_content')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as SiteContent;
}
