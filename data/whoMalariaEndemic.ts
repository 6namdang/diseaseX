/**
 * Malaria endemic countries, keyed by ISO 3166-1 alpha-2.
 *
 * Source: WHO Global Health Observatory (GHO) OData API, indicator
 * MALARIA_EST_INCIDENCE, year 2022 — any country reporting
 * NumericValue > 0 is considered currently endemic.
 *
 *   https://ghoapi.azureedge.net/api/MALARIA_EST_INCIDENCE
 *
 * Countries WHO tracked with zero transmission in 2022 are listed in
 * {@link ELIMINATED_ALPHA2} for reference only (treated as non-endemic by
 * this app). All other countries in the world are treated as non-endemic
 * by default.
 *
 * Bundled offline so endemicity can be determined without internet.
 */

export const ENDEMIC_ALPHA2: ReadonlySet<string> = new Set([
  'AF', 'AO', 'BD', 'BF', 'BI', 'BJ', 'BO', 'BR', 'BW', 'CD', 'CF', 'CG',
  'CI', 'CM', 'CO', 'CR', 'DJ', 'DO', 'EC', 'ER', 'ET', 'GA', 'GF', 'GH',
  'GM', 'GN', 'GQ', 'GT', 'GW', 'GY', 'HN', 'HT', 'ID', 'IN', 'IR', 'KE',
  'KH', 'KM', 'KP', 'KR', 'LA', 'LR', 'MG', 'ML', 'MM', 'MR', 'MW', 'MX',
  'MZ', 'NA', 'NE', 'NG', 'NI', 'NP', 'PA', 'PE', 'PG', 'PH', 'PK', 'RW',
  'SB', 'SD', 'SL', 'SN', 'SO', 'SS', 'ST', 'SZ', 'TD', 'TG', 'TH', 'TZ',
  'UG', 'VE', 'VN', 'VU', 'YE', 'ZA', 'ZM', 'ZW',
]);

/**
 * WHO-tracked countries reporting zero transmission in 2022 (certified
 * malaria-free or elimination phase). Not used for logic — kept so the
 * UI can show "WHO: eliminated" badges without fetching.
 */
export const ELIMINATED_ALPHA2: ReadonlySet<string> = new Set([
  'AE', 'AM', 'AR', 'AZ', 'BT', 'BZ', 'CN', 'CV', 'DZ', 'EG', 'IQ', 'LK',
  'MA', 'MY', 'OM', 'PY', 'SA', 'SR', 'SV', 'SY', 'TJ', 'TL', 'YT',
]);

export type EndemicityStatus =
  | 'endemic'
  | 'eliminated'
  | 'non_endemic'
  | 'unknown';

export function endemicityFor(alpha2: string | null | undefined): EndemicityStatus {
  if (!alpha2) return 'unknown';
  const code = alpha2.toUpperCase();
  if (ENDEMIC_ALPHA2.has(code)) return 'endemic';
  if (ELIMINATED_ALPHA2.has(code)) return 'eliminated';
  return 'non_endemic';
}
