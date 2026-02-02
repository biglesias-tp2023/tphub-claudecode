-- ============================================
-- STRATEGIC TASKS - Migration 004
-- Auto-generated and manual tasks linked to strategic objectives
-- ============================================

-- Drop existing table and triggers if they exist
DROP TRIGGER IF EXISTS update_strategic_tasks_updated_at ON public.strategic_tasks;
DROP TABLE IF EXISTS public.strategic_tasks;

-- Create strategic_tasks table
CREATE TABLE public.strategic_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id UUID NOT NULL REFERENCES public.strategic_objectives(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,

  -- Task details
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- Same category as the objective

  -- Assignment
  responsible TEXT NOT NULL DEFAULT 'thinkpaladar',
  assignee_id UUID REFERENCES public.profiles(id), -- ThinkPaladar user assigned
  client_name TEXT, -- For client tasks (show initials)

  -- Scheduling
  deadline TIMESTAMPTZ,

  -- Status
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,

  -- Traceability
  is_auto_generated BOOLEAN NOT NULL DEFAULT true,
  template_key TEXT, -- Reference to template used

  -- Ordering
  display_order INTEGER NOT NULL DEFAULT 0,

  -- Audit
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comment
COMMENT ON TABLE public.strategic_tasks IS 'Tasks linked to strategic objectives, can be auto-generated from templates or manually created';

-- Create indexes for common queries
CREATE INDEX idx_strategic_tasks_objective ON public.strategic_tasks(objective_id);
CREATE INDEX idx_strategic_tasks_restaurant ON public.strategic_tasks(restaurant_id);
CREATE INDEX idx_strategic_tasks_deadline ON public.strategic_tasks(deadline);
CREATE INDEX idx_strategic_tasks_assignee ON public.strategic_tasks(assignee_id);
CREATE INDEX idx_strategic_tasks_completed ON public.strategic_tasks(is_completed);
CREATE INDEX idx_strategic_tasks_category ON public.strategic_tasks(category);

-- Trigger for updated_at
CREATE TRIGGER update_strategic_tasks_updated_at
  BEFORE UPDATE ON public.strategic_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.strategic_tasks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view tasks for restaurants in their assigned companies
CREATE POLICY "Users view tasks of assigned companies"
ON public.strategic_tasks FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.restaurants r
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE r.id = strategic_tasks.restaurant_id
      AND (p.role = 'admin' OR r.company_id = ANY(p.assigned_company_ids))
  )
);

-- Policy: Admins and consultants can manage tasks
CREATE POLICY "Admins and consultants manage tasks"
ON public.strategic_tasks FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'consultant')
  )
);

CREATE POLICY "Admins and consultants update tasks"
ON public.strategic_tasks FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'consultant')
  )
);

CREATE POLICY "Admins and consultants delete tasks"
ON public.strategic_tasks FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'consultant')
  )
);

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.strategic_tasks TO authenticated;
