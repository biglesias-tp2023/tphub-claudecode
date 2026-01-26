import { useState, useCallback } from 'react';
import type { MapControlState, MapMetric } from '../types/maps.types';

// ============================================
// DEFAULT STATE
// ============================================

const DEFAULT_STATE: MapControlState = {
  showHeatmap: true,              // Primary visualization - ON by default
  showRestaurants: false,         // Optional toggle - OFF by default
  showDeliveryRadius: true,       // Show delivery radius circles
  showDeliveryPoints: false,      // Debug/detail - OFF by default
  selectedMetric: 'ventas',
  selectedRestaurantId: null,
};

// ============================================
// HOOK
// ============================================

/**
 * Hook for local map control state (not persisted)
 */
export function useMapFilters() {
  const [state, setState] = useState<MapControlState>(DEFAULT_STATE);

  // Toggle heatmap visibility
  const toggleHeatmap = useCallback(() => {
    setState((prev) => ({
      ...prev,
      showHeatmap: !prev.showHeatmap,
    }));
  }, []);

  // Toggle restaurant markers visibility
  const toggleRestaurants = useCallback(() => {
    setState((prev) => ({
      ...prev,
      showRestaurants: !prev.showRestaurants,
    }));
  }, []);

  // Toggle delivery radius visibility
  const toggleDeliveryRadius = useCallback(() => {
    setState((prev) => ({
      ...prev,
      showDeliveryRadius: !prev.showDeliveryRadius,
    }));
  }, []);

  // Toggle delivery points visibility
  const toggleDeliveryPoints = useCallback(() => {
    setState((prev) => ({
      ...prev,
      showDeliveryPoints: !prev.showDeliveryPoints,
    }));
  }, []);

  // Set selected metric for heatmap coloring
  const setSelectedMetric = useCallback((metric: MapMetric) => {
    setState((prev) => ({
      ...prev,
      selectedMetric: metric,
    }));
  }, []);

  // Set selected restaurant (for highlighting/popup)
  const setSelectedRestaurantId = useCallback((id: string | null) => {
    setState((prev) => ({
      ...prev,
      selectedRestaurantId: id,
    }));
  }, []);

  // Reset all controls to default
  const resetControls = useCallback(() => {
    setState(DEFAULT_STATE);
  }, []);

  return {
    // State
    ...state,

    // Actions
    toggleHeatmap,
    toggleRestaurants,
    toggleDeliveryRadius,
    toggleDeliveryPoints,
    setSelectedMetric,
    setSelectedRestaurantId,
    resetControls,
  };
}
