import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setAuthCookies, clearAuthCookies, getAuthTokens } from '../../src/lib/cookies';

// Minimal mock matching the AstroCookies shape used by cookies.ts
function createMockCookies() {
  const jar = new Map<string, { value: string; options?: Record<string, unknown> }>();

  return {
    get(name: string) {
      const entry = jar.get(name);
      return entry ? { value: entry.value } : undefined;
    },
    set: vi.fn((name: string, value: string, options?: Record<string, unknown>) => {
      jar.set(name, { value, options });
    }),
    delete: vi.fn((name: string, _options?: Record<string, unknown>) => {
      jar.delete(name);
    }),
    // Expose jar for assertions
    _jar: jar,
  };
}

describe('cookies', () => {
  let cookies: ReturnType<typeof createMockCookies>;

  beforeEach(() => {
    cookies = createMockCookies();
  });

  it('setAuthCookies() sets both access and refresh tokens with correct options', () => {
    setAuthCookies(cookies as any, 'access-abc', 'refresh-xyz');

    expect(cookies.set).toHaveBeenCalledTimes(2);

    // Access token
    const [accessName, accessVal, accessOpts] = cookies.set.mock.calls[0];
    expect(accessName).toBe('sb-access-token');
    expect(accessVal).toBe('access-abc');
    expect(accessOpts).toMatchObject({
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 1 day
    });

    // Refresh token
    const [refreshName, refreshVal, refreshOpts] = cookies.set.mock.calls[1];
    expect(refreshName).toBe('sb-refresh-token');
    expect(refreshVal).toBe('refresh-xyz');
    expect(refreshOpts).toMatchObject({
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
  });

  it('clearAuthCookies() deletes both cookies', () => {
    // Seed cookies first
    setAuthCookies(cookies as any, 'a', 'b');
    clearAuthCookies(cookies as any);

    expect(cookies.delete).toHaveBeenCalledWith('sb-access-token', { path: '/' });
    expect(cookies.delete).toHaveBeenCalledWith('sb-refresh-token', { path: '/' });
  });

  it('getAuthTokens() retrieves tokens correctly', () => {
    setAuthCookies(cookies as any, 'tok-a', 'tok-r');
    const tokens = getAuthTokens(cookies as any);

    expect(tokens.accessToken).toBe('tok-a');
    expect(tokens.refreshToken).toBe('tok-r');
  });

  it('getAuthTokens() returns undefined when cookies do not exist', () => {
    const tokens = getAuthTokens(cookies as any);

    expect(tokens.accessToken).toBeUndefined();
    expect(tokens.refreshToken).toBeUndefined();
  });
});
