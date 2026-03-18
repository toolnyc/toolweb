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
  perPage: number = 10,
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
      per_page: perPage,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Apollo search error ${response.status}: ${err}`);
  }

  const data = await response.json() as { people?: ApolloPerson[] };
  return data.people ?? [];
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
