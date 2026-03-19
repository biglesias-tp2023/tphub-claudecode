/**
 * Quick Create Popover
 *
 * Compact popover that appears after drag-to-create in the month view.
 * Allows quick campaign creation with minimal fields.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { X, ChevronRight } from 'lucide-react';
import { cn } from '@/utils/cn';
import { PLATFORMS } from '../config/platforms';
import { Button } from '@/components/ui/Button';
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

const PLATFORM_ORDER: CampaignPlatform[] = ['glovo', 'ubereats', 'justeat', 'google_ads'];

const QUICK_TYPES = [
  { id: 'menu_discount', label: 'Descuento %', platform: 'glovo' },
  { id: 'free_delivery', label: 'Envío gratis', platform: 'glovo' },
  { id: 'bogo', label: '2x1', platform: 'glovo' },
  { id: 'percent_discount', label: 'Descuento %', platform: 'ubereats' },
  { id: 'percent_discount', label: 'Descuento %', platform: 'justeat' },
  { id: 'search', label: 'Búsqueda', platform: 'google_ads' },
] as const;

export function QuickCreatePopover({
  startDate,
  endDate,
  anchor,
  onClose,
  onMoreOptions,
  onCreated,
  restaurantId = 'all',
}: QuickCreatePopoverProps) {
  const [name, setName] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<CampaignPlatform>('glovo');
  const [selectedType, setSelectedType] = useState('menu_discount');
  const [isCreating, setIsCreating] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const createCampaign = useCreateCampaign();

  // Autofocus name input
  useEffect(() => {
    const timer = setTimeout(() => nameRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, []);

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

  // Get types for selected platform
  const typesForPlatform = QUICK_TYPES.filter(t => t.platform === selectedPlatform);

  // When platform changes, pick first type
  const handlePlatformChange = useCallback((p: CampaignPlatform) => {
    setSelectedPlatform(p);
    const firstType = QUICK_TYPES.find(t => t.platform === p);
    if (firstType) setSelectedType(firstType.id);
  }, []);

  const handleCreate = useCallback(async () => {
    setIsCreating(true);
    try {
      await createCampaign.mutateAsync({
        restaurantId,
        platform: selectedPlatform,
        campaignType: selectedType,
        name: name.trim() || undefined,
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
  }, [createCampaign, restaurantId, selectedPlatform, selectedType, name, startDate, endDate, onCreated, onClose]);

  // Position calculation
  const popoverWidth = 320;
  const popoverHeight = 280;
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

  // Format dates for display
  const formatDate = (d: string) => {
    const date = new Date(d + 'T00:00:00');
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" />

      <div
        ref={popoverRef}
        className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        style={{ left: x, top: y, width: popoverWidth }}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Nueva campaña</h3>
            <p className="text-xs text-gray-500">
              {formatDate(startDate)} — {formatDate(endDate)}
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* Name input */}
          <input
            ref={nameRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre de la campaña (opcional)"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isCreating) handleCreate();
            }}
          />

          {/* Platform selector */}
          <div className="flex gap-1">
            {PLATFORM_ORDER.map(p => {
              const config = PLATFORMS[p];
              return (
                <button
                  key={p}
                  onClick={() => handlePlatformChange(p)}
                  className={cn(
                    'flex-1 py-1.5 rounded-md text-xs font-medium transition-all',
                    selectedPlatform === p
                      ? 'text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                  )}
                  style={selectedPlatform === p ? { backgroundColor: config.color } : undefined}
                >
                  {config.name.split(' ')[0]}
                </button>
              );
            })}
          </div>

          {/* Campaign type */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {typesForPlatform.map(t => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              onClick={handleCreate}
              disabled={isCreating}
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
              Más opciones
              <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
