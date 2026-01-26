import { getLegendItems, METRIC_CONFIGS } from '../utils/markerColors';
import type { MapMetric } from '../types/maps.types';

// ============================================
// PROPS
// ============================================

interface MapLegendProps {
  metric: MapMetric;
}

// ============================================
// MAP LEGEND COMPONENT
// ============================================

/**
 * Legend showing color scale for the selected metric
 */
export function MapLegend({ metric }: MapLegendProps) {
  const config = METRIC_CONFIGS[metric];
  const items = getLegendItems(metric);

  return (
    <div className="pt-3 border-t border-gray-100">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Leyenda: {config.label}
      </label>
      <div className="space-y-1.5">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs text-gray-600">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
