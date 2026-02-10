export const CART_STORAGE_KEY = 'tool_cart';

export interface CartItem {
  variantId: string;
  productId: string;
  productName: string;
  variantLabel: string;
  price: number; // product price in dollars
  quantity: number;
  imageUrl: string | null;
}

function saveCart(items: CartItem[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
}

export function getCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(CART_STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as CartItem[];
  } catch {
    return [];
  }
}

export function addToCart(
  item: Omit<CartItem, 'quantity'>,
  quantity: number = 1,
): void {
  const cart = getCart();
  const existing = cart.find((i) => i.variantId === item.variantId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({ ...item, quantity });
  }
  saveCart(cart);
}

export function removeFromCart(variantId: string): void {
  const cart = getCart().filter((i) => i.variantId !== variantId);
  saveCart(cart);
}

export function updateQuantity(variantId: string, quantity: number): void {
  if (quantity <= 0) {
    removeFromCart(variantId);
    return;
  }
  const cart = getCart();
  const item = cart.find((i) => i.variantId === variantId);
  if (item) {
    item.quantity = quantity;
    saveCart(cart);
  }
}

export function getCartCount(): number {
  return getCart().reduce((sum, item) => sum + item.quantity, 0);
}

export function getCartSubtotal(): number {
  return getCart().reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function clearCart(): void {
  saveCart([]);
}
