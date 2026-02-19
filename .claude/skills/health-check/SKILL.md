---
name: health-check
description: Audit app health - build, imports, table references, data consistency
allowed-tools:
  - Bash(npm run build)
  - Bash(npx tsc --noEmit)
  - Grep
  - Glob
  - Read
---

# Health Check - TPHub App Audit

Run a comprehensive health check on the TPHub application to detect issues before they reach production.

## Checks to Perform

### 1. TypeScript Build Check

Run the build and report any errors:

```bash
npm run build
```

If there are errors, list each one with file path and line number. Categorize as:
- **Critical**: Will prevent deployment
- **Warning**: May cause runtime issues

### 2. Legacy Import Detection

Search for imports from legacy data services that should use CRP Portal instead.

**Problematic patterns** - These import from `@/services/supabase-data` or `@/services/data/` for data that lives in CRP Portal tables:

| Legacy Import | Correct Import | CRP Table |
|--------------|----------------|-----------|
| `fetchRestaurants` from `supabase-data` | `fetchCrpRestaurants` from `crp-portal` | `crp_portal__dt_address` |
| `fetchBrands` from `supabase-data` | `fetchCrpBrands` from `crp-portal` | `crp_portal__dt_store` |
| `fetchCompanies` from `supabase-data` | `fetchCrpCompanies` from `crp-portal` | `crp_portal__dt_company` |
| `fetchAreas` from `supabase-data` | `fetchCrpAreas` from `crp-portal` | `crp_portal__dt_business_area` |

Search with:
```
grep -r "from '@/services/supabase-data'" src/ --include="*.ts" --include="*.tsx"
grep -r "from '@/services/data/'" src/ --include="*.ts" --include="*.tsx"
```

For each match, determine if it's:
- **Problem**: Uses legacy service for CRP Portal data (fetchRestaurants, fetchBrands, fetchCompanies, fetchAreas)
- **OK**: Uses legacy service for non-CRP data (fetchStrategicObjectives, createStrategicObjective, etc.)

### 3. Table Reference Verification

Search for Supabase `.from('table_name')` calls and verify each table exists:

**Known valid tables:**
- `crp_portal__dt_company`
- `crp_portal__dt_store`
- `crp_portal__dt_address`
- `crp_portal__dt_business_area`
- `crp_portal__dt_portal`
- `crp_portal__ft_order_head`
- `crp_portal__ft_order_line`
- `crp_portal__dt_restaurant_coordinates`
- `crp_portal__dt_hubspot_contacts`
- `crp_portal__dt_hubspot_company_contacts`
- `strategic_objectives`
- `strategic_tasks`
- `calendar_events`
- `calendar_campaigns`
- `profiles`
- `user_invitations`
- `share_links`
- `audit_log`
- `audits`
- `audit_items`
- `audit_field_values`

**Known invalid tables** (legacy, do not exist in production):
- `restaurants`
- `brands`
- `companies`
- `areas`

Flag any `.from()` call referencing an invalid or unknown table.

### 4. Hook Data Source Consistency

Verify that hooks in each feature use the correct data sources:

| Feature | Should use | Should NOT use |
|---------|-----------|----------------|
| `controlling/hooks/` | `crp-portal` services | `supabase-data` for entities |
| `dashboard/hooks/` | `crp-portal` services | `supabase-data` for entities |
| `calendar/hooks/` | `crp-portal` for entities | `supabase-data` for entities |
| `strategic/hooks/` | `crp-portal` for entities, `supabase-data` for objectives/tasks | `supabase-data` for entities |
| `clients/hooks/` | `crp-portal` services | `supabase-data` for entities |

## Output Format

Present results as a report:

```
## TPHub Health Check Report

### Build Status: PASS / FAIL
[Details if failed]

### Legacy Imports: X issues found
[List each problematic import with file, line, and suggested fix]

### Table References: X issues found
[List each invalid table reference]

### Data Source Consistency: X issues found
[List each inconsistency]

### Summary
- Critical: X
- Warnings: X
- All clear: Y checks passed
```

## Severity Levels

- **Critical**: Will cause runtime errors in production (wrong table, missing import)
- **Warning**: Works but uses deprecated/legacy path (should be migrated)
- **Info**: Suggestion for improvement (no immediate impact)
