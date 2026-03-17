const APOLLO_BASE = 'https://api.apollo.io/api/v1';

export interface ApolloOrganization {
  name: string;
  industry: string | null;
  estimated_num_employees: number | null;
  short_description: string | null;
}

export interface ApolloPerson {
  id: string;
  name: string;
  title: string | null;
  email: string | null;
  linkedin_url: string | null;
  organization: ApolloOrganization | null;
}

/**
 * Search for people at a company matching given titles.
 * Free on Apollo — no credits consumed.
 */
export async function searchPeopleAtCompany(
  apiKey: string,
  companyName: string,
  targetTitles: string[],
): Promise<ApolloPerson[]> {
  const response = await fetch(`${APOLLO_BASE}/mixed_people/search`, {
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

  const data = await response.json() as { people?: ApolloPerson[] };
  return data.people ?? [];
}

export interface IcpFilters {
  titles: string[];
  /** Apollo employee range strings, e.g. ["1,50", "51,200"] */
  employeeRanges: string[];
  /** City/state/country strings Apollo understands, e.g. ["New York, New York, United States"] */
  locations: string[];
  page?: number;
  perPage?: number;
}

/**
 * Discover people matching an ICP profile without specifying a company.
 * Uses the same mixed_people/search endpoint — free, no credits.
 */
export async function discoverByIcp(
  apiKey: string,
  filters: IcpFilters,
): Promise<{ people: ApolloPerson[]; total: number }> {
  const response = await fetch(`${APOLLO_BASE}/mixed_people/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      person_titles: filters.titles,
      organization_num_employees_ranges: filters.employeeRanges,
      person_locations: filters.locations,
      page: filters.page ?? 1,
      per_page: filters.perPage ?? 25,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Apollo ICP search error ${response.status}: ${err}`);
  }

  const data = await response.json() as {
    people?: ApolloPerson[];
    pagination?: { total_entries?: number };
  };

  return {
    people: data.people ?? [],
    total: data.pagination?.total_entries ?? 0,
  };
}

/**
 * Enrich a person by Apollo ID to get verified email and fuller profile.
 * Costs credits — only call for high-confidence prospects.
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
