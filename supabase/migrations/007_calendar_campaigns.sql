-- ============================================
-- CALENDARIO DE CAMPANAS PROMOCIONALES
-- Sistema para gestionar promociones y publicidad
-- ============================================

-- ============================================
-- Tabla: promotional_campaigns
-- Campanas promocionales y publicitarias
-- ============================================

CREATE TABLE public.promotional_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Vinculacion
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,

  -- Plataforma y tipo
  platform TEXT NOT NULL CHECK (platform IN ('glovo', 'ubereats', 'justeat', 'google_ads')),
  campaign_type TEXT NOT NULL,

  -- Nombre de la campana (opcional, para identificacion)
  name TEXT,

  -- Configuracion especifica (JSON dinamico segun tipo)
  config JSONB NOT NULL DEFAULT '{}',

  -- Productos asociados (si aplica)
  product_ids TEXT[] DEFAULT '{}',

  -- Fechas
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  -- Estado
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled')),

  -- Metricas (post-campana)
  metrics JSONB,

  -- Auditoria
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Validacion de fechas
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Indices para busquedas eficientes
CREATE INDEX idx_campaigns_restaurant ON public.promotional_campaigns(restaurant_id);
CREATE INDEX idx_campaigns_platform ON public.promotional_campaigns(platform);
CREATE INDEX idx_campaigns_dates ON public.promotional_campaigns(start_date, end_date);
CREATE INDEX idx_campaigns_status ON public.promotional_campaigns(status);
CREATE INDEX idx_campaigns_created_at ON public.promotional_campaigns(created_at DESC);

-- ============================================
-- Tabla: calendar_events
-- Eventos del calendario (festivos, deportes, etc.)
-- ============================================

CREATE TABLE public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Categoria
  category TEXT NOT NULL CHECK (category IN ('holiday', 'sports', 'entertainment', 'commercial')),

  -- Datos del evento
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,

  -- Fechas
  event_date DATE NOT NULL,
  end_date DATE,

  -- Ubicacion (opcional, para eventos locales)
  country_code TEXT DEFAULT 'ES',
  region_code TEXT,

  -- Recurrencia
  is_recurring BOOLEAN DEFAULT false,
  recurrence_rule TEXT,

  -- Metadata
  source TEXT,
  external_id TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices
CREATE INDEX idx_events_date ON public.calendar_events(event_date);
CREATE INDEX idx_events_category ON public.calendar_events(category);
CREATE INDEX idx_events_country ON public.calendar_events(country_code);

-- ============================================
-- Tabla: weather_cache
-- Cache del pronostico meteorologico
-- ============================================

CREATE TABLE public.weather_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ubicacion
  latitude DECIMAL(10, 7) NOT NULL,
  longitude DECIMAL(10, 7) NOT NULL,

  -- Datos meteorologicos
  forecast_date DATE NOT NULL,
  temperature_max DECIMAL(4, 1),
  temperature_min DECIMAL(4, 1),
  weather_code INTEGER,
  precipitation_probability INTEGER,

  -- Cache control
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,

  UNIQUE(latitude, longitude, forecast_date)
);

-- Indice para limpieza de cache
CREATE INDEX idx_weather_expires ON public.weather_cache(expires_at);

-- ============================================
-- TRIGGER: Auto-actualizar updated_at para campaigns
-- ============================================

CREATE OR REPLACE FUNCTION update_campaign_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_campaigns_updated_at
  BEFORE UPDATE ON public.promotional_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_campaign_updated_at();

-- ============================================
-- TRIGGER: Auto-actualizar status basado en fechas
-- ============================================

CREATE OR REPLACE FUNCTION update_campaign_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Si la campana no esta cancelada, actualizar status automaticamente
  IF NEW.status != 'cancelled' THEN
    IF CURRENT_DATE > NEW.end_date THEN
      NEW.status := 'completed';
    ELSIF CURRENT_DATE >= NEW.start_date AND CURRENT_DATE <= NEW.end_date THEN
      NEW.status := 'active';
    ELSE
      NEW.status := 'scheduled';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_campaign_status
  BEFORE INSERT OR UPDATE ON public.promotional_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_campaign_status();

-- ============================================
-- FUNCION: Limpiar cache de tiempo expirado
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_expired_weather_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.weather_cache
  WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE public.promotional_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weather_cache ENABLE ROW LEVEL SECURITY;

