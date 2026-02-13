-- ============================================
-- AUDITORÍAS - Sistema de auditorías de onboarding
-- ============================================

-- Tabla de tipos de auditoría
CREATE TABLE IF NOT EXISTS public.audit_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,           -- 'delivery', 'google_ads', 'mystery_shopper'
  name TEXT NOT NULL,                   -- 'Plataformas Delivery'
  description TEXT,
  icon TEXT,                            -- Lucide icon name
  field_schema JSONB NOT NULL,          -- Configuración de campos
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla principal de auditorías
CREATE TABLE IF NOT EXISTS public.audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Referencia secuencial legible
  audit_number TEXT UNIQUE NOT NULL,    -- 'AUD-2026-001'

  -- Vinculación (al menos uno requerido)
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  area_id UUID REFERENCES public.areas(id) ON DELETE SET NULL,

  -- Tipo y datos
  audit_type_id UUID NOT NULL REFERENCES public.audit_types(id),
  field_data JSONB,                     -- Respuestas al formulario

  -- Estado
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed')),

  -- Fechas
  scheduled_date DATE,
  completed_at TIMESTAMPTZ,

  -- Auditoría
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Al menos una vinculación requerida
  CONSTRAINT audit_has_scope CHECK (
    company_id IS NOT NULL OR
    restaurant_id IS NOT NULL
  )
);

-- Índices para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_audits_company ON public.audits(company_id);
CREATE INDEX IF NOT EXISTS idx_audits_restaurant ON public.audits(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_audits_type ON public.audits(audit_type_id);
CREATE INDEX IF NOT EXISTS idx_audits_status ON public.audits(status);
CREATE INDEX IF NOT EXISTS idx_audits_number ON public.audits(audit_number);
CREATE INDEX IF NOT EXISTS idx_audits_created_at ON public.audits(created_at DESC);

-- Índice para audit_types
CREATE INDEX IF NOT EXISTS idx_audit_types_slug ON public.audit_types(slug);

-- ============================================
-- FUNCIÓN: Generar número de auditoría
-- ============================================

CREATE OR REPLACE FUNCTION generate_audit_number()
RETURNS TEXT AS $$
DECLARE
  current_year INTEGER;
  next_number INTEGER;
BEGIN
  current_year := EXTRACT(YEAR FROM NOW());

  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(audit_number, '-', 3) AS INTEGER)
  ), 0) + 1
  INTO next_number
  FROM public.audits
  WHERE audit_number LIKE 'AUD-' || current_year || '-%';

  RETURN 'AUD-' || current_year || '-' || LPAD(next_number::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER: Auto-generar número de auditoría
-- ============================================

CREATE OR REPLACE FUNCTION set_audit_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.audit_number IS NULL OR NEW.audit_number = '' THEN
    NEW.audit_number := generate_audit_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_audit_number ON public.audits;
CREATE TRIGGER trigger_set_audit_number
  BEFORE INSERT ON public.audits
  FOR EACH ROW
  EXECUTE FUNCTION set_audit_number();

-- ============================================
-- TRIGGER: Auto-actualizar updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_audit_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_audits_updated_at ON public.audits;
CREATE TRIGGER trigger_update_audits_updated_at
  BEFORE UPDATE ON public.audits
  FOR EACH ROW
  EXECUTE FUNCTION update_audit_updated_at();

DROP TRIGGER IF EXISTS trigger_update_audit_types_updated_at ON public.audit_types;
CREATE TRIGGER trigger_update_audit_types_updated_at
  BEFORE UPDATE ON public.audit_types
  FOR EACH ROW
  EXECUTE FUNCTION update_audit_updated_at();

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE public.audit_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;

-- audit_types: lectura pública para usuarios autenticados
DROP POLICY IF EXISTS "Authenticated users can read audit types" ON public.audit_types;
CREATE POLICY "Authenticated users can read audit types"
ON public.audit_types FOR SELECT
TO authenticated
USING (is_active = true);

-- audit_types: solo admins pueden modificar
DROP POLICY IF EXISTS "Only admins can manage audit types" ON public.audit_types;
CREATE POLICY "Only admins can manage audit types"
ON public.audit_types FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- audits: usuarios ven auditorías de sus compañías asignadas
DROP POLICY IF EXISTS "Users view audits of assigned companies" ON public.audits;
CREATE POLICY "Users view audits of assigned companies"
ON public.audits FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (
        p.role = 'admin'
        OR company_id = ANY(p.assigned_company_ids)
        OR EXISTS (
          SELECT 1 FROM public.restaurants r
          WHERE r.id = audits.restaurant_id
            AND r.company_id = ANY(p.assigned_company_ids)
        )
      )
  )
);

