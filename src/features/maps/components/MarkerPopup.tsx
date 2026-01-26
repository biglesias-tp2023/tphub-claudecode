import { Store, TrendingUp, TrendingDown, Clock, Star } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { MapRestaurant } from '../types/maps.types';

// ============================================
// PROPS
// ============================================

interface MarkerPopupProps {
  restaurant: MapRestaurant;
}

// ============================================
// HELPERS
// ============================================

/**
 * Format currency in euros
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format number with locale
 */
function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-ES').format(value);
}

// ============================================
// MARKER POPUP COMPONENT
// ============================================

/**
 * Popup content showing restaurant details and KPIs
 */
export function MarkerPopup({ restaurant }: MarkerPopupProps) {
  const { kpis } = restaurant;
  const isPositiveChange = kpis.ventasChange >= 0;

  return (
    <div className="min-w-[280px] max-w-[320px]">
      {/* Header */}
      <div className="flex items-start gap-2 pb-3 border-b border-gray-100">
        <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
          <Store className="w-4 h-4 text-primary-600" />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 text-sm truncate">
            {restaurant.name}
          </h3>
          <p className="text-xs text-gray-500 truncate">
            {restaurant.brandName} &bull; {restaurant.areaName}
          </p>
        </div>
      </div>

      {/* Main KPIs Grid */}
      <div className="grid grid-cols-2 gap-3 py-3 border-b border-gray-100">
        {/* Ventas */}
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Ventas</p>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-gray-900">
              {formatCurrency(kpis.ventas)}
            </span>
            <span
              className={cn(
                'flex items-center text-xs',
                isPositiveChange ? 'text-green-600' : 'text-red-600'
              )}
            >
              {isPositiveChange ? (
                <TrendingUp className="w-3 h-3 mr-0.5" />
              ) : (
                <TrendingDown className="w-3 h-3 mr-0.5" />
              )}
              {isPositiveChange ? '+' : ''}
              {kpis.ventasChange.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Pedidos */}
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Pedidos</p>
          <div className="flex items-baseline gap-1.5">
            <span className="font-semibold text-gray-900">
              {formatNumber(kpis.pedidos)}
            </span>
            <span className="text-xs text-gray-500">
              Ticket {formatCurrency(kpis.ticketMedio)}
            </span>
          </div>
        </div>

        {/* Rating */}
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Rating</p>
          <div className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
            <span className="font-semibold text-gray-900">
              {kpis.valoraciones.toFixed(1)}
            </span>
          </div>
        </div>

        {/* Tiempo */}
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Tiempo</p>
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-semibold text-gray-900">
              {kpis.tiempoEspera}
            </span>
          </div>
        </div>
      </div>

      {/* Channel Breakdown */}
      {kpis.channelBreakdown.length > 0 && (
        <div className="pt-3">
          <p className="text-xs text-gray-500 mb-2">Por Canal</p>
          <div className="space-y-1.5">
            {kpis.channelBreakdown.map((channel) => (
              <div
                key={channel.channelId}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: channel.color }}
                  />
                  <span className="text-gray-700">{channel.channelName}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-900">
                  <span className="font-medium">
                    {formatCurrency(channel.ventas)}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({channel.percentage}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Customers */}
      <div className="pt-3 mt-3 border-t border-gray-100">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Nuevos clientes</span>
          <span className="text-gray-900 font-medium">
            {kpis.nuevosClientes} ({kpis.porcentajeNuevos}%)
          </span>
        </div>
      </div>
    </div>
  );
}
