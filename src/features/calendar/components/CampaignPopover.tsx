/**
 * Campaign Popover
 *
 * Anchored popover that shows campaign details when clicking on a campaign block.
 * Includes edit/delete/duplicate actions for consultant mode.
 */

import { useEffect, useRef, useCallback } from 'react';
import { X, Calendar, Clock, Target, Package, Users, Pencil, Trash2, Copy } from 'lucide-react';
import { cn } from '@/utils/cn';
import { PLATFORMS, getCampaignTypeConfig } from '../config/platforms';
import { PlatformLogo } from './CampaignEditor';
import type { PromotionalCampaign } from '@/types';

interface CampaignPopoverProps {
  campaign: PromotionalCampaign;
  anchor: { x: number; y: number };
  onClose: () => void;
  onEdit?: (campaign: PromotionalCampaign) => void;
  onDelete?: (campaign: PromotionalCampaign) => void;
  onDuplicate?: (campaign: PromotionalCampaign) => void;
  isClientMode?: boolean;
}

export function CampaignPopover({
  campaign,
  anchor,
  onClose,
  onEdit,
  onDelete,
  onDuplicate,
  isClientMode = false,
}: CampaignPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on escape key
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
    // Delay to prevent immediate close
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Position popover to stay within viewport
  const getPosition = useCallback(() => {
    const popoverWidth = 320;
    const popoverHeight = 300;
    const padding = 16;

    let x = anchor.x - popoverWidth / 2;
    let y = anchor.y;

    // Adjust horizontal position
    if (x < padding) x = padding;
    if (x + popoverWidth > window.innerWidth - padding) {
      x = window.innerWidth - popoverWidth - padding;
    }

    // Adjust vertical position (flip above if needed)
    if (y + popoverHeight > window.innerHeight - padding) {
      y = anchor.y - popoverHeight - 16;
    }

    return { left: x, top: y };
  }, [anchor]);

  const position = getPosition();
  const platformConfig = PLATFORMS[campaign.platform];
  const typeConfig = getCampaignTypeConfig(campaign.platform, campaign.campaignType);

  // Calculate duration
  const startDate = new Date(campaign.startDate);
  const endDate = new Date(campaign.endDate);
  const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Calculate progress for active campaigns
  const getProgressText = () => {
    if (campaign.status !== 'active') return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(campaign.startDate);
    const end = new Date(campaign.endDate);

    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const elapsedDays = Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const remainingDays = totalDays - elapsedDays;

    if (remainingDays <= 0) return 'Finaliza hoy';
    if (remainingDays === 1) return 'Queda 1 día';
    return `Quedan ${remainingDays} días`;
  };

  const progressText = getProgressText();

  const handleEdit = () => {
    onEdit?.(campaign);
    onClose();
  };

  const handleDelete = () => {
    if (confirm('¿Estás seguro de que quieres eliminar esta campaña?')) {
      onDelete?.(campaign);
      onClose();
    }
  };

  const handleDuplicate = () => {
    onDuplicate?.(campaign);
    onClose();
  };

  return (
    <>
      {/* Backdrop (transparent) */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Popover */}
      <div
        ref={popoverRef}
        className="fixed z-50 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        style={position}
      >
        {/* Header with platform color */}
        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{ backgroundColor: platformConfig.color }}
        >
          <div className="flex items-center gap-3 text-white min-w-0">
            <PlatformLogo platform={campaign.platform} className="w-8 h-8 shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold truncate">
                {campaign.name || typeConfig?.label || campaign.campaignType}
              </p>
              <p className="text-xs opacity-80">{platformConfig.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors shrink-0"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Status + Progress */}
          <div className="flex items-center justify-between">
            <span
              className={cn(
                'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium',
                campaign.status === 'active' && 'bg-green-100 text-green-800',
                campaign.status === 'scheduled' && 'bg-blue-100 text-blue-800',
                campaign.status === 'completed' && 'bg-gray-100 text-gray-600',
                campaign.status === 'cancelled' && 'bg-red-100 text-red-800'
              )}
            >
              {campaign.status === 'active' && 'En curso'}
              {campaign.status === 'scheduled' && 'Programada'}
              {campaign.status === 'completed' && 'Finalizada'}
              {campaign.status === 'cancelled' && 'Cancelada'}
            </span>
            {progressText && (
              <span className="text-xs text-gray-500">{progressText}</span>
            )}
          </div>

          {/* Duration */}
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-gray-600">
              {diffDays} día{diffDays !== 1 ? 's' : ''}
            </span>
            <span className="text-gray-400 text-xs">
              ({campaign.startDate} - {campaign.endDate})
            </span>
          </div>

          {/* Time slot (if exists) */}
          {campaign.config.startTime && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="text-gray-600">
                {campaign.config.startTime}
                {campaign.config.duration && ` (${campaign.config.duration} min)`}
              </span>
            </div>
          )}

          {/* Configuration (discount, budget, etc.) */}
          {(campaign.config.discountPercent || campaign.config.discountAmount || campaign.config.dailyBudget) && (
            <div className="flex items-center gap-2 text-sm">
              <Target className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="text-gray-900 font-medium">
                {campaign.config.discountPercent && `${campaign.config.discountPercent}% descuento`}
                {campaign.config.discountAmount && `${campaign.config.discountAmount}€ descuento`}
                {campaign.config.dailyBudget && `${campaign.config.dailyBudget}€/día`}
              </span>
            </div>
          )}

          {/* Products/Scope */}
          <div className="flex items-center gap-2 text-sm">
            <Package className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-gray-600">
              {campaign.productIds.length > 0
                ? `${campaign.productIds.length} producto${campaign.productIds.length !== 1 ? 's' : ''}`
                : 'Toda la carta'}
            </span>
          </div>

          {/* Target audience (if available) */}
          {campaign.config.targetAudience && (
            <div className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="text-gray-600">{campaign.config.targetAudience}</span>
            </div>
          )}
        </div>

        {/* Actions footer */}
        {!isClientMode && (onEdit || onDelete || onDuplicate) && (
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center gap-2">
            {onEdit && (
              <button
                onClick={handleEdit}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Pencil className="w-4 h-4" />
                Editar
              </button>
            )}
            {onDuplicate && (
              <button
                onClick={handleDuplicate}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                title="Duplicar campaña"
              >
                <Copy className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={handleDelete}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 bg-white border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-200 transition-colors"
                title="Eliminar campaña"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Client mode: View detail only */}
        {isClientMode && (
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-500 text-center">
              Modo solo lectura
            </p>
          </div>
        )}
      </div>
    </>
  );
}
