-- ============================================
-- Migration: Tighten COMPSET RLS to company-scoped
-- Date: 2026-03-01
-- Purpose: Replace 8 permissive "authenticated USING (true)" policies
--          with company-scoped SELECT and admin-only write policies.
--
-- CONTEXT:
--   The original compset_tables migration (20260218110000) created
--   permissive policies that let any authenticated user read/write
--   all competitor data regardless of company assignment.
--   This migration enforces company-scoped access using
--   get_user_company_ids() (created in 20260225_enable_rls_all_tables).
--
-- HOW IT WORKS:
--   - SELECT: Consultants see only competitors belonging to their assigned companies.
--             Admins/owners/superadmins see everything (get_user_company_ids() returns NULL).
--   - INSERT/UPDATE/DELETE: Only admin/superadmin/owner roles, with company scope validation.
--   - Sub-tables (snapshots, products, promotions): Scoped via competitor_id FK lookup.
--
-- ROLLBACK: See bottom of file.
-- ============================================

BEGIN;

-- ============================================
-- PART 1: Drop existing permissive policies
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can read competitors" ON compset_competitors;
DROP POLICY IF EXISTS "Authenticated users can manage competitors" ON compset_competitors;
DROP POLICY IF EXISTS "Authenticated users can read snapshots" ON compset_snapshots;
DROP POLICY IF EXISTS "Authenticated users can insert snapshots" ON compset_snapshots;
DROP POLICY IF EXISTS "Authenticated users can read products" ON compset_products;
DROP POLICY IF EXISTS "Authenticated users can manage products" ON compset_products;
DROP POLICY IF EXISTS "Authenticated users can read promotions" ON compset_promotions;
DROP POLICY IF EXISTS "Authenticated users can manage promotions" ON compset_promotions;

-- ============================================
-- PART 2: compset_competitors (company-scoped)
-- ============================================

-- SELECT: company-scoped
CREATE POLICY "Company-scoped read: compset_competitors"
  ON compset_competitors
  FOR SELECT
  TO authenticated
  USING (
    public.get_user_company_ids() IS NULL
    OR company_id = ANY(public.get_user_company_ids())
  );

-- INSERT: admin+ with company scope
CREATE POLICY "Admin write: compset_competitors INSERT"
  ON compset_competitors
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('owner', 'superadmin', 'admin')
    )
    AND (
      public.get_user_company_ids() IS NULL
      OR company_id = ANY(public.get_user_company_ids())
    )
  );

-- UPDATE: admin+ with company scope
CREATE POLICY "Admin write: compset_competitors UPDATE"
  ON compset_competitors
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('owner', 'superadmin', 'admin')
    )
    AND (
      public.get_user_company_ids() IS NULL
      OR company_id = ANY(public.get_user_company_ids())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('owner', 'superadmin', 'admin')
    )
    AND (
      public.get_user_company_ids() IS NULL
      OR company_id = ANY(public.get_user_company_ids())
    )
  );

-- DELETE: admin+ with company scope
CREATE POLICY "Admin write: compset_competitors DELETE"
  ON compset_competitors
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('owner', 'superadmin', 'admin')
    )
    AND (
      public.get_user_company_ids() IS NULL
      OR company_id = ANY(public.get_user_company_ids())
    )
  );

-- ============================================
-- PART 3: compset_snapshots (via competitor FK)
-- ============================================

-- SELECT: scoped via competitor's company_id
CREATE POLICY "Company-scoped read: compset_snapshots"
  ON compset_snapshots
  FOR SELECT
  TO authenticated
  USING (
    public.get_user_company_ids() IS NULL
    OR competitor_id IN (
      SELECT id FROM compset_competitors
      WHERE company_id = ANY(public.get_user_company_ids())
    )
  );

-- INSERT: admin+ with company scope via competitor FK
CREATE POLICY "Admin write: compset_snapshots INSERT"
  ON compset_snapshots
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('owner', 'superadmin', 'admin')
    )
    AND (
      public.get_user_company_ids() IS NULL
      OR competitor_id IN (
        SELECT id FROM compset_competitors
        WHERE company_id = ANY(public.get_user_company_ids())
      )
    )
  );

-- UPDATE: admin+ with company scope
CREATE POLICY "Admin write: compset_snapshots UPDATE"
  ON compset_snapshots
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('owner', 'superadmin', 'admin')
    )
    AND (
      public.get_user_company_ids() IS NULL
      OR competitor_id IN (
        SELECT id FROM compset_competitors
        WHERE company_id = ANY(public.get_user_company_ids())
      )
    )
  );

-- DELETE: admin+ with company scope
CREATE POLICY "Admin write: compset_snapshots DELETE"
  ON compset_snapshots
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('owner', 'superadmin', 'admin')
    )
    AND (
      public.get_user_company_ids() IS NULL
      OR competitor_id IN (
        SELECT id FROM compset_competitors
        WHERE company_id = ANY(public.get_user_company_ids())
      )
    )
  );

-- ============================================
-- PART 4: compset_products (via competitor FK)
-- ============================================

-- SELECT: scoped via competitor's company_id
CREATE POLICY "Company-scoped read: compset_products"
  ON compset_products
  FOR SELECT
  TO authenticated
  USING (
    public.get_user_company_ids() IS NULL
    OR competitor_id IN (
      SELECT id FROM compset_competitors
      WHERE company_id = ANY(public.get_user_company_ids())
    )
  );

-- INSERT: admin+ with company scope
CREATE POLICY "Admin write: compset_products INSERT"
  ON compset_products
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('owner', 'superadmin', 'admin')
    )
    AND (
      public.get_user_company_ids() IS NULL
      OR competitor_id IN (
        SELECT id FROM compset_competitors
        WHERE company_id = ANY(public.get_user_company_ids())
      )
    )
  );

