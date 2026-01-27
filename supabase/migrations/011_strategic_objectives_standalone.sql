-- ============================================
-- TPHub: Strategic Objectives - Standalone Migration
-- ============================================
-- Creates strategic_objectives and strategic_tasks tables
-- Uses CRP Portal references (TEXT IDs) instead of internal restaurants table
-- ============================================

-- ============================================
-- 1. CREATE ENUM TYPES (if not exist)
-- ============================================

DO $$ BEGIN
  CREATE TYPE objective_horizon AS ENUM ('short', 'medium', 'long');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE objective_status AS ENUM ('pending', 'in_progress', 'completed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE objective_category AS ENUM (
    'finanzas',
    'operaciones',
    'clientes',
    'marca',
    'reputacion',
    'proveedores',
    'menu'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE objective_responsible AS ENUM ('thinkpaladar', 'cliente', 'ambos', 'plataforma');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 2. CREATE STRATEGIC OBJECTIVES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.strategic_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- CRP Portal references (TEXT because CRP uses numeric IDs)
  company_id TEXT NOT NULL,
  brand_id TEXT,
  address_id TEXT,

  -- Objective details
  title TEXT NOT NULL,
  description TEXT,
  category objective_category NOT NULL DEFAULT 'finanzas',
  objective_type_id TEXT, -- Reference to objectiveConfig types
  horizon objective_horizon NOT NULL DEFAULT 'short',
  status objective_status NOT NULL DEFAULT 'pending',
  responsible objective_responsible NOT NULL DEFAULT 'thinkpaladar',

  -- KPI tracking (legacy - kept for compatibility)
  kpi_type TEXT,
  kpi_current_value NUMERIC(12, 2),
  kpi_target_value NUMERIC(12, 2),
  kpi_unit TEXT,

  -- Dynamic field data (JSON for type-specific fields)
  field_data JSONB,

  -- Dates
  evaluation_date DATE,
  completed_at TIMESTAMPTZ,

  -- Ordering for drag & drop
  display_order INTEGER NOT NULL DEFAULT 0,

  -- Audit
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_strategic_objectives_company ON public.strategic_objectives(company_id);
CREATE INDEX IF NOT EXISTS idx_strategic_objectives_brand ON public.strategic_objectives(brand_id);
CREATE INDEX IF NOT EXISTS idx_strategic_objectives_address ON public.strategic_objectives(address_id);
CREATE INDEX IF NOT EXISTS idx_strategic_objectives_horizon ON public.strategic_objectives(horizon);
CREATE INDEX IF NOT EXISTS idx_strategic_objectives_status ON public.strategic_objectives(status);
CREATE INDEX IF NOT EXISTS idx_strategic_objectives_category ON public.strategic_objectives(category);

-- ============================================
-- 3. CREATE STRATEGIC TASKS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.strategic_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to objective (optional - tasks can be standalone)
  objective_id UUID REFERENCES public.strategic_objectives(id) ON DELETE CASCADE,

  -- CRP Portal references
  company_id TEXT,
  brand_id TEXT,
  address_id TEXT,

  -- Task details
  title TEXT NOT NULL,
  description TEXT,
  responsible objective_responsible NOT NULL DEFAULT 'thinkpaladar',

  -- Assignment
  owner_id UUID, -- Reference to profiles (not enforced for flexibility)

  -- Dates
  deadline DATE,
  completed_at TIMESTAMPTZ,

  -- Status
  is_completed BOOLEAN NOT NULL DEFAULT false,

  -- Ordering
  display_order INTEGER NOT NULL DEFAULT 0,

  -- Audit
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_strategic_tasks_objective ON public.strategic_tasks(objective_id);
CREATE INDEX IF NOT EXISTS idx_strategic_tasks_company ON public.strategic_tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_strategic_tasks_owner ON public.strategic_tasks(owner_id);
CREATE INDEX IF NOT EXISTS idx_strategic_tasks_deadline ON public.strategic_tasks(deadline);
CREATE INDEX IF NOT EXISTS idx_strategic_tasks_completed ON public.strategic_tasks(is_completed);

-- ============================================
-- 4. CREATE UPDATE TRIGGER FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. ATTACH TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS update_strategic_objectives_updated_at ON public.strategic_objectives;
CREATE TRIGGER update_strategic_objectives_updated_at
  BEFORE UPDATE ON public.strategic_objectives
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_strategic_tasks_updated_at ON public.strategic_tasks;
CREATE TRIGGER update_strategic_tasks_updated_at
  BEFORE UPDATE ON public.strategic_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 6. ROW LEVEL SECURITY
-- ============================================

-- Enable RLS
ALTER TABLE public.strategic_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategic_tasks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow all strategic_objectives" ON public.strategic_objectives;
DROP POLICY IF EXISTS "Allow all strategic_tasks" ON public.strategic_tasks;

-- Simple permissive policies (for now - can be tightened later)
CREATE POLICY "Allow all strategic_objectives" ON public.strategic_objectives
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all strategic_tasks" ON public.strategic_tasks
FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 7. COMMENTS
-- ============================================

COMMENT ON TABLE public.strategic_objectives IS 'Strategic objectives for CRP Portal companies/brands/addresses';
COMMENT ON COLUMN public.strategic_objectives.company_id IS 'CRP Portal company ID (pk_id_company as TEXT)';
COMMENT ON COLUMN public.strategic_objectives.brand_id IS 'CRP Portal brand/store ID (pk_id_store as TEXT)';
COMMENT ON COLUMN public.strategic_objectives.address_id IS 'CRP Portal address ID (pk_id_address as TEXT)';
COMMENT ON COLUMN public.strategic_objectives.field_data IS 'Dynamic field data based on objective_type_id';

COMMENT ON TABLE public.strategic_tasks IS 'Tasks linked to strategic objectives';
COMMENT ON COLUMN public.strategic_tasks.objective_id IS 'Optional link to parent objective';
