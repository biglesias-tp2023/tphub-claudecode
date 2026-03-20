import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { verifyCronSecret } from '../alerts/auth.js';

// ============================================
// Types
// ============================================

interface WeatherLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

interface OpenMeteoDaily {
  time: string[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  weathercode: number[];
  precipitation_probability_max?: number[];
}

interface OpenMeteoResponse {
  daily: OpenMeteoDaily;
}

interface WeatherRow {
  location_id: string;
  date: string;
  temperature_max: number;
  temperature_min: number;
  weather_code: number;
  precipitation_probability: number;
  is_forecast: boolean;
  fetched_at: string;
}

// ============================================
// Open-Meteo API helpers
// ============================================

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive';
const DAILY_VARS = 'temperature_2m_max,temperature_2m_min,weathercode,precipitation_probability_max';

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

async function fetchForecast(lat: number, lng: number, timezone: string): Promise<OpenMeteoResponse> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lng.toString(),
    daily: DAILY_VARS,
    timezone,
    forecast_days: '16',
  });
  const res = await fetch(`${FORECAST_URL}?${params}`);
  if (!res.ok) throw new Error(`Forecast API ${res.status}: ${await res.text()}`);
  return res.json();
}

async function fetchArchive(
  lat: number, lng: number, timezone: string,
  startDate: string, endDate: string
): Promise<OpenMeteoResponse> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lng.toString(),
    daily: 'temperature_2m_max,temperature_2m_min,weathercode',
    timezone,
    start_date: startDate,
    end_date: endDate,
  });
  const res = await fetch(`${ARCHIVE_URL}?${params}`);
  if (!res.ok) throw new Error(`Archive API ${res.status}: ${await res.text()}`);
  return res.json();
}

function parseDaily(
  response: OpenMeteoResponse,
  locationId: string,
  isForecast: boolean,
  now: string
): WeatherRow[] {
  const { daily } = response;
  return daily.time.map((date, i) => ({
    location_id: locationId,
    date,
    temperature_max: daily.temperature_2m_max[i],
    temperature_min: daily.temperature_2m_min[i],
    weather_code: daily.weathercode[i],
    precipitation_probability: daily.precipitation_probability_max?.[i] ?? 0,
    is_forecast: isForecast,
    fetched_at: now,
  }));
}

// ============================================
// Area mapping backfill
// ============================================

async function backfillAreaMapping(supabase: ReturnType<typeof createClient>): Promise<number> {
  // Get all business areas
  const { data: areas, error: areasErr } = await supabase
    .from('crp_portal__ct_business_area')
    .select('pk_id_business_area, des_business_area');

  if (areasErr || !areas || areas.length === 0) return 0;

  // Get all weather locations
  const { data: locations, error: locErr } = await supabase
    .from('weather_locations')
    .select('id, name');

  if (locErr || !locations || locations.length === 0) return 0;

  // Check which areas are already mapped
  const { data: existing } = await supabase
    .from('weather_area_mapping')
    .select('area_id');

  const existingIds = new Set((existing ?? []).map((r: { area_id: string }) => r.area_id));

  // Build name → location_id lookup (lowercase for fuzzy matching)
  const locationByName = new Map<string, string>();
  for (const loc of locations) {
    locationByName.set(loc.name.toLowerCase(), loc.id);
  }

  // Common city name aliases for matching
  const ALIASES: Record<string, string> = {
    'palma': 'palma de mallorca',
    'san sebastian': 'san sebastián',
    'san sebastián': 'san sebastián',
    'donostia': 'san sebastián',
    'vitoria': 'vitoria-gasteiz',
    'gasteiz': 'vitoria-gasteiz',
    'a coruña': 'a coruña',
    'la coruña': 'a coruña',
    'coruña': 'a coruña',
    'gijon': 'gijón',
    'malaga': 'málaga',
    'cadiz': 'cádiz',
    'castellon': 'castellón',
    'jaen': 'jaén',
    'leon': 'león',
    'almeria': 'almería',
    'caceres': 'cáceres',
    'logroño': 'logroño',
    'logro o': 'logroño',
    'cordoba': 'córdoba',
  };

  // Metro area suburbs → main city
  const METRO_MAPPING: Record<string, string> = {
    // Madrid metro
    'getafe': 'madrid', 'leganés': 'madrid', 'leganes': 'madrid',
    'alcobendas': 'madrid', 'alcorcón': 'madrid', 'alcorcon': 'madrid',
    'móstoles': 'madrid', 'mostoles': 'madrid', 'fuenlabrada': 'madrid',
    'parla': 'madrid', 'torrejón': 'madrid', 'torrejon': 'madrid',
    'alcalá de henares': 'madrid', 'alcala de henares': 'madrid',
    'las rozas': 'madrid', 'majadahonda': 'madrid', 'pozuelo': 'madrid',
    'rivas': 'madrid', 'coslada': 'madrid', 'san sebastián de los reyes': 'madrid',
    'tres cantos': 'madrid', 'boadilla': 'madrid', 'arganda': 'madrid',
    'collado villalba': 'madrid', 'aranjuez': 'madrid', 'valdemoro': 'madrid',
    'pinto': 'madrid',
    // Barcelona metro
    'hospitalet': 'barcelona', "l'hospitalet": 'barcelona',
    'badalona': 'barcelona', 'sabadell': 'barcelona', 'terrassa': 'barcelona',
    'mataró': 'barcelona', 'mataro': 'barcelona', 'santa coloma': 'barcelona',
    'cornellà': 'barcelona', 'cornella': 'barcelona',
    'sant cugat': 'barcelona', 'manresa': 'barcelona', 'granollers': 'barcelona',
    'rubí': 'barcelona', 'rubi': 'barcelona', 'mollet': 'barcelona',
    'viladecans': 'barcelona', 'el prat': 'barcelona', 'gavà': 'barcelona',
    'castelldefels': 'barcelona', 'sitges': 'barcelona',
    // Valencia metro
    'torrent': 'valencia', 'paterna': 'valencia', 'sagunto': 'valencia',
    'mislata': 'valencia', 'burjassot': 'valencia', 'manises': 'valencia',
    // Sevilla metro
    'dos hermanas': 'sevilla', 'alcalá de guadaíra': 'sevilla',
    // Málaga metro
    'torremolinos': 'málaga', 'benalmádena': 'málaga', 'fuengirola': 'málaga',
    'estepona': 'marbella', 'ronda': 'málaga',
    // Bilbao metro
    'barakaldo': 'bilbao', 'baracaldo': 'bilbao', 'getxo': 'bilbao',
    'portugalete': 'bilbao', 'durango': 'bilbao',
  };

  function resolveLocation(areaName: string): string | undefined {
    const lower = areaName.toLowerCase().trim();

    // Direct match
    if (locationByName.has(lower)) return locationByName.get(lower);

    // Alias match
    const alias = ALIASES[lower];
    if (alias && locationByName.has(alias)) return locationByName.get(alias);

    // Metro mapping
    const metro = METRO_MAPPING[lower];
    if (metro && locationByName.has(metro)) return locationByName.get(metro);

    // Partial match: check if area name contains or is contained by a location name
    for (const [locName, locId] of locationByName) {
      if (lower.includes(locName) || locName.includes(lower)) return locId;
    }

    return undefined;
  }

  const mappings: { area_id: string; location_id: string }[] = [];

  for (const area of areas) {
    const areaId = String(area.pk_id_business_area);
    if (existingIds.has(areaId)) continue;

    const locationId = resolveLocation(area.des_business_area);
    if (locationId) {
      mappings.push({ area_id: areaId, location_id: locationId });
    }
  }

  if (mappings.length === 0) return 0;

  const { error } = await supabase
    .from('weather_area_mapping')
    .upsert(mappings, { onConflict: 'area_id' });

  if (error) {
    console.error('Area mapping upsert error:', error.message);
    return 0;
  }

  return mappings.length;
}

