import { Settings, Circle, MapPin, Navigation, Thermometer } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { cn } from '@/utils/cn';
import { MapLegend } from './MapLegend';
import { METRIC_CONFIGS } from '../utils/markerColors';
import type { MapMetric } from '../types/maps.types';

// ============================================
// PROPS
// ============================================

interface MapControlPanelProps {
  restaurantCount: number;
  deliveryPointCount: number;
  selectedMetric: MapMetric;
  onMetricChange: (metric: MapMetric) => void;
  showHeatmap: boolean;
  onToggleHeatmap: () => void;
  showRestaurants: boolean;
  onToggleRestaurants: () => void;
  showDeliveryRadius: boolean;
  onToggleDeliveryRadius: () => void;
  showDeliveryPoints: boolean;
  onToggleDeliveryPoints: () => void;
}

// ============================================
// METRIC BUTTON
// ============================================

interface MetricButtonProps {
  metric: MapMetric;
  isSelected: boolean;
  onClick: () => void;
}

function MetricButton({ metric, isSelected, onClick }: MetricButtonProps) {
  const config = METRIC_CONFIGS[metric];

  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
        isSelected
          ? 'bg-primary-100 text-primary-700'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      )}
    >
      {config.shortLabel}
    </button>
  );
}

// ============================================
// TOGGLE SWITCH
// ============================================

interface ToggleSwitchProps {
  checked: boolean;
  onChange: () => void;
  label: string;
  icon: React.ReactNode;
}

function ToggleSwitch({ checked, onChange, label, icon }: ToggleSwitchProps) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="flex items-center gap-2 text-sm text-gray-700">
        {icon}
        {label}
      </span>
      <button
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={cn(
          'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
          checked ? 'bg-primary-600' : 'bg-gray-300'
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
            checked ? 'translate-x-[18px]' : 'translate-x-[2px]'
          )}
        />
      </button>
    </label>
  );
}

// ============================================
// MAP CONTROL PANEL COMPONENT
// ============================================

/**
 * Control panel for map settings (metric selection, layer toggles, etc.)
 */
export function MapControlPanel({
  restaurantCount,
  deliveryPointCount,
  selectedMetric,
  onMetricChange,
  showHeatmap,
  onToggleHeatmap,
  showRestaurants,
  onToggleRestaurants,
  showDeliveryRadius,
  onToggleDeliveryRadius,
  showDeliveryPoints,
  onToggleDeliveryPoints,
}: MapControlPanelProps) {
  const metrics: MapMetric[] = ['ventas', 'pedidos', 'rating', 'tiempoEspera'];

  return (
    <Card className="w-72 flex-shrink-0">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Settings className="w-4 h-4" />
          Controles del mapa
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Restaurant count */}
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
          <MapPin className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-700">
            <strong>{restaurantCount}</strong> establecimiento{restaurantCount !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Delivery points count */}
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
          <Navigation className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-700">
            <strong>{deliveryPointCount}</strong> pedido{deliveryPointCount !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Metric selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Metrica del heatmap
          </label>
          <div className="flex flex-wrap gap-2">
            {metrics.map((metric) => (
              <MetricButton
                key={metric}
                metric={metric}
                isSelected={selectedMetric === metric}
                onClick={() => onMetricChange(metric)}
              />
            ))}
          </div>
        </div>

        {/* Layers section */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Capas
          </label>

          {/* Heatmap toggle (primary) */}
          <ToggleSwitch
            checked={showHeatmap}
            onChange={onToggleHeatmap}
            label="Mapa de calor"
            icon={<Thermometer className="w-4 h-4 text-orange-500" />}
          />

          {/* Restaurant markers toggle */}
          <ToggleSwitch
            checked={showRestaurants}
            onChange={onToggleRestaurants}
            label="Restaurantes"
            icon={<MapPin className="w-4 h-4 text-red-500" />}
          />

          {/* Delivery radius toggle */}
          <ToggleSwitch
            checked={showDeliveryRadius}
            onChange={onToggleDeliveryRadius}
            label="Radio de entrega"
            icon={<Circle className="w-4 h-4 text-blue-500" />}
          />

          {/* Delivery points toggle */}
          <ToggleSwitch
            checked={showDeliveryPoints}
            onChange={onToggleDeliveryPoints}
            label="Puntos de entrega"
            icon={<Navigation className="w-4 h-4 text-green-500" />}
          />
        </div>

        {/* Legend */}
        <MapLegend metric={selectedMetric} />
      </CardContent>
    </Card>
  );
}
