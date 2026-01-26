// ============================================
// NAGER.DATE API - PUBLIC HOLIDAYS
// https://date.nager.at/swagger/index.html
// ============================================

const NAGER_DATE_BASE_URL = 'https://date.nager.at/api/v3';

interface NagerDateHoliday {
  date: string;
  localName: string;
  name: string;
  countryCode: string;
  fixed: boolean;
  global: boolean;
  counties: string[] | null;
  launchYear: number | null;
  types: string[];
}

export interface PublicHoliday {
  date: string;
  name: string;
  localName: string;
  countryCode: string;
  isGlobal: boolean;
  types: string[];
}

/**
 * Fetches public holidays for a specific country and year
 * @param year The year to fetch holidays for
 * @param countryCode ISO 3166-1 alpha-2 country code (e.g., 'ES' for Spain)
 */
export async function fetchPublicHolidays(
  year: number,
  countryCode: string = 'ES'
): Promise<PublicHoliday[]> {
  const response = await fetch(
    `${NAGER_DATE_BASE_URL}/PublicHolidays/${year}/${countryCode}`
  );

  if (!response.ok) {
    if (response.status === 404) {
      return []; // No holidays found for this country/year
    }
    throw new Error(`Nager.Date API error: ${response.status}`);
  }

  const data: NagerDateHoliday[] = await response.json();

  return data.map(holiday => ({
    date: holiday.date,
    name: holiday.name,
    localName: holiday.localName,
    countryCode: holiday.countryCode,
    isGlobal: holiday.global,
    types: holiday.types,
  }));
}

/**
 * Fetches holidays for a date range (handles year transitions)
 */
export async function fetchHolidaysInRange(
  startDate: Date,
  endDate: Date,
  countryCode: string = 'ES'
): Promise<PublicHoliday[]> {
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();

  const years = Array.from(
    { length: endYear - startYear + 1 },
    (_, i) => startYear + i
  );

  const holidayPromises = years.map(year => fetchPublicHolidays(year, countryCode));
  const holidaysByYear = await Promise.all(holidayPromises);

  const allHolidays = holidaysByYear.flat();

  // Filter to date range
  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];

  return allHolidays.filter(
    h => h.date >= startStr && h.date <= endStr
  );
}

/**
 * Check if a specific date is a public holiday
 */
export async function isPublicHoliday(
  date: Date,
  countryCode: string = 'ES'
): Promise<boolean> {
  const year = date.getFullYear();
  const holidays = await fetchPublicHolidays(year, countryCode);
  const dateStr = date.toISOString().split('T')[0];

  return holidays.some(h => h.date === dateStr);
}

/**
 * Gets available countries from Nager.Date API
 */
export async function fetchAvailableCountries(): Promise<{ countryCode: string; name: string }[]> {
  const response = await fetch(`${NAGER_DATE_BASE_URL}/AvailableCountries`);

  if (!response.ok) {
    throw new Error(`Nager.Date API error: ${response.status}`);
  }

  return response.json();
}
