-- ============================================
-- UPDATE: Mystery Shopper Schema con nuevos tipos de campo
-- ============================================

-- Actualizar el schema de Mystery Shopper con los nuevos tipos de campo
UPDATE public.audit_types
SET field_schema = '{
  "sections": [
    {
      "key": "info_general",
      "title": "Información General",
      "icon": "Info",
      "fields": [
        {"key": "marca_evaluar", "label": "Marca a Evaluar", "type": "company_select", "required": true},
        {"key": "consultor_evalua", "label": "Consultor que Evalúa", "type": "user_select", "required": true},
        {"key": "kam_marca", "label": "KAM que gestiona la marca", "type": "user_select", "required": true},
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
        {"key": "fecha_hora_pedido", "label": "Fecha y hora del pedido", "type": "datetime", "required": true},
        {"key": "hora_estimada", "label": "Hora estimada de entrega", "type": "time", "required": true},
        {"key": "precio_pedido", "label": "Precio del pedido (€)", "type": "number", "required": true},
        {"key": "personas_pedido", "label": "¿Para cuántas personas?", "type": "number", "required": true}
      ]
    },
    {
      "key": "tiempos",
      "title": "Tiempos de Entrega",
      "icon": "Clock",
      "fields": [
        {"key": "hora_entrega_real", "label": "Hora exacta de entrega", "type": "time", "required": true},
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
      "key": "evidencias",
      "title": "Evidencias Fotográficas",
      "icon": "Camera",
      "fields": [
        {"key": "fotos_pedido", "label": "Fotos del pedido recibido", "type": "file", "required": true},
        {"key": "fotos_packaging", "label": "Fotos del packaging", "type": "file"},
        {"key": "fotos_producto", "label": "Fotos del producto", "type": "file"},
        {"key": "capturas_app", "label": "Capturas de pantalla de la app", "type": "file"}
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
}'::jsonb,
updated_at = NOW()
WHERE slug = 'mystery_shopper';

-- ============================================
-- NUEVA NOMENCLATURA: TYPE-YYYYMMDD-CLIENT
-- ============================================

-- Agregar columna para código de tipo de auditoría
ALTER TABLE public.audit_types ADD COLUMN IF NOT EXISTS type_code TEXT;

-- Actualizar códigos de tipo
UPDATE public.audit_types SET type_code = 'DEL' WHERE slug = 'delivery';
UPDATE public.audit_types SET type_code = 'GADS' WHERE slug = 'google_ads';
UPDATE public.audit_types SET type_code = 'MS' WHERE slug = 'mystery_shopper';

-- Actualizar la función de generación de número de auditoría
-- Ahora usa formato: TYPE-YYYYMMDD-CLIENT
-- El cliente se pasa como parámetro
CREATE OR REPLACE FUNCTION generate_audit_number(p_type_code TEXT, p_client_name TEXT)
RETURNS TEXT AS $$
DECLARE
  formatted_date TEXT;
  clean_client TEXT;
BEGIN
  -- Fecha en formato YYYYMMDD
  formatted_date := TO_CHAR(NOW(), 'YYYYMMDD');

  -- Limpiar nombre del cliente (quitar espacios, caracteres especiales)
  clean_client := REGEXP_REPLACE(
    REGEXP_REPLACE(p_client_name, '[^a-zA-Z0-9]', '', 'g'),
    '(.{15}).*', '\1'  -- Limitar a 15 caracteres
  );

  -- Si no hay nombre de cliente, usar 'NA'
  IF clean_client = '' OR clean_client IS NULL THEN
    clean_client := 'NA';
  END IF;

  RETURN UPPER(p_type_code) || '-' || formatted_date || '-' || clean_client;
END;
$$ LANGUAGE plpgsql;

-- Eliminar el trigger anterior (ya no es automático)
DROP TRIGGER IF EXISTS trigger_set_audit_number ON public.audits;
DROP FUNCTION IF EXISTS set_audit_number();

-- Nota: El número de auditoría ahora se genera desde el frontend
-- usando la función generate_audit_number con el tipo y cliente
