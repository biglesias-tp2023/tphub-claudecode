---
name: new-audit-type
description: Create a new audit type following the Mystery Shopper / Onboarding pattern
---

# Create New Audit Type

Scaffold a new audit type for TPHub following the established patterns from Mystery Shopper and Onboarding audits.

## User Input Required

Ask the user for:
1. **Audit name** (e.g., "Google Ads Audit", "Menu Analysis")
2. **Slug** (e.g., `google_ads`, `menu_analysis`)
3. **Code** for nomenclature (e.g., `GADS`, `MA`)
4. **Icon** from Lucide (e.g., `BarChart3`, `UtensilsCrossed`)
5. **Color** (e.g., `text-orange-600`)
6. **Sections and fields** - or ask the user for a description and propose a schema

## Files to Create/Modify

### 1. Schema file: `src/features/audits/config/{slug}Schema.ts`

Follow the pattern from existing schemas:

```typescript
// Reference files:
// - src/features/audits/config/mysteryShopperSchema.ts (richest example)
// - src/features/audits/config/onboardingSchema.ts

import { LucideIcon } from 'lucide-react';

// Field type union - include only types actually used
export type {Name}FieldType = 'text' | 'textarea' | 'select' | 'number' | 'checkbox' | 'score' | 'rating' | 'image_upload';

export interface {Name}Field {
  key: string;
  label: string;
  type: {Name}FieldType;
  options?: string[];
  required: boolean;
  placeholder?: string;
  suffix?: string;
}

export interface {Name}Section {
  id: string;
  title: string;
  icon: LucideIcon;
  fields: {Name}Field[];
}

export const {SLUG}_SECTIONS: {Name}Section[] = [
  // Define sections with fields
];

// Required utility exports:
export function get{Name}RequiredFields(): string[] { ... }
export function calculate{Name}Completion(fieldData: Record<string, unknown>): number { ... }
export function get{Name}SectionCompletion(section: {Name}Section, fieldData: Record<string, unknown>): { completed: number; total: number } { ... }
export function validate{Name}Form(fieldData: Record<string, unknown>): { valid: boolean; missingFields: string[] } { ... }
```

**Key patterns:**
- Use factory functions for repetitive fields (e.g., `createCompetitorFields(n)`)
- Every section has an `id`, `title`, `icon` (LucideIcon), and `fields` array
- Field keys should be namespaced by section (e.g., `contact_name`, `profile_glovo_rating`)
- Completion calculates % of required fields filled in

### 2. Register in `src/features/audits/config/auditTypes.ts`

Add an entry to `AUDIT_TYPE_CARDS`:

```typescript
{
  slug: '{slug}',
  isActive: true,  // or false if WIP
  icon: '{Icon}',
  color: '{color}',
}
```

Add to `AUDIT_TYPE_CODES`:

```typescript
{slug}: '{CODE}'
```

### 3. Supabase: Insert audit type record

The audit type needs a record in the `audit_types` table with `field_schema` JSONB containing the sections/fields. Create a migration:

```sql
-- supabase/migrations/YYYYMMDD_add_{slug}_audit_type.sql
INSERT INTO audit_types (slug, name, description, field_schema, is_active)
VALUES (
  '{slug}',
  '{Name}',
  '{Description}',
  '{"sections": [...]}'::jsonb,
  true
);
```

The `field_schema.sections` must match the generic `AuditSection[]` type used by `AuditForm.tsx`.

### 4. (Optional) Standalone form component

If the audit needs custom rendering beyond what `AuditForm.tsx` provides (like the standalone `OnboardingForm.tsx` or `MysteryShopperForm.tsx`):

Create `src/features/audits/components/{Name}Form.tsx` following the pattern:
- Collapsible sections with completion badges
- Auto-save with debounce
- Progress bar at top
- Uses the schema's section/field definitions

### 5. Export from index

Update `src/features/audits/config/index.ts` to export the new schema.

## Supported Field Types

These are rendered by `src/features/audits/components/fields/FieldRenderer.tsx`:

| Type | Description |
|------|-------------|
| `text` | Single-line text input |
| `textarea` | Multi-line text |
| `number` | Numeric input with optional suffix |
| `select` | Dropdown from options array |
| `multiselect` | Multi-select checkboxes |
| `checkbox` | Boolean toggle |
| `score` | Numeric score (1-10 typically) |
| `datetime` | Date + time picker |
| `time` | Time-only picker |
| `file` | File upload |
| `company_select` | Company picker (CRP Portal) |
| `user_select` | User picker (profiles) |

## Validation

After creating all files:
1. Run `npm run build` to check for TypeScript errors
2. Verify the new type appears in the audit creation flow
3. Test completion calculation logic
