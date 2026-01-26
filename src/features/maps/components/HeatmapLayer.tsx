import { useEffect, useMemo } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';

import { getHeatmapIntensity } from '../utils/markerColors';
import type { DeliveryPoint, MapMetric } from '../types/maps.types';

// ============================================
// PROPS
// ============================================

interface HeatmapLayerProps {
  deliveryPoints: DeliveryPoint[];
  selectedMetric: MapMetric;
}

// ============================================
// HEATMAP CONFIG
// ============================================

/**
 * Gradient colors for the heatmap
 * From low intensity (blue) to high intensity (red)
 */
const HEATMAP_GRADIENT = {
  0.0: '#3b82f6',  // blue-500
  0.25: '#22c55e', // green-500
  0.5: '#eab308',  // yellow-500
  0.75: '#f97316', // orange-500
  1.0: '#ef4444',  // red-500
};

/**
 * Heatmap layer options
 */
const HEATMAP_OPTIONS: L.HeatLayerOptions = {
  radius: 25,
  blur: 15,
  maxZoom: 17,
  max: 1.0,
  minOpacity: 0.4,
  gradient: HEATMAP_GRADIENT,
};

// ============================================
// HEATMAP LAYER COMPONENT
// ============================================

/**
 * Heatmap layer showing delivery point density colored by selected metric
 */
export function HeatmapLayer({ deliveryPoints, selectedMetric }: HeatmapLayerProps) {
  const map = useMap();

  // Convert delivery points to heatmap data
  const heatData = useMemo(() => {
    return deliveryPoints.map((point): L.HeatLatLngTuple => {
      const intensity = getHeatmapIntensity(point, selectedMetric);
      return [point.coordinates.lat, point.coordinates.lng, intensity];
    });
  }, [deliveryPoints, selectedMetric]);

  // Create and manage the heatmap layer
  useEffect(() => {
    if (heatData.length === 0) return;

    const heatLayer = L.heatLayer(heatData, HEATMAP_OPTIONS);
    heatLayer.addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, heatData]);

  return null;
}
