-- ============================================
-- AUDITORÍAS - Versión standalone para testing
-- ============================================

-- Tabla de tipos de auditoría
CREATE TABLE public.audit_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  field_schema JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla principal de auditorías (sin FKs por ahora)
CREATE TABLE public.audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_number TEXT UNIQUE NOT NULL,
  company_id UUID,
  restaurant_id UUID,
  area_id UUID,
  audit_type_id UUID NOT NULL REFERENCES public.audit_types(id),
  field_data JSONB,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed')),
  scheduled_date DATE,
  completed_at TIMESTAMPTZ,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_audits_type ON public.audits(audit_type_id);
CREATE INDEX idx_audits_status ON public.audits(status);
CREATE INDEX idx_audits_number ON public.audits(audit_number);
CREATE INDEX idx_audit_types_slug ON public.audit_types(slug);

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
  SELECT COALESCE(MAX(CAST(SPLIT_PART(audit_number, '-', 3) AS INTEGER)), 0) + 1
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

CREATE TRIGGER trigger_set_audit_number
  BEFORE INSERT ON public.audits
  FOR EACH ROW EXECUTE FUNCTION set_audit_number();

-- ============================================
-- RLS POLICIES (permisivas para testing)
-- ============================================

ALTER TABLE public.audit_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all audit_types" ON public.audit_types FOR ALL USING (true);
CREATE POLICY "Allow all audits" ON public.audits FOR ALL USING (true);

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
        "icon": "Info",
        "fields": [
          {"key": "platforms_active", "label": "Plataformas activas", "type": "multiselect", "options": ["Glovo", "UberEats", "JustEat"], "required": true},
          {"key": "account_manager", "label": "Account Manager asignado", "type": "text"}
        ]
      },
      {
        "key": "profile",
        "title": "Perfil del Restaurante",
        "icon": "Store",
        "fields": [
          {"key": "logo_quality", "label": "Calidad del logo", "type": "score", "maxScore": 5, "scoreLabels": ["Muy baja", "Baja", "Aceptable", "Buena", "Excelente"]},
          {"key": "cover_photo", "label": "Foto de portada atractiva", "type": "checkbox"},
          {"key": "description_complete", "label": "Descripción completa", "type": "checkbox"},
          {"key": "schedule_updated", "label": "Horarios actualizados", "type": "checkbox"},
          {"key": "contact_info", "label": "Información de contacto correcta", "type": "checkbox"}
        ]
      },
      {
        "key": "menu",
        "title": "Carta y Productos",
        "icon": "UtensilsCrossed",
        "fields": [
          {"key": "photos_quality", "label": "Calidad de fotos de productos", "type": "score", "maxScore": 5, "scoreLabels": ["Muy baja", "Baja", "Aceptable", "Buena", "Profesional"]},
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
        "icon": "Settings",
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
        "icon": "Megaphone",
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
        "icon": "FileText",
        "fields": [
          {"key": "strengths", "label": "Puntos fuertes", "type": "text", "placeholder": "Lista los aspectos positivos"},
          {"key": "improvements", "label": "Áreas de mejora", "type": "text", "placeholder": "Lista las áreas a mejorar"},
          {"key": "action_plan", "label": "Plan de acción recomendado", "type": "text", "placeholder": "Próximos pasos sugeridos"}
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
        "icon": "User",
        "fields": [
          {"key": "account_id", "label": "ID de cuenta", "type": "text", "required": true},
          {"key": "account_access", "label": "Acceso a la cuenta", "type": "checkbox"},
          {"key": "billing_setup", "label": "Facturación configurada", "type": "checkbox"},
          {"key": "conversion_tracking", "label": "Seguimiento de conversiones activo", "type": "checkbox"}
        ]
      },
      {
        "key": "campaigns",
        "title": "Campañas",
        "icon": "Target",
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
        "icon": "Search",
        "fields": [
          {"key": "keyword_relevance", "label": "Relevancia de palabras clave", "type": "score", "maxScore": 5},
          {"key": "negative_keywords", "label": "Palabras clave negativas configuradas", "type": "checkbox"},
          {"key": "match_types", "label": "Tipos de concordancia adecuados", "type": "checkbox"},
          {"key": "quality_score_avg", "label": "Quality Score promedio (1-10)", "type": "number"}
        ]
      },
      {
        "key": "performance",
        "title": "Rendimiento",
        "icon": "TrendingUp",
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
        "icon": "Lightbulb",
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
          {"key": "marca_evaluar", "label": "Marca a Evaluar", "type": "text", "required": true, "placeholder": "Nombre exacto del restaurante"},
          {"key": "consultor_evalua", "label": "Consultor que Evalúa", "type": "text", "required": true},
          {"key": "kam_marca", "label": "KAM que gestiona la marca", "type": "text", "required": true},
          {"key": "plataforma", "label": "Plataforma del pedido", "type": "select", "options": ["Glovo", "Uber Eats", "JustEat", "Canal Propio"], "required": true}
        ]
      },
      {
        "key": "visibilidad_feed",
        "title": "Visibilidad en Feed",
        "icon": "Eye",
        "fields": [
          {"key": "visibilidad_restaurante", "label": "¿Qué tan visible aparece el restaurante?", "type": "multiselect", "required": true, "options": ["Primera pantalla", "Segunda Pantalla", "Tercera Pantalla", "Últimas posiciones", "No aparece"]},
          {"key": "competidores_cerca", "label": "¿Qué competidores aparecen cerca?", "type": "text", "required": true, "placeholder": "Lista 2 antes y 2 después"}
        ]
      },
      {
        "key": "evaluacion_visual",
        "title": "Evaluación Visual del Perfil",
        "icon": "Image",
        "fields": [
          {"key": "atractivo_portada", "label": "Atractivo visual de la portada", "type": "score", "maxScore": 5, "required": true, "scoreLabels": ["Foto de archivo", "Poco atractiva", "Correcta", "Atractiva", "Profesional"]},
          {"key": "atractivo_menu", "label": "Atractivo visual de fotos del menú", "type": "score", "maxScore": 5, "required": true, "scoreLabels": ["No apetecibles", "Mejorables", "Estándar", "Atractivas", "Profesionales"]},
          {"key": "problemas_visuales", "label": "Problemas visuales detectados", "type": "multiselect", "required": true, "options": ["Iluminación deficiente", "Falta coherencia", "Imágenes duplicadas", "Mala lógica de modificadores", "Categorías desordenadas", "Imágenes borrosas", "Falta logo", "Falta descripción", "Sin problemas"]},
          {"key": "coherencia_marca", "label": "Coherencia visual y de marca", "type": "score", "maxScore": 5, "required": true, "scoreLabels": ["Sin coherencia", "Baja", "Normal", "Buena", "Excelente"]},
          {"key": "seo_naming", "label": "SEO/Naming de productos", "type": "score", "maxScore": 5, "required": true, "scoreLabels": ["Inexistente", "Pobre", "Adecuado", "Bueno", "Excelente"]}
        ]
      },
      {
        "key": "experiencia_pedido",
        "title": "Experiencia de Pedido",
        "icon": "ShoppingCart",
        "fields": [
          {"key": "friccion_pedido", "label": "Fricción al realizar el pedido", "type": "multiselect", "required": true, "options": ["Menú lento", "Modificadores confusos", "Precios poco visibles", "Fotos no cargan", "Orden ilógico", "Descripciones confusas", "Sin fricción"]},
          {"key": "calidad_modificadores", "label": "Calidad de modificadores/extras", "type": "score", "maxScore": 5, "required": true, "scoreLabels": ["Inexistentes", "Mínimos", "Incompletos", "Correctos", "Profesionales"]},
          {"key": "sugerencias_mejora", "label": "Sugerencias de mejora", "type": "text", "placeholder": "Mejoras sobre fotos, estructura, naming o pricing"},
          {"key": "precios_coherentes", "label": "¿Precios claros y coherentes?", "type": "score", "maxScore": 5, "required": true, "scoreLabels": ["Muy confusos", "Poco claros", "Normal", "Claros", "Muy claros"]},
          {"key": "precios_vs_competencia", "label": "Precios vs competencia", "type": "select", "required": true, "options": ["Más bajos", "Similares", "Más altos"]}
        ]
      },
      {
        "key": "promociones",
        "title": "Promociones",
        "icon": "Percent",
        "fields": [
          {"key": "promos_activas", "label": "¿Promociones activas visibles?", "type": "multiselect", "required": true, "options": ["Descuento directo", "Envío gratis", "2x1 / Combo", "Banner promocional", "Otras", "Sin promociones"]},
          {"key": "decision_influida_promo", "label": "¿La promoción influyó en la compra?", "type": "select", "required": true, "options": ["1 - No influyó", "2 - Poco", "3 - Parcialmente", "4 - Bastante", "5 - Determinante", "No había promoción"]},
          {"key": "depende_promociones", "label": "¿Depende de promociones?", "type": "score", "maxScore": 5, "required": true, "scoreLabels": ["Nada", "Poco", "Moderado", "Bastante", "Siempre con descuentos"]},
          {"key": "volveria_sin_descuento", "label": "¿Volverías sin descuento?", "type": "select", "required": true, "options": ["1 - No volvería", "2 - Solo con promo", "3 - Quizá", "4 - Sí", "5 - Seguro"]}
        ]
      },
      {
        "key": "info_pedido",
        "title": "Información del Pedido",
        "icon": "Receipt",
        "fields": [
          {"key": "fecha_pedido", "label": "Fecha del pedido", "type": "text", "required": true, "placeholder": "DD/MM/YYYY"},
          {"key": "hora_estimada", "label": "Hora estimada de entrega", "type": "text", "required": true, "placeholder": "ej: 20-30min"},
          {"key": "precio_pedido", "label": "Precio del pedido (€)", "type": "number", "required": true},
          {"key": "personas_pedido", "label": "¿Para cuántas personas?", "type": "number", "required": true}
        ]
      },
      {
        "key": "tiempos",
        "title": "Tiempos de Entrega",
        "icon": "Clock",
        "fields": [
          {"key": "hora_entrega_real", "label": "Hora exacta de entrega", "type": "text", "required": true, "placeholder": "ej: 13:50h"},
          {"key": "diferencia_minutos", "label": "Diferencia total (minutos)", "type": "number", "required": true},
          {"key": "tiempo_razonable", "label": "¿Tiempo razonable?", "type": "score", "maxScore": 5, "required": true, "scoreLabels": ["Nada razonable", "Poco", "Estándar", "Más rápido", "Mucho más rápido"]},
          {"key": "comentario_operativo", "label": "Comentario operativo", "type": "text", "required": true, "placeholder": "Retrasos, incidencias, etc."}
        ]
      },
      {
        "key": "evaluacion_producto",
        "title": "Evaluación del Producto",
        "icon": "Utensils",
        "fields": [
          {"key": "coincidencia_visual", "label": "Coincidencia con la foto", "type": "score", "maxScore": 5, "required": true, "scoreLabels": ["No coincide", "Poco", "Parcialmente", "Coincide", "Exacta"]},
          {"key": "comentario_coherencia", "label": "Comentario coherencia visual", "type": "text", "required": true, "placeholder": "SC si no hay nada"},
          {"key": "temperatura_recibido", "label": "Temperatura al recibir", "type": "score", "maxScore": 5, "required": true, "scoreLabels": ["Muy fría", "Fría", "Templado", "Caliente", "Muy caliente"]},
          {"key": "relacion_calidad_precio", "label": "Relación calidad-precio", "type": "score", "maxScore": 5, "required": true, "scoreLabels": ["Muy baja", "Baja", "Aceptable", "Alta", "Muy alta"]},
          {"key": "calidad_organoleptica", "label": "Calidad organoléptica", "type": "score", "maxScore": 5, "required": true, "scoreLabels": ["Deficiente", "Baja", "Aceptable", "Buena", "Excelente"]},
          {"key": "comentario_cata", "label": "Comentario de la cata", "type": "text", "required": true}
        ]
      },
      {
        "key": "packaging",
        "title": "Packaging",
        "icon": "Package",
        "fields": [
          {"key": "estado_packaging", "label": "Estado general", "type": "score", "maxScore": 5, "required": true, "scoreLabels": ["Deficiente", "Bajo", "Aceptable", "Bueno", "Excelente"]},
          {"key": "personalizacion_marca", "label": "Personalización de marca", "type": "score", "maxScore": 5, "required": true, "scoreLabels": ["Nula", "Baja", "Correcta", "Buena", "Excelente"]},
          {"key": "funcionalidad_packaging", "label": "Funcionalidad y usabilidad", "type": "score", "maxScore": 5, "required": true, "scoreLabels": ["Deficiente", "Baja", "Aceptable", "Buena", "Excelente"]},
          {"key": "elementos_complementarios", "label": "Elementos incluidos", "type": "multiselect", "required": true, "options": ["Cubiertos", "Servilletas", "Salsas", "Nota/Flyer", "Detalle sorpresa", "Falta servilletas", "Falta cubiertos"]},
          {"key": "comentario_packaging", "label": "Comentario packaging", "type": "text", "required": true}
        ]
      },
      {
        "key": "valoracion_final",
        "title": "Valoración Final",
        "icon": "Star",
        "fields": [
          {"key": "aspectos_positivos", "label": "Aspectos positivos", "type": "text", "required": true, "placeholder": "Puntos fuertes destacados"},
          {"key": "aspectos_negativos", "label": "Aspectos negativos", "type": "text", "required": true, "placeholder": "Principales debilidades"},
          {"key": "acciones_prioritarias", "label": "Acciones prioritarias", "type": "text", "required": true, "placeholder": "2-3 acciones de alto impacto"},
          {"key": "valoracion_global", "label": "Valoración global (1-10)", "type": "score", "maxScore": 10, "required": true},
          {"key": "nps_recomendacion", "label": "¿Recomendarías? (0-10)", "type": "score", "maxScore": 10, "required": true}
        ]
      }
    ]
  }'::jsonb
);
