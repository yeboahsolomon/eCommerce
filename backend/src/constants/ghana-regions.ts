/**
 * Ghana Regions — Single Source of Truth
 *
 * Contains: canonical region list, geographic zone distance matrix,
 * major city lookups, and region alias normalisation.
 *
 * The zone matrix is modelled after Jumia Ghana's logistics model:
 *   Zone 1 – Same city                         (cheapest)
 *   Zone 2 – Same region, different city
 *   Zone 3 – Adjacent / neighbouring region
 *   Zone 4 – Moderate distance region
 *   Zone 5 – Long-distance / remote region     (most expensive)
 *
 * Geographic distances are based on road distances between
 * regional capitals and Ghana's administrative map.
 */

// ━━━━━━━━━━━━━━━━━━━━━━ Canonical Region List ━━━━━━━━━━━━━━━━━━━━━━

export const GHANA_REGIONS = [
  'Greater Accra',
  'Ashanti',
  'Western',
  'Central',
  'Eastern',
  'Northern',
  'Volta',
  'Bono',
  'Ahafo',
  'Upper East',
  'Upper West',
  'Savannah',
  'North East',
  'Bono East',
  'Oti',
  'Western North',
] as const;

export type GhanaRegion = (typeof GHANA_REGIONS)[number];

// ━━━━━━━━━━━━━━━━━━━━━━ Region Alias Map (Legacy Data) ━━━━━━━━━━━━━━━━━━━━━━

/**
 * Maps abolished / misspelled region names to their canonical form.
 * "Brong-Ahafo" was split into "Bono", "Bono East", and "Ahafo" in 2019.
 * We map it to "Bono" as the primary successor.
 */
const REGION_ALIASES: Record<string, GhanaRegion> = {
  'brong-ahafo': 'Bono',
  'brong ahafo': 'Bono',
  'western north region': 'Western North',
  'north east region': 'North East',
  'bono east region': 'Bono East',
  'upper east region': 'Upper East',
  'upper west region': 'Upper West',
  'greater accra region': 'Greater Accra',
  'ashanti region': 'Ashanti',
  'northern region': 'Northern',
  'volta region': 'Volta',
  'central region': 'Central',
  'eastern region': 'Eastern',
  'western region': 'Western',
  'savannah region': 'Savannah',
  'oti region': 'Oti',
  'ahafo region': 'Ahafo',
  'bono region': 'Bono',
};

/**
 * Normalise and resolve a region string to its canonical name.
 * Handles legacy data ("Brong-Ahafo"), extra whitespace, case differences,
 * and "Region" suffixes (e.g. "Greater Accra Region" → "Greater Accra").
 *
 * Returns the canonical string, or the cleaned input if no alias match is found.
 */
export function normalizeRegion(raw: string | null | undefined): string {
  if (!raw) return '';
  const cleaned = raw.trim().replace(/\s+/g, ' ');
  const lower = cleaned.toLowerCase();

  // Direct alias match
  if (REGION_ALIASES[lower]) return REGION_ALIASES[lower];

  // Try matching canonical names (case-insensitive)
  const canonical = GHANA_REGIONS.find((r) => r.toLowerCase() === lower);
  if (canonical) return canonical;

  // Fallback: return the cleaned string as-is
  return cleaned;
}

// ━━━━━━━━━━━━━━━━━━━━━━ Zone Distance Matrix ━━━━━━━━━━━━━━━━━━━━━━

/**
 * Zone assignments between every pair of Ghana's 16 regions.
 * Zones 3-5 are based on actual road distances between regional capitals:
 *
 *   Zone 3 – Adjacent regions (typically < 150 km apart)
 *   Zone 4 – Moderate distance  (typically 150–400 km)
 *   Zone 5 – Long distance      (typically > 400 km)
 *
 * The matrix is symmetric: zone(A→B) === zone(B→A).
 * Same-region comparisons are handled separately (Zone 1 or 2).
 */