-- audits: admin y consultant pueden crear/modificar
DROP POLICY IF EXISTS "Admins and consultants can create audits" ON public.audits;
CREATE POLICY "Admins and consultants can create audits"
ON public.audits FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'consultant')
  )
);

DROP POLICY IF EXISTS "Admins and consultants can update audits" ON public.audits;
CREATE POLICY "Admins and consultants can update audits"
ON public.audits FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'consultant')
  )
);

DROP POLICY IF EXISTS "Admins and consultants can delete audits" ON public.audits;
CREATE POLICY "Admins and consultants can delete audits"
ON public.audits FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'consultant')
  )
);

-- ============================================
-- SEED: Tipos de auditoría iniciales
-- ============================================

INSERT INTO public.audit_types (slug, name, description, icon, display_order, field_schema) VALUES
(
  'delivery',
  'Plataformas Delivery',
  'Auditoría de presencia y optimización en plataformas de delivery (Glovo, UberEats, JustEat)',
  'Truck',
  1,
  '{
    "sections": [
      {
        "key": "general",
        "title": "Información General",
        "fields": [
          {"key": "platforms_active", "label": "Plataformas activas", "type": "select", "options": ["Glovo", "UberEats", "JustEat", "Todas"], "required": true},
          {"key": "account_manager", "label": "Account Manager asignado", "type": "text"}
        ]
      },
      {
        "key": "profile",
        "title": "Perfil del Restaurante",
        "fields": [
          {"key": "logo_quality", "label": "Calidad del logo", "type": "score", "maxScore": 5},
          {"key": "cover_photo", "label": "Foto de portada atractiva", "type": "checkbox"},
          {"key": "description_complete", "label": "Descripción completa", "type": "checkbox"},
          {"key": "schedule_updated", "label": "Horarios actualizados", "type": "checkbox"},
          {"key": "contact_info", "label": "Información de contacto correcta", "type": "checkbox"}
        ]
      },
      {
        "key": "menu",
        "title": "Carta y Productos",
        "fields": [
          {"key": "photos_quality", "label": "Calidad de fotos de productos", "type": "score", "maxScore": 5},
          {"key": "descriptions_complete", "label": "Descripciones completas", "type": "checkbox"},
          {"key": "prices_competitive", "label": "Precios competitivos", "type": "checkbox"},
          {"key": "modifiers_configured", "label": "Modificadores configurados", "type": "checkbox"},
          {"key": "categories_organized", "label": "Categorías bien organizadas", "type": "checkbox"},
          {"key": "combos_available", "label": "Combos/menús disponibles", "type": "checkbox"}
        ]
      },
      {
        "key": "operations",
        "title": "Operaciones",
        "fields": [
          {"key": "avg_prep_time", "label": "Tiempo promedio de preparación (min)", "type": "number"},
          {"key": "rejection_rate", "label": "Tasa de rechazo (%)", "type": "number"},
          {"key": "cancellation_rate", "label": "Tasa de cancelación (%)", "type": "number"},
          {"key": "tablet_management", "label": "Gestión correcta de tablet", "type": "checkbox"}
        ]
      },
      {
        "key": "marketing",
        "title": "Marketing y Promociones",
        "fields": [
          {"key": "active_campaigns", "label": "Campañas activas", "type": "checkbox"},
          {"key": "ads_budget", "label": "Presupuesto ADS mensual (€)", "type": "number"},
          {"key": "promos_active", "label": "Promociones activas", "type": "checkbox"},
          {"key": "featured_products", "label": "Productos destacados configurados", "type": "checkbox"}
        ]
      },
      {
        "key": "notes",
        "title": "Observaciones",
        "fields": [
          {"key": "strengths", "label": "Puntos fuertes", "type": "text"},
          {"key": "improvements", "label": "Áreas de mejora", "type": "text"},
          {"key": "action_plan", "label": "Plan de acción recomendado", "type": "text"}
        ]
      }
    ]
  }'::jsonb
),
(
  'google_ads',
  'Google Ads',
  'Auditoría de campañas de Google Ads para restaurantes',
  'BarChart3',
  2,
  '{
    "sections": [
      {
        "key": "account",
        "title": "Cuenta de Google Ads",
        "fields": [
          {"key": "account_id", "label": "ID de cuenta", "type": "text"},
          {"key": "account_access", "label": "Acceso a la cuenta", "type": "checkbox"},
          {"key": "billing_setup", "label": "Facturación configurada", "type": "checkbox"},
          {"key": "conversion_tracking", "label": "Seguimiento de conversiones activo", "type": "checkbox"}
        ]
      },
      {
        "key": "campaigns",
        "title": "Campañas",
        "fields": [
          {"key": "active_campaigns", "label": "Número de campañas activas", "type": "number"},
          {"key": "campaign_structure", "label": "Estructura de campañas adecuada", "type": "score", "maxScore": 5},
          {"key": "budget_distribution", "label": "Distribución de presupuesto correcta", "type": "checkbox"},
          {"key": "geographic_targeting", "label": "Segmentación geográfica correcta", "type": "checkbox"}
        ]
      },
      {
        "key": "keywords",
        "title": "Palabras Clave",
        "fields": [
          {"key": "keyword_relevance", "label": "Relevancia de palabras clave", "type": "score", "maxScore": 5},
          {"key": "negative_keywords", "label": "Palabras clave negativas configuradas", "type": "checkbox"},
          {"key": "match_types", "label": "Tipos de concordancia adecuados", "type": "checkbox"},
          {"key": "quality_score_avg", "label": "Quality Score promedio (1-10)", "type": "number"}
        ]
      },
      {
        "key": "ads",
        "title": "Anuncios",
        "fields": [
          {"key": "ad_copy_quality", "label": "Calidad del copy", "type": "score", "maxScore": 5},
          {"key": "extensions_active", "label": "Extensiones activas", "type": "checkbox"},
          {"key": "responsive_ads", "label": "Anuncios responsivos configurados", "type": "checkbox"},
          {"key": "ad_variations", "label": "Variaciones de anuncios (mínimo 3)", "type": "checkbox"}
        ]
      },
      {
        "key": "performance",
        "title": "Rendimiento",
        "fields": [
          {"key": "ctr_avg", "label": "CTR promedio (%)", "type": "number"},
          {"key": "cpc_avg", "label": "CPC promedio (€)", "type": "number"},
          {"key": "conversion_rate", "label": "Tasa de conversión (%)", "type": "number"},
          {"key": "roas", "label": "ROAS", "type": "number"}
        ]
      },
      {
        "key": "recommendations",
        "title": "Recomendaciones",
        "fields": [
          {"key": "quick_wins", "label": "Quick wins identificados", "type": "text"},
          {"key": "optimization_plan", "label": "Plan de optimización", "type": "text"},
          {"key": "budget_recommendation", "label": "Presupuesto recomendado (€/mes)", "type": "number"}
        ]
      }
    ]
  }'::jsonb
),
(
  'mystery_shopper',
  'Mystery Shopper',
  'Evaluación anónima de la experiencia de cliente en delivery',
  'UserSearch',
  3,
  '{
    "sections": [
      {
        "key": "info_general",
        "title": "Información General",
        "icon": "Info",
        "fields": [
          {"key": "marca_evaluar", "label": "Marca a Evaluar", "type": "text", "required": true, "placeholder": "Nombre exacto del restaurante o marca"},
          {"key": "consultor_evalua", "label": "Consultor que Evalúa", "type": "text", "required": true},
          {"key": "kam_marca", "label": "KAM que gestiona la marca", "type": "text", "required": true},
          {"key": "plataforma", "label": "Plataforma en la que has realizado el pedido", "type": "select", "options": ["Glovo", "Uber Eats", "JustEat", "Canal Propio"], "required": true}
        ]
      },
      {
        "key": "visibilidad_feed",
        "title": "Visibilidad en Feed",
        "icon": "Eye",
        "fields": [
          {"key": "visibilidad_restaurante", "label": "¿Qué tan visible aparece el restaurante en el feed?", "type": "multiselect", "required": true, "options": ["Primera pantalla", "Segunda Pantalla", "Tercera Pantalla", "Últimas posiciones", "No aparece"]},
          {"key": "competidores_cerca", "label": "¿Qué competidores aparecen cerca del feed?", "type": "text", "required": true, "placeholder": "Lista 2 restaurantes antes y 2 después"}
        ]
      },
      {
        "key": "evaluacion_visual",
        "title": "Evaluación Visual del Perfil",
        "icon": "Image",
        "fields": [
          {"key": "atractivo_portada", "label": "Evalúa el atractivo visual de la foto de portada", "type": "score", "maxScore": 5, "required": true, "scoreLabels": ["Foto de archivo", "Poco atractiva", "Correcta", "Atractiva", "Calidad Profesional"]},
          {"key": "atractivo_menu", "label": "Evalúa el atractivo visual de las fotos del menú", "type": "score", "maxScore": 5, "required": true, "scoreLabels": ["No apetecibles", "Mejorables", "Estándar", "Atractivas", "Foto Profesionales"]},
          {"key": "problemas_visuales", "label": "¿Qué problemas visuales detectas en el perfil?", "type": "multiselect", "required": true, "options": ["Iluminación deficiente", "Falta de coherencia en el menú", "Imágenes duplicadas", "Mala lógica de Modificadores", "Mal tamaño respecto al pedido", "Categorías desordenadas", "TAGS no coinciden con el tipo de producto", "Las imágenes son borrosas", "Sobran TAGS en el perfil", "Falta foto de Logo", "Falta descriptivo en el perfil", "No detecto ningún problema visual"]},
          {"key": "coherencia_marca", "label": "Evalúa la coherencia visual y de marca (colores, tono, naming)", "type": "score", "maxScore": 5, "required": true, "scoreLabels": ["Sin coherencia", "Coherencia baja", "Normal", "Buena", "Excelente"]},
          {"key": "seo_naming", "label": "Evalúa el SEO/Naming de productos", "type": "score", "maxScore": 5, "required": true, "scoreLabels": ["No hay SEO/naming", "SEO/Naming pobre", "Adecuado", "Bueno", "SEO/naming excelente"]}
        ]
      },
      {
        "key": "experiencia_pedido",
        "title": "Experiencia de Pedido",
        "icon": "ShoppingCart",
        "fields": [
          {"key": "friccion_pedido", "label": "Dificultad o fricción al realizar el pedido", "type": "multiselect", "required": true, "options": ["Menú lento al cargar", "Modificadores confusos", "Precios poco visibles", "Fotos no cargan", "Orden de categoría ilógico", "Falta de detalle en la descripción que dan lugar a confusión", "No hay ningún detalle o fricción al realizar el pedido"]},
          {"key": "calidad_modificadores", "label": "Calidad y profundidad de los modificadores/extras (0-5)", "type": "score", "maxScore": 5, "required": true, "scoreLabels": ["No existe ningún modificador", "Modificadores mínimos (1-2 opciones)", "Disponibles pero incompletos", "Correctos pero mejorables", "Sistema profesional y completo", "Sistema avanzado personalizado"]},
          {"key": "sugerencias_mejora", "label": "Escribe sugerencias de mejora", "type": "text", "placeholder": "Propón mejoras sobre fotos, estructura, orden, naming o pricing"},
          {"key": "precios_coherentes", "label": "¿Los precios son coherentes y claros?", "type": "score", "maxScore": 5, "required": true, "scoreLabels": ["Muy confusos", "Poco claros", "Normal", "Claros", "Muy claros y coherentes"]},
          {"key": "precios_vs_competencia", "label": "¿Cómo son los precios respecto a la competencia?", "type": "select", "required": true, "options": ["Más bajos", "Similares", "Más altos"]}
        ]
      },
      {
        "key": "promociones",
        "title": "Promociones",
        "icon": "Megaphone",
        "fields": [
          {"key": "promos_activas", "label": "¿Has visto promociones activas antes de entrar al restaurante?", "type": "multiselect", "required": true, "options": ["Sí (Descuento directo)", "Sí (Envío gratis)", "Sí (2x1 / Combo Especial)", "Sí (banner promocional)", "Sí (otras)", "No he visto ninguna promoción activa"]},
          {"key": "decision_influida_promo", "label": "¿La decisión de compra estuvo influida por la promoción?", "type": "select", "required": true, "options": ["1 - No influyó nada", "2 - Influyó poco", "3 - Influyó parcialmente", "4 - Influyó bastante", "5 - Fue determinante para comprar", "No había promoción"]},
          {"key": "depende_promociones", "label": "¿Percibes que el restaurante depende excesivamente de las promociones?", "type": "score", "maxScore": 5, "required": true, "scoreLabels": ["Nada promocionero", "Poco promocionero", "Moderado", "Bastante promocionero", "Muy promocionero / Siempre con descuentos"]},
          {"key": "volveria_sin_descuento", "label": "Si tu pedido iba con descuento, ¿volverías a pedir sin descuento?", "type": "select", "required": true, "options": ["1 - No volvería a pedir sin descuento", "2 - Volvería a pedir si hay promoción", "3 - Quizá", "4 - Sí que volvería", "5 - Seguro que sí"]}
        ]
      },
      {
        "key": "info_pedido",
        "title": "Información del Pedido",
        "icon": "Receipt",
        "fields": [
          {"key": "fecha_pedido", "label": "Fecha en la que se ha realizado el pedido", "type": "text", "required": true, "placeholder": "DD/MM/YYYY"},
          {"key": "hora_estimada", "label": "Hora estimada de entrega (según app)", "type": "text", "required": true, "placeholder": "ej: 20-30min"},
          {"key": "precio_pedido", "label": "Precio del pedido (€)", "type": "number", "required": true, "placeholder": "ej: 12.90"},
          {"key": "personas_pedido", "label": "El pedido, ¿para cuántas personas es?", "type": "number", "required": true}
        ]
      },
      {
        "key": "tiempos",
        "title": "Tiempos de Entrega",
        "icon": "Clock",
        "fields": [
          {"key": "hora_entrega_real", "label": "Hora exacta de entrega del pedido", "type": "text", "required": true, "placeholder": "ej: 13:50h"},
          {"key": "diferencia_minutos", "label": "Diferencia total (minutos)", "type": "number", "required": true},
          {"key": "tiempo_razonable", "label": "¿El tiempo total fue razonable?", "type": "score", "maxScore": 5, "required": true, "scoreLabels": ["Nada razonable", "Poco Razonable", "Estándar", "Más rápido de lo esperado", "Mucho más rápido de lo esperado"]},
          {"key": "comentario_operativo", "label": "Comentario sobre el rendimiento operativo", "type": "text", "required": true, "placeholder": "Explica si hubo retrasos, incidencias, riders mal asignados..."}
        ]
      },
      {
        "key": "seleccion_producto",
        "title": "Selección de Producto",
        "icon": "Package",
        "fields": [
          {"key": "tipos_productos", "label": "¿Qué tipos de productos has pedido?", "type": "multiselect", "required": true, "options": ["Plato Top Ventas", "Plato recomendado por la app", "Nuevo lanzamiento / edición limitada", "Plato secundario / no prioritario", "Producto por curiosidad", "Menú del Día", "Otros"]},
          {"key": "razon_eleccion", "label": "¿Por qué elegiste este/s producto/s en concreto?", "type": "multiselect", "required": true, "options": ["Foto Atractiva", "Precio competitivo", "Descripción convincente", "Recomendado por la app", "Antojo / Impulso / Me apetecía", "Es el que pido siempre", "Tenía promoción", "Packaging atractivo", "Curiosidad por probar algo nuevo"]},
          {"key": "foto_influyo", "label": "¿Consideras que la foto del producto influyó en tu decisión?", "type": "score", "maxScore": 5, "required": true, "scoreLabels": ["Nada", "Poco", "Neutral", "Bastante", "Decisivo"]}
        ]
      },
      {
        "key": "evaluacion_producto",
        "title": "Evaluación del Producto",
        "icon": "Utensils",
        "fields": [
          {"key": "coincidencia_visual", "label": "Coincidencia visual del producto con la foto del menú", "type": "score", "maxScore": 5, "required": true, "scoreLabels": ["No coincide nada", "Coincide poco", "Coincide parcialmente", "Coincide", "Coincidencia exacta"]},
          {"key": "comentario_coherencia", "label": "Añade un comentario sobre la coherencia visual", "type": "text", "required": true, "placeholder": "Si no tienes nada que añadir, escribe SC"},
          {"key": "temperatura_recibido", "label": "Temperatura al recibir el pedido", "type": "score", "maxScore": 5, "required": true, "scoreLabels": ["Muy fría", "Fría", "Templado", "Caliente", "Muy Caliente"]},
          {"key": "comentario_temperatura", "label": "Añade un comentario sobre la temperatura", "type": "text", "required": true, "placeholder": "SC si no hay nada que añadir"},
          {"key": "relacion_calidad_precio", "label": "Relación Calidad Precio", "type": "score", "maxScore": 5, "required": true, "scoreLabels": ["Muy baja", "Baja", "Aceptable", "Alta", "Muy alta"]},
          {"key": "comentario_calidad_precio", "label": "Añade un comentario sobre la relación calidad-precio", "type": "text", "required": true, "placeholder": "SC si es neutro"},
          {"key": "calidad_organoleptica", "label": "Calidad organoléptica", "type": "score", "maxScore": 5, "required": true, "scoreLabels": ["Muy deficiente", "Baja", "Aceptable", "Buena", "Excelente"]},
          {"key": "comentario_cata", "label": "Comentario breve de la cata", "type": "text", "required": true}
        ]
      },
      {
        "key": "packaging",
        "title": "Packaging",
        "icon": "Box",
        "fields": [
          {"key": "estado_packaging", "label": "Estado general del packaging", "type": "score", "maxScore": 5, "required": true, "scoreLabels": ["Muy deficiente", "Bajo", "Aceptable", "Bueno", "Excelente"]},
          {"key": "personalizacion_marca", "label": "Personalización de marca", "type": "score", "maxScore": 5, "required": true, "scoreLabels": ["Nula", "Baja", "Correcta", "Buena", "Excelente"]},
          {"key": "funcionalidad_packaging", "label": "Funcionalidad y usabilidad", "type": "score", "maxScore": 5, "required": true, "scoreLabels": ["Muy deficiente", "Baja", "Aceptable", "Buena", "Excelente"]},
          {"key": "elementos_complementarios", "label": "Elementos complementarios", "type": "multiselect", "required": true, "options": ["Cubiertos", "Servilletas", "Salsas y condimentos", "Nota de agradecimiento/Flyer de marca", "Producto Extra/Detalle sorpresa", "No había Servilletas", "No había Cubiertos", "Otros"]},
          {"key": "comentario_packaging", "label": "Comentario sobre la presentación y branding", "type": "text", "required": true}
        ]
      },
      {
        "key": "valoracion_final",
        "title": "Valoración Final",
        "icon": "Star",
        "fields": [
          {"key": "aspectos_positivos", "label": "Aspectos positivos destacados", "type": "text", "required": true, "placeholder": "Lista los puntos fuertes en viñetas"},
          {"key": "aspectos_negativos", "label": "Aspectos negativos destacados", "type": "text", "required": true, "placeholder": "Enumera las principales debilidades"},
          {"key": "acciones_prioritarias", "label": "Acciones prioritarias sugeridas", "type": "text", "required": true, "placeholder": "2-3 acciones con alto impacto"},
          {"key": "valoracion_global", "label": "Valoración global (1–10)", "type": "score", "maxScore": 10, "required": true, "scoreLabels": ["1-2 Muy negativa", "3-4 Deficiente", "5-6 Regular", "7-8 Buena", "9-10 Excelente"]},
          {"key": "nps_recomendacion", "label": "¿Recomendarías este restaurante a un amigo? (0–10)", "type": "score", "maxScore": 10, "required": true}
        ]
      }
    ]
  }'::jsonb
)
ON CONFLICT (slug) DO NOTHING;
