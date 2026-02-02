-- ============================================
-- MIGRACIÓN: Eventos Estáticos del Calendario
-- Festivos nacionales, regionales y comerciales
--
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- ============================================
-- FESTIVOS NACIONALES ESPAÑA 2025
-- ============================================
INSERT INTO calendar_events (category, name, event_date, country_code, is_recurring, source) VALUES
('holiday', 'Año Nuevo', '2025-01-01', 'ES', true, 'static'),
('holiday', 'Reyes Magos', '2025-01-06', 'ES', true, 'static'),
('holiday', 'Viernes Santo', '2025-04-18', 'ES', false, 'static'),
('holiday', 'Día del Trabajo', '2025-05-01', 'ES', true, 'static'),
('holiday', 'Asunción de la Virgen', '2025-08-15', 'ES', true, 'static'),
('holiday', 'Fiesta Nacional de España', '2025-10-12', 'ES', true, 'static'),
('holiday', 'Todos los Santos', '2025-11-01', 'ES', true, 'static'),
('holiday', 'Día de la Constitución', '2025-12-06', 'ES', true, 'static'),
('holiday', 'Inmaculada Concepción', '2025-12-08', 'ES', true, 'static'),
('holiday', 'Navidad', '2025-12-25', 'ES', true, 'static');

-- ============================================
-- FESTIVOS NACIONALES ESPAÑA 2026
-- ============================================
INSERT INTO calendar_events (category, name, event_date, country_code, is_recurring, source) VALUES
('holiday', 'Año Nuevo', '2026-01-01', 'ES', true, 'static'),
('holiday', 'Reyes Magos', '2026-01-06', 'ES', true, 'static'),
('holiday', 'Viernes Santo', '2026-04-03', 'ES', false, 'static'),
('holiday', 'Día del Trabajo', '2026-05-01', 'ES', true, 'static'),
('holiday', 'Asunción de la Virgen', '2026-08-15', 'ES', true, 'static'),
('holiday', 'Fiesta Nacional de España', '2026-10-12', 'ES', true, 'static'),
('holiday', 'Todos los Santos', '2026-11-01', 'ES', true, 'static'),
('holiday', 'Día de la Constitución', '2026-12-06', 'ES', true, 'static'),
('holiday', 'Inmaculada Concepción', '2026-12-08', 'ES', true, 'static'),
('holiday', 'Navidad', '2026-12-25', 'ES', true, 'static');

-- ============================================
-- FESTIVOS CATALUÑA (ES-CT) 2025-2026
-- ============================================
INSERT INTO calendar_events (category, name, event_date, country_code, region_code, is_recurring, source) VALUES
('holiday', 'Sant Jordi', '2025-04-23', 'ES', 'ES-CT', true, 'static'),
('holiday', 'Sant Joan', '2025-06-24', 'ES', 'ES-CT', true, 'static'),
('holiday', 'Diada de Catalunya', '2025-09-11', 'ES', 'ES-CT', true, 'static'),
('holiday', 'Sant Esteve', '2025-12-26', 'ES', 'ES-CT', true, 'static'),
('holiday', 'Sant Jordi', '2026-04-23', 'ES', 'ES-CT', true, 'static'),
('holiday', 'Sant Joan', '2026-06-24', 'ES', 'ES-CT', true, 'static'),
('holiday', 'Diada de Catalunya', '2026-09-11', 'ES', 'ES-CT', true, 'static'),
('holiday', 'Sant Esteve', '2026-12-26', 'ES', 'ES-CT', true, 'static');

-- ============================================
-- FESTIVOS MADRID (ES-MD) 2025-2026
-- ============================================
INSERT INTO calendar_events (category, name, event_date, country_code, region_code, is_recurring, source) VALUES
('holiday', 'San Isidro', '2025-05-15', 'ES', 'ES-MD', true, 'static'),
('holiday', 'Virgen de la Almudena', '2025-11-09', 'ES', 'ES-MD', true, 'static'),
('holiday', 'San Isidro', '2026-05-15', 'ES', 'ES-MD', true, 'static'),
('holiday', 'Virgen de la Almudena', '2026-11-09', 'ES', 'ES-MD', true, 'static');

