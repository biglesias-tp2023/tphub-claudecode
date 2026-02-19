---
name: migration
description: Create a Supabase migration with RLS, indices, and triggers
---

# Create Supabase Migration

Generate a Supabase SQL migration file following TPHub conventions.

## User Input Required

Ask the user for:
1. **Table name** (snake_case)
2. **Columns and types**
3. **RLS policy type**: permissive (all authenticated), admin-only, or company-scoped
4. **Any relationships** (FKs to other tables)

## File Naming Convention

```
supabase/migrations/YYYYMMDD_description.sql
```

Use today's date. Examples:
- `20260219_create_menu_items.sql`
- `20260219_add_scoring_to_audits.sql`

## Template

```sql
-- ============================================================
-- Migration: {description}
-- Date: {YYYY-MM-DD}
-- ============================================================

-- 1. Create enum types (if needed, with guard)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '{enum_name}') THEN
    CREATE TYPE {enum_name} AS ENUM ('value1', 'value2', 'value3');
  END IF;
END $$;

-- 2. Create table
CREATE TABLE IF NOT EXISTS {table_name} (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Business columns
  {columns}

  -- JSONB for extensible data (if needed)
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. updated_at trigger
CREATE OR REPLACE FUNCTION update_{table_name}_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_{table_name}_updated_at
  BEFORE UPDATE ON {table_name}
  FOR EACH ROW
  EXECUTE FUNCTION update_{table_name}_updated_at();

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_{table_name}_{column} ON {table_name}({column});

-- 5. Enable RLS
ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies (choose pattern below)
```

## RLS Policy Patterns

### Pattern A: Permissive (all authenticated users)

Used for: shared reference data, non-sensitive tables.

```sql
CREATE POLICY "{table}_authenticated_all"
  ON {table_name} FOR ALL
  TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "{table}_anon_deny"
  ON {table_name} FOR ALL
  TO anon
  USING (false);
```

### Pattern B: Admin-only write, authenticated read

Used for: config tables, audit types.

```sql
-- Read: all authenticated
CREATE POLICY "{table}_authenticated_select"
  ON {table_name} FOR SELECT
  TO authenticated
  USING (true);

-- Write: admin+ only (uses helper function)
CREATE POLICY "{table}_admin_insert"
  ON {table_name} FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('owner', 'superadmin', 'admin')
    )
  );

CREATE POLICY "{table}_admin_update"
  ON {table_name} FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('owner', 'superadmin', 'admin')
    )
  );

CREATE POLICY "{table}_admin_delete"
  ON {table_name} FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('owner', 'superadmin', 'admin')
    )
  );

CREATE POLICY "{table}_anon_deny"
  ON {table_name} FOR ALL
  TO anon
  USING (false);
```

### Pattern C: Company-scoped

Used for: data that belongs to specific companies (objectives, audits).

```sql
-- Users see data for their assigned companies
CREATE POLICY "{table}_company_select"
  ON {table_name} FOR SELECT
  TO authenticated
  USING (
    company_id::int = ANY(
      SELECT unnest(company_ids) FROM public.profiles WHERE id = auth.uid()
    )
    OR public.get_current_user_role() IN ('owner', 'superadmin', 'admin')
  );
```

## CRP Portal References

When the table references CRP Portal entities, use TEXT columns (not FKs):

```sql
company_id TEXT NOT NULL,   -- CRP Portal company ID
brand_id TEXT,              -- CRP Portal brand/store ID (optional)
address_id TEXT,            -- CRP Portal address ID (optional)
```

These are TEXT because CRP Portal IDs come from an external system and don't have FK relationships in Supabase.

## Reference Migrations

Study these existing migrations for patterns:
- `supabase/migrations/20260218_compset_tables.sql` - Multi-table with indexes and RLS
- `supabase/migrations/20260212164704_roles_invitations_rls.sql` - Complex RLS with helper functions
- `supabase/migrations/20260213_security_audit_log.sql` - Audit logging, constraints, rate limiting

## Checklist

After creating the migration:
1. Review the SQL for syntax errors
2. Ensure RLS is enabled and policies cover all operations (SELECT, INSERT, UPDATE, DELETE)
3. Ensure anon role is explicitly denied
4. Add appropriate indexes for query patterns
5. Tell the user to run the migration in Supabase SQL Editor
