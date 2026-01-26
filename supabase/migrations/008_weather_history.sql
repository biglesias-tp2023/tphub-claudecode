-- ============================================
-- HISTORIAL DE CLIMA
-- Modificaciones para mantener el historial meteorológico
-- ============================================

-- Añadir columna para indicar si es dato real o pronóstico
ALTER TABLE public.weather_cache
ADD COLUMN IF NOT EXISTS is_historical BOOLEAN DEFAULT false;

-- Añadir columna para descripción del clima
ALTER TABLE public.weather_cache
ADD COLUMN IF NOT EXISTS description TEXT;

-- Añadir columna para icono del clima
ALTER TABLE public.weather_cache
ADD COLUMN IF NOT EXISTS icon TEXT;

-- Añadir índice para búsquedas por fecha
CREATE INDEX IF NOT EXISTS idx_weather_date ON public.weather_cache(forecast_date);

-- Añadir índice para búsquedas históricas
CREATE INDEX IF NOT EXISTS idx_weather_historical ON public.weather_cache(is_historical);

-- ============================================
-- Modificar función de limpieza
-- Solo elimina caché de pronósticos futuros expirados
-- NUNCA elimina datos históricos (is_historical = true)
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_expired_weather_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Solo eliminar cache expirado de pronósticos (no históricos)
  -- Y solo si la fecha del pronóstico aún no ha pasado
  DELETE FROM public.weather_cache
  WHERE expires_at < NOW()
    AND is_historical = false
    AND forecast_date > CURRENT_DATE;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Función para marcar datos como históricos
-- Se ejecuta diariamente para convertir pronósticos pasados en históricos
-- ============================================

CREATE OR REPLACE FUNCTION mark_weather_as_historical()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Marcar como histórico cualquier registro de fecha pasada
  -- que aún no esté marcado como histórico
  UPDATE public.weather_cache
  SET
    is_historical = true,
    expires_at = NULL  -- Los históricos nunca expiran
  WHERE forecast_date < CURRENT_DATE
    AND is_historical = false;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Trigger para marcar automáticamente como histórico
-- cuando se inserta/actualiza un registro de fecha pasada
-- ============================================

CREATE OR REPLACE FUNCTION auto_mark_historical_weather()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.forecast_date < CURRENT_DATE THEN
    NEW.is_historical := true;
    NEW.expires_at := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_mark_historical_weather ON public.weather_cache;
CREATE TRIGGER trigger_auto_mark_historical_weather
  BEFORE INSERT OR UPDATE ON public.weather_cache
  FOR EACH ROW
  EXECUTE FUNCTION auto_mark_historical_weather();

-- ============================================
-- Policy para permitir actualizar weather cache
-- (necesario para marcar como histórico)
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can update weather cache" ON public.weather_cache;
CREATE POLICY "Authenticated users can update weather cache"
ON public.weather_cache FOR UPDATE
TO authenticated
USING (true);

-- Comentario explicativo
COMMENT ON TABLE public.weather_cache IS 'Cache de pronósticos meteorológicos. Los registros con is_historical=true son datos reales de días pasados y nunca se eliminan.';
COMMENT ON COLUMN public.weather_cache.is_historical IS 'true = dato real histórico (permanente), false = pronóstico (temporal)';
