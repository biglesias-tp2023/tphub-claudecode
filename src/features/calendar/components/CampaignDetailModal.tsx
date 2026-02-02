import { X, Clock, Calendar, Package, Target, Plus, Pencil, Trash2, Flag, Trophy, Tv, ShoppingBag, MapPin, Users, type LucideIcon } from 'lucide-react';
import { cn } from '@/utils/cn';
import { PLATFORMS, getCampaignTypeConfig } from '../config/platforms';
import { PlatformLogo } from './CampaignEditor';
import type { PromotionalCampaign, CalendarEvent, EventCategory } from '@/types';

interface CampaignDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date | null;
  campaigns: PromotionalCampaign[];
  events: CalendarEvent[];
  onAddCampaign: () => void;
  onEditCampaign?: (campaign: PromotionalCampaign) => void;
  onDeleteCampaign?: (campaign: PromotionalCampaign) => void;
}

// Event category config
const EVENT_CATEGORY_CONFIG: Record<EventCategory, { icon: LucideIcon; label: string; color: string; bgColor: string }> = {
  holiday: { icon: Flag, label: 'Festivo', color: 'text-red-600', bgColor: 'bg-red-50' },
  sports: { icon: Trophy, label: 'Deportes', color: 'text-green-600', bgColor: 'bg-green-50' },
  entertainment: { icon: Tv, label: 'Entretenimiento', color: 'text-purple-600', bgColor: 'bg-purple-50' },
  commercial: { icon: ShoppingBag, label: 'Comercial', color: 'text-amber-600', bgColor: 'bg-amber-50' },
};

export function CampaignDetailModal({
  isOpen,
  onClose,
  date,
  campaigns,
  events,
  onAddCampaign,
  onEditCampaign,
  onDeleteCampaign,
}: CampaignDetailModalProps) {
  if (!isOpen || !date) return null;

  const formattedDate = date.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Check if it's today
  const isToday = new Date().toDateString() === date.toDateString();

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Modal - Floating card style like Google Calendar */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md">
        <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="flex items-start justify-between p-4 border-b border-gray-100">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-gray-900 capitalize">
                {formattedDate}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                {isToday && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                    Hoy
                  </span>
                )}
                {campaigns.length > 0 && (
                  <span className="text-sm text-gray-500">
                    {campaigns.length} campaña{campaigns.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>

            {/* Action buttons in header */}
            <div className="flex items-center gap-1">
              <button
                onClick={onAddCampaign}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Añadir campaña"
              >
                <Plus className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="max-h-[60vh] overflow-y-auto">
            {/* Events section */}
            {events.length > 0 && (
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  Eventos del día
                </h3>
                <div className="space-y-2">
                  {events.map((event) => {
                    const config = EVENT_CATEGORY_CONFIG[event.category];
                    const Icon = config.icon;
                    return (
                      <div
                        key={event.id}
                        className={cn('flex items-start gap-3 p-3 rounded-lg', config.bgColor)}
                      >
                        <div className={cn('p-2 rounded-lg bg-white', config.color)}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900">{event.name}</p>
                          <p className="text-sm text-gray-600">{config.label}</p>
                          {event.description && (
                            <p className="text-xs text-gray-500 mt-1">{event.description}</p>
                          )}
                          {event.regionCode && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                              <MapPin className="w-3 h-3" />
                              <span>{event.regionCode}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Campaigns section */}
            {campaigns.length > 0 && (
              <div className="px-4 py-3">
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  Campañas activas
                </h3>
                <div className="space-y-3">
                  {campaigns.map((campaign) => {
                    const platformConfig = PLATFORMS[campaign.platform];
                    const typeConfig = getCampaignTypeConfig(campaign.platform, campaign.campaignType);

                    // Calculate duration
                    const startDate = new Date(campaign.startDate);
                    const endDate = new Date(campaign.endDate);
                    const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

                    return (
                      <div
                        key={campaign.id}
                        className="bg-gray-50 rounded-lg overflow-hidden"
                      >
                        {/* Campaign header with platform color */}
                        <div
                          className="px-3 py-2 flex items-center justify-between"
                          style={{ backgroundColor: platformConfig.color }}
                        >
                          <div className="flex items-center gap-2 text-white">
                            <PlatformLogo platform={campaign.platform} className="w-6 h-6" />
                            <div>
                              <p className="font-medium text-sm">
                                {campaign.name || typeConfig?.label || campaign.campaignType}
                              </p>
                              <p className="text-xs opacity-80">{platformConfig.name}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {onEditCampaign && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditCampaign(campaign);
                                }}
                                className="p-1.5 hover:bg-white/20 rounded transition-colors"
                                title="Editar campaña"
                              >
                                <Pencil className="w-4 h-4 text-white" />
                              </button>
                            )}
                            {onDeleteCampaign && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm('¿Estás seguro de que quieres eliminar esta campaña?')) {
                                    onDeleteCampaign(campaign);
                                  }
                                }}
                                className="p-1.5 hover:bg-white/20 rounded transition-colors"
                                title="Eliminar campaña"
                              >
                                <Trash2 className="w-4 h-4 text-white" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Campaign details */}
                        <div className="p-3 space-y-2">
                          {/* Duration */}
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">
                              {diffDays} día{diffDays !== 1 ? 's' : ''}
                            </span>
                            <span className="text-gray-400">
                              ({campaign.startDate} - {campaign.endDate})
                            </span>
                          </div>

                          {/* Time slot */}
                          {campaign.config.startTime && (
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-600">
                                {campaign.config.startTime}
                                {campaign.config.duration && ` (${campaign.config.duration} min)`}
                              </span>
                            </div>
                          )}

                          {/* Configuration (discount, budget, etc.) */}
                          {(campaign.config.discountPercent || campaign.config.discountAmount || campaign.config.dailyBudget) && (
                            <div className="flex items-center gap-2 text-sm">
                              <Target className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-900 font-medium">
                                {campaign.config.discountPercent && `${campaign.config.discountPercent}% descuento`}
                                {campaign.config.discountAmount && `${campaign.config.discountAmount}€ descuento`}
                                {campaign.config.dailyBudget && `${campaign.config.dailyBudget}€/día`}
                              </span>
                            </div>
                          )}

                          {/* Products */}
                          <div className="flex items-center gap-2 text-sm">
                            <Package className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">
                              {campaign.productIds.length > 0
                                ? `${campaign.productIds.length} producto${campaign.productIds.length !== 1 ? 's' : ''}`
                                : 'Toda la carta'}
                            </span>
                          </div>

                          {/* Target audience (if available) */}
                          {campaign.config.targetAudience && (
                            <div className="flex items-center gap-2 text-sm">
                              <Users className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-600">{campaign.config.targetAudience}</span>
                            </div>
                          )}

                          {/* Status badge */}
                          <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
                            <span
                              className={cn(
                                'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
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
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Empty state */}
            {campaigns.length === 0 && events.length === 0 && (
              <div className="px-4 py-8 text-center">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-4">No hay campañas ni eventos para este día</p>
                <button
                  onClick={onAddCampaign}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Crear campaña
                </button>
              </div>
            )}
          </div>

          {/* Footer with add campaign button (only if there's content) */}
          {(campaigns.length > 0 || events.length > 0) && (
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
              <button
                onClick={onAddCampaign}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
              >
                <Plus className="w-4 h-4" />
                Añadir campaña
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