-- UPDATE: admin+ with company scope
CREATE POLICY "Admin write: compset_products UPDATE"
  ON compset_products
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('owner', 'superadmin', 'admin')
    )
    AND (
      public.get_user_company_ids() IS NULL
      OR competitor_id IN (
        SELECT id FROM compset_competitors
        WHERE company_id = ANY(public.get_user_company_ids())
      )
    )
  );

-- DELETE: admin+ with company scope
CREATE POLICY "Admin write: compset_products DELETE"
  ON compset_products
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('owner', 'superadmin', 'admin')
    )
    AND (
      public.get_user_company_ids() IS NULL
      OR competitor_id IN (
        SELECT id FROM compset_competitors
        WHERE company_id = ANY(public.get_user_company_ids())
      )
    )
  );

-- ============================================
-- PART 5: compset_promotions (via competitor FK)
-- ============================================

-- SELECT: scoped via competitor's company_id
CREATE POLICY "Company-scoped read: compset_promotions"
  ON compset_promotions
  FOR SELECT
  TO authenticated
  USING (
    public.get_user_company_ids() IS NULL
    OR competitor_id IN (
      SELECT id FROM compset_competitors
      WHERE company_id = ANY(public.get_user_company_ids())
    )
  );

-- INSERT: admin+ with company scope
CREATE POLICY "Admin write: compset_promotions INSERT"
  ON compset_promotions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('owner', 'superadmin', 'admin')
    )
    AND (
      public.get_user_company_ids() IS NULL
      OR competitor_id IN (
        SELECT id FROM compset_competitors
        WHERE company_id = ANY(public.get_user_company_ids())
      )
    )
  );

-- UPDATE: admin+ with company scope
CREATE POLICY "Admin write: compset_promotions UPDATE"
  ON compset_promotions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('owner', 'superadmin', 'admin')
    )
    AND (
      public.get_user_company_ids() IS NULL
      OR competitor_id IN (
        SELECT id FROM compset_competitors
        WHERE company_id = ANY(public.get_user_company_ids())
      )
    )
  );

-- DELETE: admin+ with company scope
CREATE POLICY "Admin write: compset_promotions DELETE"
  ON compset_promotions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('owner', 'superadmin', 'admin')
    )
    AND (
      public.get_user_company_ids() IS NULL
      OR competitor_id IN (
        SELECT id FROM compset_competitors
        WHERE company_id = ANY(public.get_user_company_ids())
      )
    )
  );

COMMIT;


-- ============================================
-- ROLLBACK (run manually if something breaks)
-- ============================================
-- Copy-paste this entire block into Supabase SQL Editor:
--
-- BEGIN;
--
-- -- Drop new policies
-- DROP POLICY IF EXISTS "Company-scoped read: compset_competitors" ON compset_competitors;
-- DROP POLICY IF EXISTS "Admin write: compset_competitors INSERT" ON compset_competitors;
-- DROP POLICY IF EXISTS "Admin write: compset_competitors UPDATE" ON compset_competitors;
-- DROP POLICY IF EXISTS "Admin write: compset_competitors DELETE" ON compset_competitors;
-- DROP POLICY IF EXISTS "Company-scoped read: compset_snapshots" ON compset_snapshots;
-- DROP POLICY IF EXISTS "Admin write: compset_snapshots INSERT" ON compset_snapshots;
-- DROP POLICY IF EXISTS "Admin write: compset_snapshots UPDATE" ON compset_snapshots;
-- DROP POLICY IF EXISTS "Admin write: compset_snapshots DELETE" ON compset_snapshots;
-- DROP POLICY IF EXISTS "Company-scoped read: compset_products" ON compset_products;
-- DROP POLICY IF EXISTS "Admin write: compset_products INSERT" ON compset_products;
-- DROP POLICY IF EXISTS "Admin write: compset_products UPDATE" ON compset_products;
-- DROP POLICY IF EXISTS "Admin write: compset_products DELETE" ON compset_products;
-- DROP POLICY IF EXISTS "Company-scoped read: compset_promotions" ON compset_promotions;
-- DROP POLICY IF EXISTS "Admin write: compset_promotions INSERT" ON compset_promotions;
-- DROP POLICY IF EXISTS "Admin write: compset_promotions UPDATE" ON compset_promotions;
-- DROP POLICY IF EXISTS "Admin write: compset_promotions DELETE" ON compset_promotions;
--
-- -- Restore original permissive policies
-- CREATE POLICY "Authenticated users can read competitors"
--   ON compset_competitors FOR SELECT TO authenticated USING (true);
-- CREATE POLICY "Authenticated users can manage competitors"
--   ON compset_competitors FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- CREATE POLICY "Authenticated users can read snapshots"
--   ON compset_snapshots FOR SELECT TO authenticated USING (true);
-- CREATE POLICY "Authenticated users can insert snapshots"
--   ON compset_snapshots FOR INSERT TO authenticated WITH CHECK (true);
-- CREATE POLICY "Authenticated users can read products"
--   ON compset_products FOR SELECT TO authenticated USING (true);
-- CREATE POLICY "Authenticated users can manage products"
--   ON compset_products FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- CREATE POLICY "Authenticated users can read promotions"
--   ON compset_promotions FOR SELECT TO authenticated USING (true);
-- CREATE POLICY "Authenticated users can manage promotions"
--   ON compset_promotions FOR ALL TO authenticated USING (true) WITH CHECK (true);
--
-- COMMIT;