type ZoneMatrixType = Record<string, Record<string, number>>;

export const ZONE_MATRIX: ZoneMatrixType = {
  'Greater Accra': {
    'Greater Accra': 2, // same region fallback
    'Ashanti':       4,
    'Western':       4,
    'Central':       3,
    'Eastern':       3,
    'Northern':      5,
    'Volta':         3,
    'Bono':          4,
    'Ahafo':         4,
    'Upper East':    5,
    'Upper West':    5,
    'Savannah':      5,
    'North East':    5,
    'Bono East':     4,
    'Oti':           4,
    'Western North': 4,
  },
  'Ashanti': {
    'Greater Accra': 4,
    'Ashanti':       2,
    'Western':       3,
    'Central':       3,
    'Eastern':       3,
    'Northern':      4,
    'Volta':         4,
    'Bono':          3,
    'Ahafo':         3,
    'Upper East':    5,
    'Upper West':    5,
    'Savannah':      4,
    'North East':    5,
    'Bono East':     3,
    'Oti':           4,
    'Western North': 3,
  },
  'Western': {
    'Greater Accra': 4,
    'Ashanti':       3,
    'Western':       2,
    'Central':       3,
    'Eastern':       4,
    'Northern':      5,
    'Volta':         5,
    'Bono':          4,
    'Ahafo':         4,
    'Upper East':    5,
    'Upper West':    5,
    'Savannah':      5,
    'North East':    5,
    'Bono East':     4,
    'Oti':           5,
    'Western North': 3,
  },
  'Central': {
    'Greater Accra': 3,
    'Ashanti':       3,
    'Western':       3,
    'Central':       2,
    'Eastern':       3,
    'Northern':      5,
    'Volta':         4,
    'Bono':          4,
    'Ahafo':         4,
    'Upper East':    5,
    'Upper West':    5,
    'Savannah':      5,
    'North East':    5,
    'Bono East':     4,
    'Oti':           4,
    'Western North': 4,
  },
  'Eastern': {
    'Greater Accra': 3,
    'Ashanti':       3,
    'Western':       4,
    'Central':       3,
    'Eastern':       2,
    'Northern':      5,
    'Volta':         3,
    'Bono':          4,
    'Ahafo':         4,
    'Upper East':    5,
    'Upper West':    5,
    'Savannah':      5,
    'North East':    5,
    'Bono East':     4,
    'Oti':           3,
    'Western North': 4,
  },
  'Northern': {
    'Greater Accra': 5,
    'Ashanti':       4,
    'Western':       5,
    'Central':       5,
    'Eastern':       5,
    'Northern':      2,
    'Volta':         4,
    'Bono':          4,
    'Ahafo':         4,
    'Upper East':    3,
    'Upper West':    3,
    'Savannah':      3,
    'North East':    3,
    'Bono East':     3,
    'Oti':           3,
    'Western North': 5,
  },
  'Volta': {
    'Greater Accra': 3,
    'Ashanti':       4,
    'Western':       5,
    'Central':       4,
    'Eastern':       3,
    'Northern':      4,
    'Volta':         2,
    'Bono':          4,
    'Ahafo':         4,
    'Upper East':    5,
    'Upper West':    5,
    'Savannah':      4,
    'North East':    5,
    'Bono East':     4,
    'Oti':           3,
    'Western North': 5,
  },
  'Bono': {
    'Greater Accra': 4,
    'Ashanti':       3,
    'Western':       4,
    'Central':       4,
    'Eastern':       4,
    'Northern':      4,
    'Volta':         4,
    'Bono':          2,
    'Ahafo':         3,
    'Upper East':    4,
    'Upper West':    4,
    'Savannah':      3,
    'North East':    4,
    'Bono East':     3,
    'Oti':           4,
    'Western North': 3,
  },
  'Ahafo': {
    'Greater Accra': 4,
    'Ashanti':       3,
    'Western':       4,
    'Central':       4,
    'Eastern':       4,
    'Northern':      4,
    'Volta':         4,
    'Ahafo':         2,
    'Bono':          3,
    'Upper East':    5,
    'Upper West':    4,
    'Savannah':      4,
    'North East':    5,
    'Bono East':     3,
    'Oti':           4,
    'Western North': 3,
  },
  'Upper East': {
    'Greater Accra': 5,
    'Ashanti':       5,
    'Western':       5,
    'Central':       5,
    'Eastern':       5,
    'Northern':      3,
    'Volta':         5,
    'Bono':          4,
    'Ahafo':         5,
    'Upper East':    2,
    'Upper West':    3,
    'Savannah':      3,
    'North East':    3,
    'Bono East':     4,
    'Oti':           4,
    'Western North': 5,
  },
  'Upper West': {
    'Greater Accra': 5,
    'Ashanti':       5,
    'Western':       5,
    'Central':       5,
    'Eastern':       5,
    'Northern':      3,
    'Volta':         5,
    'Bono':          4,
    'Ahafo':         4,
    'Upper East':    3,
    'Upper West':    2,
    'Savannah':      3,
    'North East':    3,
    'Bono East':     4,
    'Oti':           5,
    'Western North': 5,
  },
  'Savannah': {
    'Greater Accra': 5,
    'Ashanti':       4,
    'Western':       5,
    'Central':       5,
    'Eastern':       5,
    'Northern':      3,
    'Volta':         4,
    'Bono':          3,
    'Ahafo':         4,
    'Upper East':    3,
    'Upper West':    3,
    'Savannah':      2,
    'North East':    3,
    'Bono East':     3,
    'Oti':           4,
    'Western North': 5,
  },
  'North East': {
    'Greater Accra': 5,
    'Ashanti':       5,
    'Western':       5,
    'Central':       5,
    'Eastern':       5,
    'Northern':      3,
    'Volta':         5,
    'Bono':          4,
    'Ahafo':         5,
    'Upper East':    3,
    'Upper West':    3,
    'Savannah':      3,
    'North East':    2,
    'Bono East':     4,
    'Oti':           4,
    'Western North': 5,
  },
  'Bono East': {
    'Greater Accra': 4,
    'Ashanti':       3,
    'Western':       4,
    'Central':       4,
    'Eastern':       4,
    'Northern':      3,
    'Volta':         4,
    'Bono':          3,
    'Ahafo':         3,
    'Upper East':    4,
    'Upper West':    4,
    'Savannah':      3,
    'North East':    4,
    'Bono East':     2,
    'Oti':           4,
    'Western North': 3,
  },
  'Oti': {
    'Greater Accra': 4,
    'Ashanti':       4,
    'Western':       5,
    'Central':       4,
    'Eastern':       3,
    'Northern':      3,
    'Volta':         3,
    'Bono':          4,
    'Ahafo':         4,
    'Upper East':    4,
    'Upper West':    5,
    'Savannah':      4,
    'North East':    4,
    'Bono East':     4,
    'Oti':           2,
    'Western North': 5,
  },
  'Western North': {
    'Greater Accra': 4,
    'Ashanti':       3,
    'Western':       3,
    'Central':       4,
    'Eastern':       4,
    'Northern':      5,
    'Volta':         5,
    'Bono':          3,
    'Ahafo':         3,
    'Upper East':    5,
    'Upper West':    5,
    'Savannah':      5,
    'North East':    5,
    'Bono East':     3,
    'Oti':           5,
    'Western North': 2,
  },
};

