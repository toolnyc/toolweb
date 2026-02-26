import { describe, it, expect, beforeEach, vi } from 'vitest';

// vi.hoisted runs before vi.mock factories, so we build everything here.
// vi is available as the first argument to the callback.
const { chain, methods, resolvedRef } = vi.hoisted(() => {
  // vi.fn is not available inside vi.hoisted, so we build simple tracking fns
  const resolvedRef = { value: { data: null as unknown, error: null as unknown } };
  const methods = ['from', 'select', 'eq', 'in', 'order', 'limit', 'single'];

  // Simple spy-like functions that record calls and return chain
  const calls: Record<string, any[][]> = {};
  const chain: Record<string, any> = {};

  for (const m of methods) {
    calls[m] = [];
    chain[m] = (...args: any[]) => {
      calls[m].push(args);
      return chain;
    };
  }

  // Thenable: when the chain is awaited, resolve with the current value
  chain.then = (resolve: (v: unknown) => void) => resolve(resolvedRef.value);

  // Store calls ref on chain for assertions
  chain._calls = calls;

  return { chain, methods, resolvedRef };
});

vi.mock('../../src/lib/supabase', () => ({
  supabase: chain,
}));

import {
  getPublishedPortfolio,
  getActiveProducts,
  getProductById,
} from '../../src/lib/queries';

/** Helper to read recorded calls for a chain method */
function callsFor(method: string): any[][] {
  return chain._calls[method] ?? [];
}

describe('queries', () => {
  beforeEach(() => {
    resolvedRef.value = { data: null, error: null };
    // Clear recorded calls
    for (const m of methods) {
      chain._calls[m] = [];
    }
  });

  describe('getPublishedPortfolio', () => {
    it('filters by status=published and orders by sort_order', async () => {
      const fakeItems = [{ id: '1', title: 'Project A' }];
      resolvedRef.value = { data: fakeItems, error: null };

      const result = await getPublishedPortfolio();

      expect(callsFor('from')).toEqual([['portfolio_items']]);
      expect(callsFor('select')).toEqual([['*']]);
      expect(callsFor('eq')).toEqual([['status', 'published']]);
      expect(callsFor('order')).toEqual([['sort_order']]);
      expect(result).toEqual(fakeItems);
    });

    it('returns empty array on error', async () => {
      resolvedRef.value = { data: null, error: { message: 'fail' } };

      const result = await getPublishedPortfolio();
      expect(result).toEqual([]);
    });
  });

  describe('getActiveProducts', () => {
    it('filters by active/upcoming status', async () => {
      const fakeProducts = [{ id: 'p1', name: 'Workshop', variants: [] }];
      resolvedRef.value = { data: fakeProducts, error: null };

      const result = await getActiveProducts();

      expect(callsFor('from')).toEqual([['products']]);
      expect(callsFor('select')).toEqual([['*, variants:product_variants(*)']]);
      expect(callsFor('in')).toEqual([['status', ['active', 'upcoming']]]);
      expect(callsFor('order')).toEqual([['created_at', { ascending: false }]]);
      expect(result).toEqual(fakeProducts);
    });
  });

  describe('getProductById', () => {
    it('fetches single product with variants', async () => {
      const fakeProduct = { id: 'p1', name: 'Workshop', variants: [{ id: 'v1' }] };
      resolvedRef.value = { data: fakeProduct, error: null };

      const result = await getProductById('p1');

      expect(callsFor('from')).toEqual([['products']]);
      expect(callsFor('select')).toEqual([['*, variants:product_variants(*)']]);
      expect(callsFor('eq')).toEqual([['id', 'p1']]);
      expect(callsFor('single').length).toBe(1);
      expect(result).toEqual(fakeProduct);
    });

    it('returns null on error', async () => {
      resolvedRef.value = { data: null, error: { message: 'not found' } };

      const result = await getProductById('missing');
      expect(result).toBeNull();
    });
  });
});
