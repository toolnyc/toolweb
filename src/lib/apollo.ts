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

/**
 * Search for people at a company matching given titles.
 * Returns lightweight search results — enrich to get full data.
 */
export async function searchPeopleAtCompany(
  apiKey: string,
  companyName: string,
  targetTitles: string[],
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
      per_page: 10,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Apollo search error ${response.status}: ${err}`);
  }

  const data = await response.json() as { people?: ApolloSearchResult[] };
  return data.people ?? [];
}

export interface IcpFilters {
  titles: string[];
  /** Apollo employee range strings, e.g. ["1,50", "51,200"] */
  employeeRanges: string[];
  /** City/state/country strings Apollo understands — omit if unsure of exact format */
  locations: string[];
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
      organization_num_employees_ranges: filters.employeeRanges,
      // Only send person_locations if non-empty — empty array can match nothing
      ...(filters.locations.length > 0 && { person_locations: filters.locations }),
      page: filters.page ?? 1,
      per_page: filters.perPage ?? 25,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Apollo ICP search error ${response.status}: ${err}`);
  }

  const data = await response.json() as {
    people?: ApolloSearchResult[];
    total_entries?: number;
  };

  return {
    people: data.people ?? [],
    total: data.total_entries ?? 0,
  };
}

/**
 * Enrich a person by Apollo ID to get full name, email, LinkedIn, and org data.
 * Uses export credits — only call for candidates worth pursuing.
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

  if (!response.ok) return null;

  const data = await response.json() as { person?: ApolloPerson };
  return data.person ?? null;
}
