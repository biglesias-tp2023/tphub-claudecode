/**
 * Quick Create Popover
 *
 * Compact popover for rapid campaign creation from the month view.
 * Shows all promo/ads types grouped by category with auto-naming.
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { X, ChevronRight } from 'lucide-react';
import { cn } from '@/utils/cn';
import { PLATFORMS, getCampaignTypesForPlatform, type CampaignTypeConfig } from '../config/platforms';
import { Button } from '@/components/ui/Button';
import { PlatformLogo } from './CampaignEditor';
import { useCreateCampaign } from '../hooks/useCampaigns';
import type { CampaignPlatform } from '@/types';

interface QuickCreatePopoverProps {
  startDate: string;
  endDate: string;
  anchor: { x: number; y: number };
  onClose: () => void;
  onMoreOptions: (startDate: string, endDate: string) => void;
  onCreated?: () => void;
  restaurantId?: string;
}

interface QuickTypeEntry {
  platform: CampaignPlatform;
  type: CampaignTypeConfig;
  category: 'promo' | 'ads';
}

function buildQuickTypes(): QuickTypeEntry[] {
  const entries: QuickTypeEntry[] = [];
  const platforms: CampaignPlatform[] = ['glovo', 'ubereats', 'justeat', 'cheerfy'];

  for (const p of platforms) {
    const types = getCampaignTypesForPlatform(p);
    for (const t of types) {
      entries.push({
        platform: p,
        type: t,
        category: t.isPromotion ? 'promo' : 'ads',
      });
    }
  }

  // Add Google Ads
  const gTypes = getCampaignTypesForPlatform('google_ads');
  for (const t of gTypes) {
    entries.push({ platform: 'google_ads', type: t, category: 'ads' });
  }

  return entries;
}

export function QuickCreatePopover({
  startDate,
  endDate,
  anchor,
  onClose,
  onMoreOptions,
  onCreated,
  restaurantId = 'all',
}: QuickCreatePopoverProps) {
  const allTypes = useMemo(buildQuickTypes, []);
  const promoTypes = useMemo(() => allTypes.filter(e => e.category === 'promo'), [allTypes]);
  const adsTypes = useMemo(() => allTypes.filter(e => e.category === 'ads'), [allTypes]);

  const [tab, setTab] = useState<'promo' | 'ads'>('promo');
  const [selected, setSelected] = useState<QuickTypeEntry | null>(promoTypes[0] || null);
  const [isCreating, setIsCreating] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const createCampaign = useCreateCampaign();

  const currentList = tab === 'promo' ? promoTypes : adsTypes;

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Auto-generate name: "Tipo — Plataforma"
  const autoName = selected
    ? `${selected.type.label} — ${PLATFORMS[selected.platform].name}`
    : '';

  const handleCreate = useCallback(async () => {
    if (!selected) return;
    setIsCreating(true);
    try {
      await createCampaign.mutateAsync({
        restaurantId,
        platform: selected.platform,
        campaignType: selected.type.id,
        name: autoName,
        config: {},
        productIds: [],
        startDate,
        endDate,
      });
      onCreated?.();
      onClose();
    } catch {
      // Error handled by React Query
    } finally {
      setIsCreating(false);
    }
  }, [createCampaign, restaurantId, selected, autoName, startDate, endDate, onCreated, onClose]);

  // Position calculation
  const popoverWidth = 380;
  const popoverHeight = 420;
  const padding = 16;

  let x = anchor.x - popoverWidth / 2;
  let y = anchor.y + 8;

  if (x < padding) x = padding;
  if (x + popoverWidth > window.innerWidth - padding) {
    x = window.innerWidth - popoverWidth - padding;
  }
  if (y + popoverHeight > window.innerHeight - padding) {
    y = anchor.y - popoverHeight - 8;
  }

  const formatDate = (d: string) => {
    const date = new Date(d + 'T00:00:00');
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  return (
    <>
      <div className="fixed inset-0 z-40" />

      <div
        ref={popoverRef}
        className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        style={{ left: x, top: y, width: popoverWidth }}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Nueva campana</h3>
            <p className="text-xs text-gray-500">
              {formatDate(startDate)} — {formatDate(endDate)}
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="p-3 space-y-2">
          {/* Tabs: Promos / Ads */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => { setTab('promo'); setSelected(promoTypes[0] || null); }}
              className={cn(
                'flex-1 py-1.5 rounded-md text-xs font-medium transition-all',
                tab === 'promo' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500',
              )}
            >
              Promociones
            </button>
            <button
              onClick={() => { setTab('ads'); setSelected(adsTypes[0] || null); }}
              className={cn(
                'flex-1 py-1.5 rounded-md text-xs font-medium transition-all',
                tab === 'ads' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500',
              )}
            >
              Publicidad
            </button>
          </div>

          {/* Type list */}
          <div className="max-h-56 overflow-y-auto space-y-0.5 -mx-1 px-1">
            {currentList.map((entry, idx) => {
              const isSelected = selected === entry;
              const platformConfig = PLATFORMS[entry.platform];
              return (
                <button
                  key={`${entry.platform}-${entry.type.id}-${idx}`}
                  onClick={() => setSelected(entry)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all',
                    isSelected
                      ? 'bg-primary-50 ring-1 ring-primary-300'
                      : 'hover:bg-gray-50',
                  )}
                >
                  <PlatformLogo platform={entry.platform} className="w-5 h-5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm truncate', isSelected ? 'font-medium text-primary-900' : 'text-gray-800')}>
                      {entry.type.label}
                    </p>
                  </div>
                  <span className="text-[10px] text-gray-400 shrink-0">
                    {platformConfig.name.split(' ')[0]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Auto name preview */}
          {selected && (
            <div className="px-2 py-1.5 bg-gray-50 rounded-lg">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Nombre auto</p>
              <p className="text-xs font-medium text-gray-700 truncate">{autoName}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              onClick={handleCreate}
              disabled={isCreating || !selected}
              className="flex-1"
              size="sm"
            >
              {isCreating ? 'Creando...' : 'Crear'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onMoreOptions(startDate, endDate);
                onClose();
              }}
              className="flex items-center gap-1"
            >
              Wizard
              <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