/**
 * Look up the cross-region zone between two normalised region names.
 * Returns the numeric zone (3–5), or 5 if either region isn't recognised.
 */
export function getRegionZone(regionA: string, regionB: string): number {
  const normA = normalizeRegion(regionA);
  const normB = normalizeRegion(regionB);

  if (!normA || !normB) return 5; // Unknown → highest zone

  const row = ZONE_MATRIX[normA];
  if (!row) return 5;

  return row[normB] ?? 5;
}

// ━━━━━━━━━━━━━━━━━━━━━━ Major Cities per Region ━━━━━━━━━━━━━━━━━━━━━━

/**
 * Major cities/towns within each region.
 * Used for smarter same-city matching (e.g. "tema" matches to "Greater Accra").
 * All values are lowercase for comparison.
 */
export const REGION_CITIES: Record<string, string[]> = {
  'Greater Accra': ['accra', 'tema', 'madina', 'ashaiman', 'kasoa', 'teshie', 'nungua', 'dansoman', 'east legon', 'spintex', 'adenta', 'dome', 'achimota', 'cantonments', 'osu', 'labone', 'labadi', 'weija'],
  'Ashanti': ['kumasi', 'obuasi', 'ejisu', 'konongo', 'mampong', 'bekwai', 'offinso', 'asokwa', 'tafo', 'suame', 'adum', 'bantama', 'nhyiaeso'],
  'Western': ['takoradi', 'sekondi', 'tarkwa', 'axim', 'prestea', 'bogoso', 'agona nkwanta'],
  'Central': ['cape coast', 'winneba', 'mankessim', 'saltpond', 'elmina', 'kasoa', 'agona swedru', 'dunkwa-on-offin'],
  'Eastern': ['koforidua', 'nkawkaw', 'nsawam', 'suhum', 'akosombo', 'akim oda', 'kade', 'begoro', 'aburi'],
  'Northern': ['tamale', 'yendi', 'savelugu', 'kumbungu', 'tolon', 'sagnarigu'],
  'Volta': ['ho', 'hohoe', 'keta', 'kpando', 'aflao', 'akatsi', 'sogakope', 'anloga'],
  'Bono': ['sunyani', 'berekum', 'dormaa ahenkro', 'sampa', 'wenchi'],
  'Ahafo': ['goaso', 'bechem', 'duayaw nkwanta', 'kenyasi', 'hwidiem'],
  'Upper East': ['bolgatanga', 'navrongo', 'bawku', 'zebilla', 'paga', 'zuarungu'],
  'Upper West': ['wa', 'tumu', 'lawra', 'nandom', 'jirapa', 'nadowli'],
  'Savannah': ['damongo', 'salaga', 'bole', 'sawla', 'tolon'],
  'North East': ['nalerigu', 'gambaga', 'walewale', 'langbinsi'],
  'Bono East': ['techiman', 'kintampo', 'nkoranza', 'atebubu', 'yeji', 'ejura'],
  'Oti': ['dambai', 'jasikan', 'kadjebi', 'nkwanta', 'krachi'],
  'Western North': ['sefwi wiawso', 'bibiani', 'enchi', 'juaboso', 'akontombra'],
};

/**
 * Attempt to identify the region from a city name.
 * Returns the canonical region name, or null if not found.
 */
export function findRegionByCity(city: string | null | undefined): string | null {
  if (!city) return null;
  const lower = city.toLowerCase().trim();

  for (const [region, cities] of Object.entries(REGION_CITIES)) {
    if (cities.includes(lower)) return region;
  }
  return null;
}

// ━━━━━━━━━━━━━━━━━━━━━━ Zone Descriptions ━━━━━━━━━━━━━━━━━━━━━━

export const ZONE_LABELS: Record<number, string> = {
  1: 'Same City',
  2: 'Same Region',
  3: 'Nearby Region',
  4: 'Inter-Region',
  5: 'Long Distance',
};

export const ZONE_DELIVERY_DAYS: Record<number, string> = {
  1: '1–2 business days',
  2: '2–3 business days',
  3: '3–5 business days',
  4: '5–7 business days',
  5: '7–10 business days',
};
