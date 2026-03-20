-- ============================================
-- Weather Data Tables
-- Stores daily weather data per city, fetched from Open-Meteo API.
-- Business areas are mapped to weather locations (~40 cities).
-- ============================================

-- Weather locations (~40 unique cities in Spain)
CREATE TABLE IF NOT EXISTS weather_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  latitude NUMERIC(8,4) NOT NULL,
  longitude NUMERIC(8,4) NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Europe/Madrid'
);

-- Daily weather time-series (~40 rows/day)
CREATE TABLE IF NOT EXISTS weather_daily (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  location_id UUID NOT NULL REFERENCES weather_locations(id),
  date DATE NOT NULL,
  temperature_max NUMERIC(4,1) NOT NULL,
  temperature_min NUMERIC(4,1) NOT NULL,
  weather_code SMALLINT NOT NULL,
  precipitation_probability SMALLINT DEFAULT 0,
  is_forecast BOOLEAN NOT NULL DEFAULT true,
  fetched_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (location_id, date)
);

CREATE INDEX IF NOT EXISTS idx_weather_daily_loc_date
  ON weather_daily (location_id, date);

-- Mapping: business_area → weather_location
CREATE TABLE IF NOT EXISTS weather_area_mapping (
  area_id TEXT PRIMARY KEY,
  location_id UUID NOT NULL REFERENCES weather_locations(id)
);

-- ============================================
-- RLS: authenticated read on all 3 tables
-- ============================================

ALTER TABLE weather_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_area_mapping ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_weather_locations"
  ON weather_locations FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_weather_daily"
  ON weather_daily FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_weather_area_mapping"
  ON weather_area_mapping FOR SELECT TO authenticated USING (true);

-- Service role needs insert/update for cron job
CREATE POLICY "service_role_all_weather_locations"
  ON weather_locations FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_weather_daily"
  ON weather_daily FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_weather_area_mapping"
  ON weather_area_mapping FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================
-- SEED: Weather Locations (Spanish cities)
-- ============================================

INSERT INTO weather_locations (name, latitude, longitude) VALUES
  ('Madrid',        40.4168, -3.7038),
  ('Barcelona',     41.3874,  2.1686),
  ('Valencia',      39.4699, -0.3763),
  ('Sevilla',       37.3891, -5.9845),
  ('Málaga',        36.7213, -4.4214),
  ('Zaragoza',      41.6488, -0.8891),
  ('Bilbao',        43.2630, -2.9350),
  ('Murcia',        37.9922, -1.1307),
  ('Palma de Mallorca', 39.5696, 2.6502),
  ('Las Palmas',    28.1235, -15.4363),
  ('Tenerife',      28.4636, -16.2518),
  ('Alicante',      38.3452, -0.4810),
  ('Córdoba',       37.8882, -4.7794),
  ('Valladolid',    41.6523, -4.7245),
  ('Vigo',          42.2406, -8.7207),
  ('Gijón',         43.5322, -5.6611),
  ('A Coruña',      43.3623, -8.4115),
  ('Granada',       37.1773, -3.5986),
  ('Vitoria-Gasteiz', 42.8469, -2.6727),
  ('Oviedo',        43.3619, -5.8494),
  ('Pamplona',      42.8125, -1.6458),
  ('San Sebastián', 43.3183, -1.9812),
  ('Santander',     43.4623, -3.8100),
  ('Castellón',     39.9864, -0.0513),
  ('Logroño',       42.4627, -2.4449),
  ('Badajoz',       38.8794, -6.9707),
  ('Albacete',      38.9942, -1.8585),
  ('Salamanca',     40.9701, -5.6635),
  ('Huelva',        37.2614, -6.9447),
  ('Lleida',        41.6176,  0.6200),
  ('Tarragona',     41.1189,  1.2445),
  ('Burgos',        42.3439, -3.6969),
  ('Jaén',          37.7796, -3.7849),
  ('Girona',        41.9794,  2.8214),
  ('Toledo',        39.8628, -4.0273),
  ('Cádiz',         36.5271, -6.2886),
  ('León',          42.5987, -5.5671),
  ('Almería',       36.8340, -2.4637),
  ('Cáceres',       39.4753, -6.3724),
  ('Marbella',      36.5099, -4.8826)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- SEED: Area → Location mapping
-- Uses area names from crp_portal__ct_business_area.
-- We map each business area to its nearest major city.
-- The area_id here is the pk_id_business_area as TEXT.
-- This will be populated via the sync endpoint on first run,
-- or manually for known areas.
-- ============================================

-- Note: The actual mapping will be populated by querying
-- crp_portal__ct_business_area and matching des_business_area
-- to the weather_locations.name. This is done in the cron job
-- on first run (backfill mode).
