import { Search, Filter } from 'lucide-react';
import { AUDIT_STATUS_CONFIG } from '@/features/audits/config';
import type { AuditStatus, Profile } from '@/types';

export interface AuditFilters {
  search: string;
  type: string | null;
  status: AuditStatus | null;
  consultantId: string | null;
}

export interface AuditFilterBarProps {
  filters: AuditFilters;
  onFiltersChange: (filters: AuditFilters) => void;
  auditTypes: Array<{ id: string; name: string; slug: string }>;
  consultants: Profile[];
}

export function AuditFilterBar({ filters, onFiltersChange, auditTypes, consultants }: AuditFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar..."
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
        />
      </div>

      {/* Type filter */}
      <div className="relative">
        <select
          value={filters.type || ''}
          onChange={(e) => onFiltersChange({ ...filters, type: e.target.value || null })}
          className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
        >
          <option value="">Tipo: Todos</option>
          {auditTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
        <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>

      {/* Status filter */}
      <div className="relative">
        <select
          value={filters.status || ''}
          onChange={(e) =>
            onFiltersChange({ ...filters, status: (e.target.value as AuditStatus) || null })
          }
          className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
        >
          <option value="">Estado: Todos</option>
          {Object.entries(AUDIT_STATUS_CONFIG).map(([status, config]) => (
            <option key={status} value={status}>
              {config.label}
            </option>
          ))}
        </select>
        <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>

      {/* Consultant filter */}
      <div className="relative">
        <select
          value={filters.consultantId || ''}
          onChange={(e) =>
            onFiltersChange({ ...filters, consultantId: e.target.value || null })
          }
          className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
        >
          <option value="">Consultor: Todos</option>
          {consultants.map((consultant) => (
            <option key={consultant.id} value={consultant.id}>
              {consultant.fullName || consultant.email}
            </option>
          ))}
        </select>
        <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
    </div>
  );
}
