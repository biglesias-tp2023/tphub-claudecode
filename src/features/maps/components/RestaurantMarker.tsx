import { useMemo } from 'react';
import { CircleMarker, Popup } from 'react-leaflet';
import { getMarkerColor } from '../utils/markerColors';
import { MarkerPopup } from './MarkerPopup';
import type { MapRestaurant, MapMetric } from '../types/maps.types';

// ============================================
// PROPS
// ============================================

interface RestaurantMarkerProps {
  restaurant: MapRestaurant;
  metric: MapMetric;
  isSelected: boolean;
  onSelect: () => void;
}

// ============================================
// RESTAURANT MARKER COMPONENT
// ============================================

/**
 * Simple pin marker for a restaurant location
 * Shows KPI-colored circle with popup on click
 */
export function RestaurantMarker({
  restaurant,
  metric,
  isSelected,
  onSelect,
}: RestaurantMarkerProps) {
  // Calculate marker color based on metric
  const color = useMemo(
    () => getMarkerColor(restaurant.kpis, metric),
    [restaurant.kpis, metric]
  );

  return (
    <CircleMarker
      center={[restaurant.coordinates.lat, restaurant.coordinates.lng]}
      radius={isSelected ? 10 : 8}
      pathOptions={{
        color: isSelected ? '#1d4ed8' : 'white',
        fillColor: color,
        fillOpacity: 1,
        weight: isSelected ? 3 : 2,
      }}
      eventHandlers={{
        click: (e) => {
          e.originalEvent.stopPropagation();
          onSelect();
        },
      }}
    >
      <Popup closeButton={true} autoPan={true} className="restaurant-popup">
        <MarkerPopup restaurant={restaurant} />
      </Popup>
    </CircleMarker>
  );
}
