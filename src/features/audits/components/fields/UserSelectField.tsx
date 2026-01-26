import { useState, useRef, useEffect } from 'react';
import { User, Search, X, ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import type { AuditField, Profile } from '@/types';

interface UserSelectFieldProps {
  field: AuditField;
  value: string | null; // user/profile ID
  onChange: (value: string) => void;
  disabled?: boolean;
}

// Hook to fetch profiles
function useProfiles() {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');

      if (error) throw error;

      return (data || []).map((p) => ({
        id: p.id,
        email: p.email,
        fullName: p.full_name,
        avatarUrl: p.avatar_url,
        role: p.role,
        assignedCompanyIds: p.assigned_company_ids || [],
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      }));
    },
  });
}

export function UserSelectField({ field, value, onChange, disabled }: UserSelectFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: profiles = [], isLoading } = useProfiles();

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const selectedUser = profiles.find((p) => p.id === value);

  const filteredProfiles = profiles.filter((profile) => {
    const searchLower = search.toLowerCase();
    return (
      profile.fullName?.toLowerCase().includes(searchLower) ||
      profile.email.toLowerCase().includes(searchLower)
    );
  });

  const handleSelect = (userId: string) => {
    onChange(userId);
    setIsOpen(false);
    setSearch('');
  };

  const clear = () => {
    onChange('');
    setSearch('');
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return email[0].toUpperCase();
  };

  return (
    <div className="space-y-1.5" ref={containerRef}>
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">{field.label}</label>
        {field.required && <span className="text-red-500 text-xs">*</span>}
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 text-sm text-left',
            'border border-gray-200 rounded-lg bg-white',
            'focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500',
            disabled && 'opacity-50 cursor-not-allowed bg-gray-50',
            !value && 'text-gray-400'
          )}
        >
          {selectedUser?.avatarUrl ? (
            <img
              src={selectedUser.avatarUrl}
              alt=""
              className="w-5 h-5 rounded-full object-cover"
            />
          ) : (
            <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
          )}
          <span className="flex-1 truncate">
            {selectedUser?.fullName || selectedUser?.email || 'Seleccionar persona'}
          </span>
          {value && !disabled ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); clear(); }}
              className="p-0.5 hover:bg-gray-100 rounded"
            >
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {isOpen && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
            {/* Search */}
            <div className="p-2 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar persona..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
              </div>
            </div>

            {/* Options */}
            <div className="max-h-48 overflow-y-auto">
              {isLoading ? (
                <div className="px-3 py-4 text-sm text-gray-500 text-center">
                  Cargando...
                </div>
              ) : filteredProfiles.length === 0 ? (
                <div className="px-3 py-4 text-sm text-gray-500 text-center">
                  No se encontraron personas
                </div>
              ) : (
                filteredProfiles.map((profile) => (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => handleSelect(profile.id)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50',
                      value === profile.id && 'bg-primary-50 text-primary-600'
                    )}
                  >
                    {profile.avatarUrl ? (
                      <img
                        src={profile.avatarUrl}
                        alt=""
                        className="w-7 h-7 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-xs font-medium text-primary-600">
                        {getInitials(profile.fullName, profile.email)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">
                        {profile.fullName || profile.email}
                      </p>
                      {profile.fullName && (
                        <p className="truncate text-xs text-gray-500">{profile.email}</p>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
