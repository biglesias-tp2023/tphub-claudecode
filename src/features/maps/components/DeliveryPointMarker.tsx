import { CircleMarker, Popup } from 'react-leaflet';
import { Star, Clock, User, ShoppingBag } from 'lucide-react';
import { CHANNELS } from '@/constants/channels';
import type { DeliveryPoint } from '../types/maps.types';

// ============================================
// PROPS
// ============================================

interface DeliveryPointMarkerProps {
  point: DeliveryPoint;
}

// ============================================
// HELPERS
// ============================================

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

// ============================================
// DELIVERY POINT MARKER COMPONENT
// ============================================

/**
 * Small marker representing a delivery point (order location)
 */
export function DeliveryPointMarker({ point }: DeliveryPointMarkerProps) {
  const channel = CHANNELS[point.channel];

  return (
    <CircleMarker
      center={[point.coordinates.lat, point.coordinates.lng]}
      radius={5}
      pathOptions={{
        color: channel.color,
        fillColor: channel.color,
        fillOpacity: 0.8,
        weight: 1,
      }}
    >
      <Popup closeButton={true} autoPan={true}>
        <div className="min-w-[200px]">
          {/* Header */}
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
            <ShoppingBag className="w-4 h-4 text-gray-500" />
            <div>
              <p className="font-semibold text-sm text-gray-900">
                Pedido #{point.id.split('-')[1]}
              </p>
              <p className="text-xs text-gray-500">
                {point.restaurantName}
              </p>
            </div>
          </div>

          {/* Details */}
          <div className="py-2 space-y-1.5">
            {/* Order value */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Importe</span>
              <span className="font-medium text-gray-900">
                {formatCurrency(point.orderValue)}
              </span>
            </div>

            {/* Channel */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Canal</span>
              <span
                className="px-2 py-0.5 rounded text-xs font-medium text-white"
                style={{ backgroundColor: channel.color }}
              >
                {channel.name}
              </span>
            </div>

            {/* Delivery time */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Tiempo
              </span>
              <span className="text-gray-900">{point.deliveryTimeMin}m</span>
            </div>

            {/* Rating */}
            {point.rating && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  Rating
                </span>
                <span className="text-gray-900 flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                  {point.rating.toFixed(1)}
                </span>
              </div>
            )}

            {/* New customer badge */}
            {point.isNewCustomer && (
              <div className="flex items-center gap-1 text-xs text-green-600">
                <User className="w-3 h-3" />
                Nuevo cliente
              </div>
            )}
          </div>

          {/* Footer - timestamp */}
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              {formatDate(point.timestamp)} a las {formatTime(point.timestamp)}
            </p>
          </div>
        </div>
      </Popup>
    </CircleMarker>
  );
}
