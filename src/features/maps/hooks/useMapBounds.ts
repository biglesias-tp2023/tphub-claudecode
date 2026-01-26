import { useMemo } from 'react';
import type { MapRestaurant, MapBounds, Coordinates } from '../types/maps.types';
import { calculateBounds, calculateCenter, DEFAULT_CENTER, DEFAULT_ZOOM } from '../utils/coordinates';

// ============================================
// ZOOM LEVEL CALCULATION
// ============================================

/**
 * Calculate appropriate zoom level based on bounds spread
 */
function calculateZoom(bounds: [[number, number], [number, number]] | null): number {
  if (!bounds) return DEFAULT_ZOOM;

  const latSpread = Math.abs(bounds[1][0] - bounds[0][0]);
  const lngSpread = Math.abs(bounds[1][1] - bounds[0][1]);
  const maxSpread = Math.max(latSpread, lngSpread);

  // Approximate zoom levels for different spreads
  if (maxSpread > 5) return 6;      // Country level
  if (maxSpread > 2) return 7;      // Region level
  if (maxSpread > 1) return 8;      // Multiple cities
  if (maxSpread > 0.5) return 9;    // City level
  if (maxSpread > 0.2) return 10;   // District level
  if (maxSpread > 0.1) return 11;   // Neighborhood level
  if (maxSpread > 0.05) return 12;  // Street level
  if (maxSpread > 0.02) return 13;  // Block level
  return 14;                         // Building level
}

// ============================================
// HOOK
// ============================================

/**
 * Hook to calculate map bounds and center from restaurants
 */
export function useMapBounds(restaurants: MapRestaurant[]): MapBounds {
  return useMemo(() => {
    if (restaurants.length === 0) {
      return {
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        bounds: null,
      };
    }

    const bounds = calculateBounds(restaurants);
    const center = calculateCenter(restaurants);
    const zoom = calculateZoom(bounds);

    return {
      center,
      zoom,
      bounds,
    };
  }, [restaurants]);
}

/**
 * Get center coordinates for a single restaurant
 */
export function getRestaurantCenter(restaurant: MapRestaurant): Coordinates {
  return restaurant.coordinates;
}