-- Campanas: usuarios ven campanas de sus restaurantes asignados
CREATE POLICY "Users view campaigns of assigned restaurants"
ON public.promotional_campaigns FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants r
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE r.id = promotional_campaigns.restaurant_id
      AND (p.role = 'admin' OR r.company_id = ANY(p.assigned_company_ids))
  )
);

-- Campanas: consultants y admins pueden crear
CREATE POLICY "Consultants can create campaigns"
ON public.promotional_campaigns FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'consultant')
  )
);

-- Campanas: consultants y admins pueden actualizar sus campanas
CREATE POLICY "Consultants can update campaigns"
ON public.promotional_campaigns FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'consultant')
  )
);

-- Campanas: consultants y admins pueden eliminar
CREATE POLICY "Consultants can delete campaigns"
ON public.promotional_campaigns FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'consultant')
  )
);

-- Eventos: lectura publica para usuarios autenticados
CREATE POLICY "Authenticated users can read events"
ON public.calendar_events FOR SELECT
TO authenticated
USING (true);

-- Eventos: solo admins pueden gestionar
CREATE POLICY "Admins can manage events"
ON public.calendar_events FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- Weather cache: lectura publica para usuarios autenticados
CREATE POLICY "Authenticated users can read weather cache"
ON public.weather_cache FOR SELECT
TO authenticated
USING (true);

-- Weather cache: cualquier usuario autenticado puede insertar (para el cache)
CREATE POLICY "Authenticated users can insert weather cache"
ON public.weather_cache FOR INSERT
TO authenticated
WITH CHECK (true);

-- ============================================
-- SEED: Eventos iniciales (festivos Espana 2026)
-- ============================================

INSERT INTO public.calendar_events (category, name, description, icon, event_date, country_code, is_recurring, recurrence_rule, source) VALUES
-- Festivos nacionales
('holiday', 'Ano Nuevo', 'Dia de Ano Nuevo', 'PartyPopper', '2026-01-01', 'ES', true, 'yearly', 'manual'),
('holiday', 'Reyes Magos', 'Epifania del Senor', 'Gift', '2026-01-06', 'ES', true, 'yearly', 'manual'),
('holiday', 'Viernes Santo', 'Viernes Santo', 'Cross', '2026-04-03', 'ES', false, null, 'manual'),
('holiday', 'Dia del Trabajo', 'Fiesta del Trabajo', 'Briefcase', '2026-05-01', 'ES', true, 'yearly', 'manual'),
('holiday', 'Asuncion de la Virgen', 'Asuncion de Maria', 'Church', '2026-08-15', 'ES', true, 'yearly', 'manual'),
('holiday', 'Fiesta Nacional', 'Dia de la Hispanidad', 'Flag', '2026-10-12', 'ES', true, 'yearly', 'manual'),
('holiday', 'Todos los Santos', 'Dia de Todos los Santos', 'Flower2', '2026-11-01', 'ES', true, 'yearly', 'manual'),
('holiday', 'Constitucion', 'Dia de la Constitucion', 'Scale', '2026-12-06', 'ES', true, 'yearly', 'manual'),
('holiday', 'Inmaculada Concepcion', 'Inmaculada Concepcion', 'Sparkles', '2026-12-08', 'ES', true, 'yearly', 'manual'),
('holiday', 'Navidad', 'Natividad del Senor', 'TreePine', '2026-12-25', 'ES', true, 'yearly', 'manual'),

-- Eventos comerciales
('commercial', 'San Valentin', 'Dia de los Enamorados', 'Heart', '2026-02-14', 'ES', true, 'yearly', 'manual'),
('commercial', 'Dia del Padre', 'Dia del Padre', 'User', '2026-03-19', 'ES', true, 'yearly', 'manual'),
('commercial', 'Dia de la Madre', 'Dia de la Madre', 'Heart', '2026-05-03', 'ES', true, 'yearly', 'manual'),
('commercial', 'Black Friday', 'Black Friday', 'ShoppingCart', '2026-11-27', 'ES', true, 'yearly', 'manual'),
('commercial', 'Cyber Monday', 'Cyber Monday', 'Monitor', '2026-11-30', 'ES', true, 'yearly', 'manual'),
('commercial', 'Nochevieja', 'Fin de Ano', 'Clock', '2026-12-31', 'ES', true, 'yearly', 'manual'),

-- Eventos deportivos (ejemplo)
('sports', 'Final Champions League', 'Final UEFA Champions League', 'Trophy', '2026-05-30', 'ES', false, null, 'manual'),
('sports', 'Final Copa del Rey', 'Final Copa del Rey', 'Trophy', '2026-04-18', 'ES', false, null, 'manual');
