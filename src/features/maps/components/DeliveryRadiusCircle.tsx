import { Circle } from 'react-leaflet';
import type { MapRestaurant } from '../types/maps.types';

// ============================================
// PROPS
// ============================================

interface DeliveryRadiusCircleProps {
  restaurant: MapRestaurant;
}

// ============================================
// DELIVERY RADIUS CIRCLE COMPONENT
// ============================================

/**
 * Circle showing delivery radius around a restaurant
 * Uses the actual delivery radius from the restaurant data
 */
export function DeliveryRadiusCircle({ restaurant }: DeliveryRadiusCircleProps) {
  // Use the restaurant's actual delivery radius (convert km to meters)
  const radiusMeters = restaurant.deliveryRadiusKm * 1000;

  return (
    <Circle
      center={[restaurant.coordinates.lat, restaurant.coordinates.lng]}
      radius={radiusMeters}
      pathOptions={{
        color: '#3b82f6',      // blue-500
        fillColor: '#3b82f6',
        fillOpacity: 0.1,
        weight: 2,
        dashArray: '5, 5',
      }}
    />
  );
}
