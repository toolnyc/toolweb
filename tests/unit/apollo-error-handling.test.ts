import { describe, it, expect, vi, afterEach } from 'vitest';
import { discoverByIcp, enrichPerson, searchPeopleAtCompany } from '../../src/lib/apollo';

// Helper to mock a single fetch call
function mockFetch(body: unknown, status = 200) {
  return vi.fn().mockResolvedValueOnce(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('discoverByIcp', () => {
  it('returns people when Apollo responds with valid data', async () => {
    vi.stubGlobal('fetch', mockFetch({
      people: [
        { id: 'p1', first_name: 'Alice', title: 'Creative Director', has_email: true, organization: { name: 'Acme' } },
      ],
      total_entries: 1,
    }));

    const result = await discoverByIcp('test-key', {
      titles: ['Creative Director'],
      employeeRanges: ['10,50'],
      locations: [],
    });

    expect(result.people).toHaveLength(1);
    expect(result.people[0].id).toBe('p1');
    expect(result.total).toBe(1);
  });

  it('throws when Apollo returns HTTP 200 with an error body (rate limit / credits)', async () => {
    vi.stubGlobal('fetch', mockFetch({ error: 'rate_limit_exceeded', people: [] }));

    await expect(
      discoverByIcp('test-key', { titles: [], employeeRanges: [], locations: [] }),
    ).rejects.toThrow('Apollo ICP search error: rate_limit_exceeded');
  });

  it('throws when Apollo returns HTTP 200 with a generic error body', async () => {
    vi.stubGlobal('fetch', mockFetch({ error: 'invalid_api_key' }));

    await expect(
      discoverByIcp('test-key', { titles: [], employeeRanges: [], locations: [] }),
    ).rejects.toThrow('invalid_api_key');
  });

  it('throws when Apollo returns a non-200 status', async () => {
    vi.stubGlobal('fetch', mockFetch({ message: 'Unauthorized' }, 401));

    await expect(
      discoverByIcp('test-key', { titles: [], employeeRanges: [], locations: [] }),
    ).rejects.toThrow('Apollo ICP search error 401');
  });

  it('returns empty people array when Apollo returns 200 with empty list', async () => {
    vi.stubGlobal('fetch', mockFetch({ people: [], total_entries: 0 }));

    const result = await discoverByIcp('test-key', { titles: [], employeeRanges: [], locations: [] });
    expect(result.people).toHaveLength(0);
    expect(result.total).toBe(0);
  });
});

describe('enrichPerson', () => {
  it('returns a person when Apollo enrichment succeeds', async () => {
    vi.stubGlobal('fetch', mockFetch({
      person: {
        id: 'p1',
        name: 'Alice Testworth',
        title: 'Creative Director',
        email: 'alice@acme.com',
        linkedin_url: 'https://linkedin.com/in/alice',
        organization: { name: 'Acme', industry: 'Design', estimated_num_employees: 25, short_description: 'A studio' },
      },
    }));

    const person = await enrichPerson('test-key', 'p1');
    expect(person).not.toBeNull();
    expect(person!.email).toBe('alice@acme.com');
    expect(person!.name).toBe('Alice Testworth');
  });

  it('returns null when Apollo returns HTTP 200 with error body (credits exhausted)', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('fetch', mockFetch({ error: 'credits_exhausted', person: null }));

    const person = await enrichPerson('test-key', 'p1');
    expect(person).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('credits_exhausted'));
  });

  it('returns null when Apollo returns HTTP 200 with rate limit error', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('fetch', mockFetch({ error: 'rate_limit_exceeded', person: null }));

    const person = await enrichPerson('test-key', 'p1');
    expect(person).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('rate_limit_exceeded'));
  });

  it('returns null when Apollo returns a non-200 status', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('fetch', mockFetch({ error: 'server error' }, 500));

    const person = await enrichPerson('test-key', 'p1');
    expect(person).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('HTTP 500'));
  });

  it('returns null when Apollo returns 200 but person is missing', async () => {
    vi.stubGlobal('fetch', mockFetch({ person: null }));

    const person = await enrichPerson('test-key', 'missing-id');
    expect(person).toBeNull();
  });
});

describe('searchPeopleAtCompany', () => {
  it('returns people array on success', async () => {
    vi.stubGlobal('fetch', mockFetch({
      people: [
        { id: 'p2', first_name: 'Bob', title: 'CMO', has_email: true, organization: { name: 'BigCo' } },
      ],
    }));

    const results = await searchPeopleAtCompany('test-key', 'BigCo', ['CMO']);
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('CMO');
  });

  it('throws when Apollo returns 200 with error body', async () => {
    vi.stubGlobal('fetch', mockFetch({ error: 'quota_exceeded', people: [] }));

    await expect(
      searchPeopleAtCompany('test-key', 'BigCo', ['CMO']),
    ).rejects.toThrow('quota_exceeded');
  });
});