-- ============================================
-- FESTIVOS VALENCIA (ES-VC) 2025-2026
-- ============================================
INSERT INTO calendar_events (category, name, event_date, country_code, region_code, is_recurring, source) VALUES
('holiday', 'San Vicente Mártir', '2025-01-22', 'ES', 'ES-VC', true, 'static'),
('holiday', 'Fallas - San José', '2025-03-19', 'ES', 'ES-VC', true, 'static'),
('holiday', 'Día de la Comunitat Valenciana', '2025-10-09', 'ES', 'ES-VC', true, 'static'),
('holiday', 'San Vicente Mártir', '2026-01-22', 'ES', 'ES-VC', true, 'static'),
('holiday', 'Fallas - San José', '2026-03-19', 'ES', 'ES-VC', true, 'static'),
('holiday', 'Día de la Comunitat Valenciana', '2026-10-09', 'ES', 'ES-VC', true, 'static');

-- ============================================
-- FESTIVOS PAÍS VASCO (ES-PV) 2025-2026
-- ============================================
INSERT INTO calendar_events (category, name, event_date, country_code, region_code, is_recurring, source) VALUES
('holiday', 'Sábado Santo', '2025-04-19', 'ES', 'ES-PV', false, 'static'),
('holiday', 'Santiago Apóstol', '2025-07-25', 'ES', 'ES-PV', true, 'static'),
('holiday', 'Sábado Santo', '2026-04-04', 'ES', 'ES-PV', false, 'static'),
('holiday', 'Santiago Apóstol', '2026-07-25', 'ES', 'ES-PV', true, 'static');

-- ============================================
-- FESTIVOS ANDALUCÍA (ES-AN) 2025-2026
-- ============================================
INSERT INTO calendar_events (category, name, event_date, country_code, region_code, is_recurring, source) VALUES
('holiday', 'Día de Andalucía', '2025-02-28', 'ES', 'ES-AN', true, 'static'),
('holiday', 'Día de Andalucía', '2026-02-28', 'ES', 'ES-AN', true, 'static');

-- ============================================
-- EVENTOS COMERCIALES 2025-2026
-- Fechas fijas relevantes para delivery
-- ============================================
INSERT INTO calendar_events (category, name, description, event_date, country_code, source) VALUES
('commercial', 'San Valentín', 'Día de los enamorados - Pico de pedidos', '2025-02-14', 'ES', 'static'),
('commercial', 'Día del Padre', 'Celebración familiar', '2025-03-19', 'ES', 'static'),
('commercial', 'Día de la Madre', 'Celebración familiar', '2025-05-04', 'ES', 'static'),
('commercial', 'Inicio Rebajas Verano', 'Temporada de rebajas', '2025-07-01', 'ES', 'static'),
('commercial', 'Halloween', 'Fiestas y cenas temáticas', '2025-10-31', 'ES', 'static'),
('commercial', 'Black Friday', 'Pico de promociones', '2025-11-28', 'ES', 'static'),
('commercial', 'Cyber Monday', 'Promociones online', '2025-12-01', 'ES', 'static'),
('commercial', 'Nochebuena', 'Cenas familiares', '2025-12-24', 'ES', 'static'),
('commercial', 'Nochevieja', 'Cenas y celebraciones', '2025-12-31', 'ES', 'static'),
('commercial', 'Inicio Rebajas Invierno', 'Temporada de rebajas', '2026-01-07', 'ES', 'static'),
('commercial', 'San Valentín', 'Día de los enamorados - Pico de pedidos', '2026-02-14', 'ES', 'static'),
('commercial', 'Día del Padre', 'Celebración familiar', '2026-03-19', 'ES', 'static'),
('commercial', 'Día de la Madre', 'Celebración familiar', '2026-05-03', 'ES', 'static'),
('commercial', 'Inicio Rebajas Verano', 'Temporada de rebajas', '2026-07-01', 'ES', 'static'),
('commercial', 'Halloween', 'Fiestas y cenas temáticas', '2026-10-31', 'ES', 'static'),
('commercial', 'Black Friday', 'Pico de promociones', '2026-11-27', 'ES', 'static'),
('commercial', 'Cyber Monday', 'Promociones online', '2026-11-30', 'ES', 'static'),
('commercial', 'Nochebuena', 'Cenas familiares', '2026-12-24', 'ES', 'static'),
('commercial', 'Nochevieja', 'Cenas y celebraciones', '2026-12-31', 'ES', 'static');
