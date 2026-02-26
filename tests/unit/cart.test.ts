import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getCart,
  addToCart,
  removeFromCart,
  updateQuantity,
  getCartCount,
  getCartSubtotal,
  clearCart,
  CART_STORAGE_KEY,
  type CartItem,
} from '../../src/lib/cart';

// In-memory localStorage mock
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete store[key];
  }),
  clear: vi.fn(() => {
    for (const key of Object.keys(store)) delete store[key];
  }),
  get length() {
    return Object.keys(store).length;
  },
  key: vi.fn((_index: number) => null),
};

// Attach to globalThis so `typeof window !== 'undefined'` and `localStorage` both work
Object.defineProperty(globalThis, 'window', { value: globalThis, writable: true });
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

function makeItem(overrides: Partial<Omit<CartItem, 'quantity'>> = {}): Omit<CartItem, 'quantity'> {
  return {
    variantId: 'v1',
    productId: 'p1',
    productName: 'Test Product',
    variantLabel: 'Default',
    price: 25,
    imageUrl: null,
    ...overrides,
  };
}

describe('cart', () => {
  beforeEach(() => {
    // Clear the in-memory store between tests
    for (const key of Object.keys(store)) delete store[key];
    vi.clearAllMocks();
  });

  it('getCart() returns empty array initially', () => {
    expect(getCart()).toEqual([]);
  });

  it('addToCart() adds an item to the cart', () => {
    addToCart(makeItem());
    const cart = getCart();
    expect(cart).toHaveLength(1);
    expect(cart[0].variantId).toBe('v1');
    expect(cart[0].quantity).toBe(1);
  });

  it('addToCart() with same variantId increases quantity', () => {
    addToCart(makeItem());
    addToCart(makeItem());
    const cart = getCart();
    expect(cart).toHaveLength(1);
    expect(cart[0].quantity).toBe(2);
  });

  it('removeFromCart() removes the item', () => {
    addToCart(makeItem());
    removeFromCart('v1');
    expect(getCart()).toEqual([]);
  });

  it('updateQuantity() changes quantity', () => {
    addToCart(makeItem());
    updateQuantity('v1', 5);
    const cart = getCart();
    expect(cart[0].quantity).toBe(5);
  });

  it('updateQuantity(id, 0) removes the item', () => {
    addToCart(makeItem());
    updateQuantity('v1', 0);
    expect(getCart()).toEqual([]);
  });

  it('getCartCount() returns total item count', () => {
    addToCart(makeItem({ variantId: 'v1' }), 2);
    addToCart(makeItem({ variantId: 'v2' }), 3);
    expect(getCartCount()).toBe(5);
  });

  it('getCartSubtotal() returns correct total', () => {
    addToCart(makeItem({ variantId: 'v1', price: 10 }), 2);
    addToCart(makeItem({ variantId: 'v2', price: 25 }), 1);
    // 10*2 + 25*1 = 45
    expect(getCartSubtotal()).toBe(45);
  });

  it('clearCart() empties the cart', () => {
    addToCart(makeItem({ variantId: 'v1' }));
    addToCart(makeItem({ variantId: 'v2' }));
    clearCart();
    expect(getCart()).toEqual([]);
  });
});
