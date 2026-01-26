import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import type { Map as LeafletMap } from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { RestaurantMarker } from './RestaurantMarker';
import { DeliveryRadiusCircle } from './DeliveryRadiusCircle';
import { DeliveryPointMarker } from './DeliveryPointMarker';
import { HeatmapLayer } from './HeatmapLayer';
import type { MapRestaurant, MapMetric, MapBounds, DeliveryPoint } from '../types/maps.types';

// ============================================
// PROPS
// ============================================

interface MapViewProps {
  restaurants: MapRestaurant[];
  deliveryPoints: DeliveryPoint[];
  bounds: MapBounds;
  selectedMetric: MapMetric;
  showHeatmap: boolean;
  showRestaurants: boolean;
  showDeliveryRadius: boolean;
  showDeliveryPoints: boolean;
  selectedRestaurantId: string | null;
  onRestaurantSelect: (id: string | null) => void;
}

// ============================================
// MAP BOUNDS CONTROLLER
// ============================================

interface BoundsControllerProps {
  bounds: MapBounds;
  restaurantCount: number;
}

function BoundsController({ bounds, restaurantCount }: BoundsControllerProps) {
  const map = useMap();
  const prevCountRef = useRef(restaurantCount);

  useEffect(() => {
    // Fit bounds when restaurants change (filter applied) or on initial load
    if (bounds.bounds) {
      const countChanged = prevCountRef.current !== restaurantCount;
      if (countChanged || prevCountRef.current === 0) {
        map.fitBounds(bounds.bounds, { padding: [50, 50] });
        prevCountRef.current = restaurantCount;
      }
    }
  }, [map, bounds, restaurantCount]);

  return null;
}

// ============================================
// MAP VIEW COMPONENT
// ============================================

/**
 * Main map component using Leaflet
 */
export function MapView({
  restaurants,
  deliveryPoints,
  bounds,
  selectedMetric,
  showHeatmap,
  showRestaurants,
  showDeliveryRadius,
  showDeliveryPoints,
  selectedRestaurantId,
  onRestaurantSelect,
}: MapViewProps) {
  const mapRef = useRef<LeafletMap | null>(null);

  // Handle click outside markers to deselect
  const handleMapClick = () => {
    if (selectedRestaurantId) {
      onRestaurantSelect(null);
    }
  };

  return (
    <div className="h-full w-full rounded-lg overflow-hidden border border-gray-200">
      <MapContainer
        ref={mapRef}
        center={[bounds.center.lat, bounds.center.lng]}
        zoom={bounds.zoom}
        className="h-full w-full"
        scrollWheelZoom={true}
        zoomControl={true}
      >
        {/* OpenStreetMap tiles */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Bounds controller for auto-fit */}
        <BoundsController bounds={bounds} restaurantCount={restaurants.length} />

        {/* Heatmap layer (primary visualization) */}
        {showHeatmap && deliveryPoints.length > 0 && (
          <HeatmapLayer
            deliveryPoints={deliveryPoints}
            selectedMetric={selectedMetric}
          />
        )}

        {/* Delivery radius circles (using real restaurant radius) */}
        {showDeliveryRadius &&
          restaurants.map((restaurant) => (
            <DeliveryRadiusCircle
              key={`radius-${restaurant.id}`}
              restaurant={restaurant}
            />
          ))}

        {/* Restaurant markers (optional toggle) */}
        {showRestaurants &&
          restaurants.map((restaurant) => (
            <RestaurantMarker
              key={restaurant.id}
              restaurant={restaurant}
              metric={selectedMetric}
              isSelected={selectedRestaurantId === restaurant.id}
              onSelect={() => onRestaurantSelect(restaurant.id)}
            />
          ))}

        {/* Delivery point markers (debug/detail view) */}
        {showDeliveryPoints &&
          deliveryPoints.map((point) => (
            <DeliveryPointMarker key={point.id} point={point} />
          ))}

        {/* Click handler for deselection */}
        <MapClickHandler onClick={handleMapClick} />
      </MapContainer>
    </div>
  );
}

// ============================================
// MAP CLICK HANDLER
// ============================================

interface MapClickHandlerProps {
  onClick: () => void;
}

function MapClickHandler({ onClick }: MapClickHandlerProps) {
  const map = useMap();

  useEffect(() => {
    const handleClick = () => onClick();
    map.on('click', handleClick);

    return () => {
      map.off('click', handleClick);
    };
  }, [map, onClick]);

  return null;
}
