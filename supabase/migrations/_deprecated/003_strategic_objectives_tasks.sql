-- ============================================
-- TPHub Supabase Migration: Strategic Objectives & Tasks
-- ============================================
-- This migration creates the OKR system and task management
-- for the Strategic page (/strategic)
-- ============================================

-- ============================================
-- 1. TASK AREAS (Categorías fijas de tareas)
-- ============================================
CREATE TABLE public.task_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT, -- Lucide icon name
  color TEXT, -- Tailwind color class
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default areas
INSERT INTO public.task_areas (name, slug, icon, color, display_order) VALUES
  ('Perfil', 'perfil', 'User', 'blue', 1),
  ('Operaciones', 'operaciones', 'Settings', 'purple', 2),
  ('Finanzas', 'finanzas', 'DollarSign', 'green', 3),
  ('Escandallos', 'escandallos', 'Calculator', 'orange', 4),
  ('Marca', 'marca', 'Award', 'pink', 5),
  ('Packaging', 'packaging', 'Package', 'yellow', 6),
  ('Imágenes', 'imagenes', 'Image', 'cyan', 7),
  ('Menú', 'menu', 'UtensilsCrossed', 'red', 8);

-- ============================================
-- 2. TASK SUBAREAS (Sub-categorías por área)
-- ============================================
CREATE TABLE public.task_subareas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id UUID NOT NULL REFERENCES public.task_areas(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(area_id, slug)
);

-- Insert default subareas for Menú
INSERT INTO public.task_subareas (area_id, name, slug, display_order)
SELECT id, 'Precios', 'precios', 1 FROM public.task_areas WHERE slug = 'menu'
UNION ALL
SELECT id, 'Modificadores', 'modificadores', 2 FROM public.task_areas WHERE slug = 'menu'
UNION ALL
SELECT id, 'Fotos', 'fotos', 3 FROM public.task_areas WHERE slug = 'menu'
UNION ALL
SELECT id, 'Combos', 'combos', 4 FROM public.task_areas WHERE slug = 'menu'
UNION ALL
SELECT id, 'Descripciones', 'descripciones', 5 FROM public.task_areas WHERE slug = 'menu'
UNION ALL
SELECT id, 'SEO', 'seo', 6 FROM public.task_areas WHERE slug = 'menu';

-- Insert default subarea "General" for other areas
INSERT INTO public.task_subareas (area_id, name, slug, display_order)
SELECT id, 'General', 'general', 1 FROM public.task_areas WHERE slug != 'menu';

-- ============================================
-- 3. STRATEGIC OBJECTIVES (Objetivos estratégicos)
-- ============================================
CREATE TYPE objective_horizon AS ENUM ('short', 'medium', 'long');
CREATE TYPE objective_status AS ENUM ('pending', 'in_progress', 'completed');
CREATE TYPE objective_category AS ENUM ('financiero', 'operaciones', 'reputacion', 'marketing', 'otro');

CREATE TABLE public.strategic_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,

  -- Objective details
  title TEXT NOT NULL,
  description TEXT,
  category objective_category NOT NULL DEFAULT 'otro',
  horizon objective_horizon NOT NULL DEFAULT 'short',
  status objective_status NOT NULL DEFAULT 'pending',

  -- KPI linking (optional - for automatic progress)
  kpi_type TEXT, -- e.g., 'total_revenue', 'avg_ticket', 'avg_rating', 'orders_count', 'pickup_time'
  kpi_current_value NUMERIC(12, 2),
  kpi_target_value NUMERIC(12, 2),
  kpi_unit TEXT, -- e.g., '€', 'min', 'stars', '%'

  -- Dates
  evaluation_date DATE, -- When to evaluate this objective
  completed_at TIMESTAMPTZ, -- When it was marked completed

  -- Ordering for drag & drop
  display_order INTEGER NOT NULL DEFAULT 0,

  -- Audit
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_strategic_objectives_restaurant ON public.strategic_objectives(restaurant_id);
CREATE INDEX idx_strategic_objectives_horizon ON public.strategic_objectives(horizon);
CREATE INDEX idx_strategic_objectives_status ON public.strategic_objectives(status);

-- ============================================
-- 4. TASKS (Tareas)
-- ============================================
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,

  -- Task details
  title TEXT NOT NULL,
  description TEXT,
  area_id UUID NOT NULL REFERENCES public.task_areas(id),
  subarea_id UUID NOT NULL REFERENCES public.task_subareas(id),

  -- Assignment
  owner_id UUID REFERENCES public.profiles(id), -- User assigned to this task

  -- Dates
  deadline DATE,
  completed_at TIMESTAMPTZ,

  -- Status
  is_completed BOOLEAN NOT NULL DEFAULT false,

  -- Ordering
  display_order INTEGER NOT NULL DEFAULT 0,

  -- Audit
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_restaurant ON public.tasks(restaurant_id);
CREATE INDEX idx_tasks_area ON public.tasks(area_id);
CREATE INDEX idx_tasks_owner ON public.tasks(owner_id);
CREATE INDEX idx_tasks_completed ON public.tasks(is_completed);

-- ============================================
-- 5. TRIGGERS
-- ============================================

-- Update updated_at for strategic_objectives
CREATE TRIGGER update_strategic_objectives_updated_at
  BEFORE UPDATE ON public.strategic_objectives
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Update updated_at for tasks
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 6. ROW LEVEL SECURITY
-- ============================================

-- Enable RLS
ALTER TABLE public.task_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_subareas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategic_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Task Areas & Subareas: All authenticated users can read
CREATE POLICY "Authenticated users can read task areas"
ON public.task_areas FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read task subareas"
ON public.task_subareas FOR SELECT TO authenticated USING (true);

-- Strategic Objectives: Based on restaurant access
CREATE POLICY "Admins view all objectives"
ON public.strategic_objectives FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

CREATE POLICY "Users view objectives of assigned companies"
ON public.strategic_objectives FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants r
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE r.id = strategic_objectives.restaurant_id
      AND r.company_id = ANY(p.assigned_company_ids)
  )
);

-- Admins and consultants can manage objectives
CREATE POLICY "Admins manage objectives"
ON public.strategic_objectives FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

CREATE POLICY "Consultants manage objectives for assigned companies"
ON public.strategic_objectives FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'consultant'
  )
  AND EXISTS (
    SELECT 1 FROM public.restaurants r
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE r.id = strategic_objectives.restaurant_id
      AND r.company_id = ANY(p.assigned_company_ids)
  )
);

-- Tasks: Same access pattern as objectives
CREATE POLICY "Admins view all tasks"
ON public.tasks FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

CREATE POLICY "Users view tasks of assigned companies"
ON public.tasks FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants r
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE r.id = tasks.restaurant_id
      AND r.company_id = ANY(p.assigned_company_ids)
  )
);

CREATE POLICY "Admins manage tasks"
ON public.tasks FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

CREATE POLICY "Consultants manage tasks for assigned companies"
ON public.tasks FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'consultant'
  )
  AND EXISTS (
    SELECT 1 FROM public.restaurants r
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE r.id = tasks.restaurant_id
      AND r.company_id = ANY(p.assigned_company_ids)
  )
);