// ============================================
// Main handler
// ============================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Auth: Vercel cron sends Authorization header, manual calls use ?manual=true
  const isManual = req.query.manual === 'true';
  if (!isManual && !verifyCronSecret(req.headers.authorization as string | undefined)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Missing Supabase credentials' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const now = new Date().toISOString();
  const isBackfill = req.query.backfill === 'true';

  try {
    // Backfill area mappings on every run (idempotent — skips already-mapped areas)
    const mappedCount = await backfillAreaMapping(supabase);

    // Fetch all locations
    const { data: locations, error: locError } = await supabase
      .from('weather_locations')
      .select('*');

    if (locError || !locations) {
      return res.status(500).json({ error: 'Failed to fetch locations', detail: locError?.message });
    }

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // For backfill, fetch 60 days of history
    const archiveStart = new Date(today);
    archiveStart.setDate(archiveStart.getDate() - (isBackfill ? 60 : 5));

    const results = await Promise.allSettled(
      (locations as WeatherLocation[]).map(async (loc) => {
        const rows: WeatherRow[] = [];

        // Fetch archive (yesterday or backfill range)
        try {
          const archive = await fetchArchive(
            Number(loc.latitude), Number(loc.longitude), loc.timezone,
            formatDate(archiveStart), formatDate(yesterday)
          );
          rows.push(...parseDaily(archive, loc.id, false, now));
        } catch (e) {
          console.warn(`Archive failed for ${loc.name}:`, e);
        }

        // Fetch forecast (16 days)
        try {
          const forecast = await fetchForecast(
            Number(loc.latitude), Number(loc.longitude), loc.timezone
          );
          rows.push(...parseDaily(forecast, loc.id, true, now));
        } catch (e) {
          console.warn(`Forecast failed for ${loc.name}:`, e);
        }

        if (rows.length > 0) {
          // Upsert in batches of 100
          for (let i = 0; i < rows.length; i += 100) {
            const batch = rows.slice(i, i + 100);
            const { error } = await supabase
              .from('weather_daily')
              .upsert(batch, { onConflict: 'location_id,date' });

            if (error) {
              console.error(`Upsert failed for ${loc.name} batch ${i}:`, error.message);
            }
          }
        }

        return { name: loc.name, rows: rows.length };
      })
    );

    const summary = {
      locations: locations.length,
      areaMappingsAdded: mappedCount,
      results: results.map((r, i) => ({
        location: (locations as WeatherLocation[])[i].name,
        status: r.status,
        rows: r.status === 'fulfilled' ? r.value.rows : 0,
      })),
      timestamp: now,
    };

    return res.status(200).json(summary);
  } catch (error) {
    console.error('Weather sync error:', error);
    return res.status(500).json({
      error: 'Weather sync failed',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}
