import type { AuditField } from '@/types';
import { CheckboxField } from './CheckboxField';
import { ScoreField } from './ScoreField';
import { TextField } from './TextField';
import { SelectField } from './SelectField';
import { NumberField } from './NumberField';
import { MultiselectField } from './MultiselectField';
import { DateTimeField } from './DateTimeField';
import { TimeField } from './TimeField';
import { CompanySelectField } from './CompanySelectField';
import { UserSelectField } from './UserSelectField';
import { FileUploadField } from './FileUploadField';

interface FileInfo {
  name: string;
  url: string;
  type: string;
  size: number;
}

interface FieldRendererProps {
  field: AuditField;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
  auditId?: string; // For file uploads
}

export function FieldRenderer({ field, value, onChange, disabled, auditId }: FieldRendererProps) {
  // Wrap field in a div with data-field-key for scroll targeting
  const wrapWithId = (children: React.ReactNode) => (
    <div data-field-key={field.key} id={`field-${field.key}`}>
      {children}
    </div>
  );

  switch (field.type) {
    case 'checkbox':
      return wrapWithId(
        <CheckboxField
          field={field}
          value={value as boolean}
          onChange={onChange}
          disabled={disabled}
        />
      );

    case 'score':
      return wrapWithId(
        <ScoreField
          field={field}
          value={value as number | null}
          onChange={onChange}
          disabled={disabled}
        />
      );

    case 'text':
      return wrapWithId(
        <TextField
          field={field}
          value={value as string}
          onChange={onChange}
          disabled={disabled}
        />
      );

    case 'select':
      return wrapWithId(
        <SelectField
          field={field}
          value={value as string}
          onChange={onChange}
          disabled={disabled}
        />
      );

    case 'number':
      return wrapWithId(
        <NumberField
          field={field}
          value={value as number | null}
          onChange={onChange}
          disabled={disabled}
        />
      );

    case 'multiselect':
      return wrapWithId(
        <MultiselectField
          field={field}
          value={(value as string[]) || []}
          onChange={onChange}
          disabled={disabled}
        />
      );

    case 'datetime':
      return wrapWithId(
        <DateTimeField
          field={field}
          value={value as string | null}
          onChange={onChange}
          disabled={disabled}
        />
      );

    case 'time':
      return wrapWithId(
        <TimeField
          field={field}
          value={value as string | null}
          onChange={onChange}
          disabled={disabled}
        />
      );

    case 'company_select':
      return wrapWithId(
        <CompanySelectField
          field={field}
          value={value as string | null}
          onChange={onChange}
          disabled={disabled}
        />
      );

    case 'user_select':
      return wrapWithId(
        <UserSelectField
          field={field}
          value={value as string | null}
          onChange={onChange}
          disabled={disabled}
        />
      );

    case 'file':
      return wrapWithId(
        <FileUploadField
          field={field}
          value={value as FileInfo[] | null}
          onChange={onChange}
          disabled={disabled}
          auditId={auditId}
        />
      );

    default:
      return wrapWithId(
        <div className="p-3 bg-gray-100 rounded-lg text-sm text-gray-500">
          Campo no soportado: {field.type}
        </div>
      );
  }
}
