const APOLLO_BASE = 'https://api.apollo.io/api/v1';

export interface ApolloOrganization {
  name: string;
  industry: string | null;
  estimated_num_employees: number | null;
  short_description: string | null;
}

// Full person record returned by people/match (enrichment)
export interface ApolloPerson {
  id: string;
  name: string;
  title: string | null;
  email: string | null;
  linkedin_url: string | null;
  organization: ApolloOrganization | null;
}

// Lightweight record returned by mixed_people/api_search.
// Names are obfuscated; full data requires enrichment via people/match.
export interface ApolloSearchResult {
  id: string;
  first_name: string;
  title: string | null;
  has_email: boolean;
  organization: { name: string } | null;
}

// Apollo frequently returns HTTP 200 with an error in the body (rate limits,
// credit exhaustion, auth failures). This helper surfaces those as thrown errors.
function checkApolloBody(data: Record<string, unknown>, context: string): void {
  if (data.error) {
    throw new Error(`Apollo ${context} error: ${data.error}`);
  }
}

/**
 * Search for people at a company matching given titles.
 * Returns lightweight search results — enrich to get full data.
 */
export async function searchPeopleAtCompany(
  apiKey: string,
  companyName: string,
  targetTitles: string[],
  perPage = 10,
): Promise<ApolloSearchResult[]> {
  const response = await fetch(`${APOLLO_BASE}/mixed_people/api_search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      q_organization_name: companyName,
      person_titles: targetTitles,
      page: 1,
      per_page: perPage,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Apollo search error ${response.status}: ${err}`);
  }

  const data = await response.json() as Record<string, unknown>;
  checkApolloBody(data, 'company search');
  return (data.people as ApolloSearchResult[] | undefined) ?? [];
}

export interface IcpFilters {
  titles: string[];
  /** Apollo employee range strings, e.g. ["1,50", "51,200"] */
  employeeRanges: string[];
  /** City/state/country strings Apollo understands — omit if unsure of exact format */
  locations: string[];
  /** Industry keywords, e.g. ["technology", "marketing"] */
  industries?: string[];
  page?: number;
  perPage?: number;
}

/**
 * Discover people matching an ICP profile without specifying a company.
 * Returns lightweight search results — enrich to get full data.
 */
export async function discoverByIcp(
  apiKey: string,
  filters: IcpFilters,
): Promise<{ people: ApolloSearchResult[]; total: number }> {
  const response = await fetch(`${APOLLO_BASE}/mixed_people/api_search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      person_titles: filters.titles,
      ...(filters.employeeRanges.length > 0 && { organization_num_employees_ranges: filters.employeeRanges }),
      ...(filters.locations.length > 0 && { person_locations: filters.locations }),
      ...(filters.industries && filters.industries.length > 0 && { organization_industry_tag_ids: filters.industries }),
      page: filters.page ?? 1,
      per_page: filters.perPage ?? 25,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Apollo ICP search error ${response.status}: ${err}`);
  }

  const data = await response.json() as Record<string, unknown>;
  checkApolloBody(data, 'ICP search');

  return {
    people: (data.people as ApolloSearchResult[] | undefined) ?? [],
    total: (data.total_entries as number | undefined) ?? 0,
  };
}

/**
 * Enrich a person by Apollo ID to get full name, email, LinkedIn, and org data.
 * Uses export credits — only call for candidates worth pursuing.
 * Returns null if enrichment fails (credits exhausted, not found, etc.).
 */
export async function enrichPerson(
  apiKey: string,
  personId: string,
): Promise<ApolloPerson | null> {
  const response = await fetch(`${APOLLO_BASE}/people/match`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      id: personId,
      reveal_personal_emails: false,
      reveal_phone_number: false,
    }),
  });

  if (!response.ok) {
    console.warn(`Apollo enrichment HTTP ${response.status} for person ${personId}`);
    return null;
  }

  const data = await response.json() as Record<string, unknown>;

  // Apollo returns 200 with error bodies for credits exhaustion, rate limits, etc.
  if (data.error) {
    console.warn(`Apollo enrichment error for person ${personId}: ${data.error}`);
    return null;
  }

  return (data.person as ApolloPerson | undefined) ?? null;
}
